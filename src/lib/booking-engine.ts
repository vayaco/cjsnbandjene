import { db } from "./db";
import { generateBookingNumber, normalizePhone } from "./utils";

export interface CreateBookingParams {
  venueId: string;
  resourceId: string;
  dateStr: string;      // "2026-09-15"
  startTimeStr: string; // "18:00"
  endTimeStr: string;   // "19:00"
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentMethod?: string; // "upi", "card", "cash", "placeholder"
  notes?: string;
  createdBy?: "customer" | "staff" | "manager" | "admin";
}

export interface BookingResult {
  success: boolean;
  booking?: any;
  error?: string;
}

/**
 * Creates a booking atomically with double-booking prevention.
 */
export async function createBooking(params: CreateBookingParams): Promise<BookingResult> {
  const normalizedPhone = normalizePhone(params.customerPhone);
  if (!normalizedPhone || normalizedPhone.length < 10) {
    return { success: false, error: "Please enter a valid phone number." };
  }

  if (!params.customerName.trim()) {
    return { success: false, error: "Customer name is required." };
  }

  const startAt = new Date(`${params.dateStr}T${params.startTimeStr}:00.000Z`);
  const endAt = new Date(`${params.dateStr}T${params.endTimeStr}:00.000Z`);

  if (startAt >= endAt) {
    return { success: false, error: "Invalid slot time range." };
  }

  // Use a database transaction to guarantee atomicity and prevent race conditions
  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Fetch Venue and Resource to verify existence & price
      const resource = await tx.resource.findUnique({
        where: { id: params.resourceId },
        include: { venue: { include: { pricingRules: { where: { status: "active" } } } } },
      });

      if (!resource || resource.venueId !== params.venueId) {
        throw new Error("Court or venue could not be found.");
      }

      if (resource.status !== "active") {
        throw new Error("This court is currently not available for bookings.");
      }

      // 2. Double-booking check: verify no confirmed or pending booking exists for this slot
      const conflictingBooking = await tx.booking.findFirst({
        where: {
          resourceId: params.resourceId,
          dateStr: params.dateStr,
          startTimeStr: params.startTimeStr,
          status: { in: ["confirmed", "payment_pending"] },
        },
      });

      if (conflictingBooking) {
        throw new Error("This slot was just booked by another player. Please select another time.");
      }

      // 3. Resolve price based on pricing rules
      const targetDate = new Date(`${params.dateStr}T00:00:00.000Z`);
      const dayOfWeek = targetDate.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dayType = isWeekend ? "weekend" : "weekday";

      const matchedRule = resource.venue.pricingRules.find((r) => {
        const matchDay = r.dayType === "all" || r.dayType === dayType;
        const matchTime = params.startTimeStr >= r.startTime && params.startTimeStr < r.endTime;
        return matchDay && matchTime;
      });

      const slotPrice = matchedRule ? matchedRule.price : resource.defaultPrice;

      // 4. Find or create Customer by phone number (Tenant-isolated)
      let customer = await tx.customer.findUnique({
        where: {
          businessId_phone: {
            businessId: resource.venue.businessId,
            phone: normalizedPhone,
          },
        },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            businessId: resource.venue.businessId,
            phone: normalizedPhone,
            name: params.customerName.trim(),
            email: params.customerEmail?.trim() || null,
            firstBookingAt: startAt,
            lastBookingAt: startAt,
            totalBookings: 1,
            totalSpend: slotPrice,
          },
        });
      } else {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: params.customerName.trim() || customer.name,
            email: params.customerEmail?.trim() || customer.email,
            lastBookingAt: startAt,
            totalBookings: { increment: 1 },
            totalSpend: { increment: slotPrice },
          },
        });
      }

      // 5. Create Booking
      const bookingNumber = generateBookingNumber(resource.venue.code || "SZ");

      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          businessId: resource.venue.businessId,
          venueId: resource.venueId,
          resourceId: resource.id,
          customerId: customer.id,
          startAt,
          endAt,
          dateStr: params.dateStr,
          startTimeStr: params.startTimeStr,
          endTimeStr: params.endTimeStr,
          status: "confirmed",
          subtotal: slotPrice,
          total: slotPrice,
          paymentStatus: "successful",
          paymentMethod: params.paymentMethod || "placeholder",
          notes: params.notes || null,
          createdBy: params.createdBy || "customer",
        },
        include: {
          venue: true,
          resource: true,
          customer: true,
        },
      });

      // 6. Create Payment Record (Placeholder / Direct Confirmation)
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          businessId: resource.venue.businessId,
          provider: "placeholder",
          amount: slotPrice,
          method: params.paymentMethod || "placeholder",
          status: "successful",
          paidAt: new Date(),
          notes: "Demo checkout payment confirmation",
        },
      });

      // 7. Create Audit Log
      await tx.auditLog.create({
        data: {
          businessId: resource.venue.businessId,
          action: "booking_created",
          entityType: "booking",
          entityId: booking.id,
          details: JSON.stringify({
            bookingNumber: booking.bookingNumber,
            customerPhone: normalizedPhone,
            court: resource.name,
            venue: resource.venue.name,
            date: params.dateStr,
            time: `${params.startTimeStr} - ${params.endTimeStr}`,
            amount: slotPrice,
            createdBy: params.createdBy || "customer",
          }),
        },
      });

      return booking;
    });

    return { success: true, booking: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create booking." };
  }
}

/**
 * Cancel a booking with policy-compliant refund calculation
 */
export async function cancelBooking(bookingId: string, reason?: string, cancelledBy: string = "customer") {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { venue: true, customer: true },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status === "cancelled") {
      throw new Error("This booking has already been cancelled.");
    }

    // Calculate hours before start
    const now = new Date();
    const hoursRemaining = (booking.startAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundPercent = 0;
    if (hoursRemaining > 24) {
      refundPercent = 100;
    } else if (hoursRemaining >= 6) {
      refundPercent = 50;
    } else {
      refundPercent = 0;
    }

    const refundAmount = (booking.total * refundPercent) / 100;

    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "cancelled",
        cancellationReason: reason || "Cancelled by user",
        cancelledAt: now,
      },
    });

    // Update customer cancellation count
    await tx.customer.update({
      where: { id: booking.customerId },
      data: {
        cancellationCount: { increment: 1 },
      },
    });

    // Record audit log
    await tx.auditLog.create({
      data: {
        businessId: booking.businessId,
        action: "booking_cancelled",
        entityType: "booking",
        entityId: booking.id,
        details: JSON.stringify({
          bookingNumber: booking.bookingNumber,
          cancelledBy,
          hoursRemaining: Math.round(hoursRemaining * 10) / 10,
          refundPercent,
          refundAmount,
          reason,
        }),
      },
    });

    return {
      success: true,
      booking: updatedBooking,
      refundPercent,
      refundAmount,
    };
  });
}
