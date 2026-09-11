import { db } from "./db";
import { normalizePhone } from "./utils";
import { allocateBookingNumber, generateUniqueBookingNumber } from "./booking-number";
import { createBookingAccessTokens } from "./access-token";
import { validateBookingDateInWindow } from "./availability";
import { sendBookingConfirmationNotification } from "./notification/notification-service";

export interface CreateBookingParams {
  venueId: string;
  resourceId: string;
  dateStr: string;      // "2026-09-15"
  startTimeStr: string; // "18:00"
  endTimeStr: string;   // "19:00"
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentMethod?: string; // "upi", "card", "cash", "placeholder", "test"
  paymentProvider?: string; // "test", "cashfree", "razorpay", "manual"
  status?: "confirmed" | "payment_pending";
  paymentStatus?: "successful" | "pending";
  holdToken?: string;
  notes?: string;
  createdBy?: "customer" | "staff" | "manager" | "admin";
}

export interface BookingResult {
  success: boolean;
  booking?: any;
  rawBookingToken?: string;
  rawInvoiceToken?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Creates a booking atomically with strict double-booking prevention.
 * Respects temporary slot holds and database unique constraints.
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
  const now = new Date();

  if (startAt >= endAt) {
    return { success: false, error: "Invalid slot time range." };
  }

  // Determine initial statuses
  const bookingStatus = params.status || (params.createdBy === "customer" && params.paymentStatus === "pending" ? "payment_pending" : "confirmed");
  const paymentStatus = params.paymentStatus || (bookingStatus === "payment_pending" ? "pending" : "successful");
  const paymentProvider = params.paymentProvider || (params.paymentMethod === "cash" ? "manual" : "placeholder");

  // Use a database transaction to guarantee atomicity and prevent race conditions
  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Fetch Venue and Resource to verify existence and price
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

      // Enforce 7-day booking window strictly for customer bookings
      const venueTz = resource.venue.timezone || "Asia/Kolkata";
      if (params.createdBy === "customer") {
        const windowValidation = validateBookingDateInWindow(params.dateStr, venueTz);
        if (!windowValidation.valid) {
          throw new Error("This date is no longer available for online booking.");
        }
      }

      // Validate past slot on today
      const todayInVenue = new Intl.DateTimeFormat("en-CA", {
        timeZone: venueTz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);

      const currentTimeInVenue = new Intl.DateTimeFormat("en-GB", {
        timeZone: venueTz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now);

      if (params.dateStr === todayInVenue && params.startTimeStr <= currentTimeInVenue) {
        throw new Error("This slot is in the past and cannot be booked.");
      }

      // Compulsory customer email validation
      if (params.createdBy === "customer") {
        if (!params.customerEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.customerEmail.trim())) {
          throw new Error("Please enter a valid email address so your invoice can be sent.");
        }
      }

      // 2. Double-booking check: verify no active booking exists for this slot
      const conflictingBooking = await tx.booking.findFirst({
        where: {
          resourceId: params.resourceId,
          dateStr: params.dateStr,
          startTimeStr: params.startTimeStr,
          status: { in: ["confirmed", "payment_pending"] },
        },
      });

      if (conflictingBooking) {
        throw new Error("This slot was just booked by someone else. Please choose another time.");
      }

      // 3. Verify slot hold if provided, or verify no other user has an active hold
      if (params.holdToken) {
        const hold = await tx.slotHold.findUnique({
          where: { holdToken: params.holdToken },
        });

        if (!hold || hold.expiresAt.getTime() <= now.getTime()) {
          throw new Error("Your slot reservation hold has expired. Please choose another time.");
        }

        if (hold.resourceId !== params.resourceId || hold.startAt.getTime() !== startAt.getTime()) {
          throw new Error("Slot hold does not match requested court and time.");
        }

        // Clean up this hold
        await tx.slotHold.delete({ where: { id: hold.id } });
      } else {
        // If no hold token passed, ensure no other active hold exists on this slot
        const existingHold = await tx.slotHold.findFirst({
          where: {
            resourceId: params.resourceId,
            startAt,
            expiresAt: { gt: now },
          },
        });

        if (existingHold) {
          throw new Error("This slot is currently being held by another player. Please choose another time.");
        }
      }

      // 4. Resolve price based on pricing rules
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

      // 5. Find or create Customer by phone number (Tenant-isolated)
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
            totalBookings: bookingStatus === "confirmed" ? 1 : 0,
            totalSpend: bookingStatus === "confirmed" ? slotPrice : 0,
          },
        });
      } else {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: params.customerName.trim() || customer.name,
            email: params.customerEmail?.trim() || customer.email,
            lastBookingAt: startAt,
            ...(bookingStatus === "confirmed"
              ? {
                  totalBookings: { increment: 1 },
                  totalSpend: { increment: slotPrice },
                }
              : {}),
          },
        });
      }

      // 6. Allocate permanent booking number from database sequence
      const { bookingCode: bookingNumber } = await allocateBookingNumber(tx);

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
          status: bookingStatus,
          subtotal: slotPrice,
          total: slotPrice,
          paymentStatus: paymentStatus,
          paymentMethod: params.paymentMethod || "placeholder",
          holdToken: params.holdToken || null,
          notes: params.notes || null,
          createdBy: params.createdBy || "customer",
        },
        include: {
          venue: true,
          resource: true,
          customer: true,
        },
      });

      // 7. Create Payment Record
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          businessId: resource.venue.businessId,
          provider: paymentProvider,
          amount: slotPrice,
          method: params.paymentMethod || "placeholder",
          status: paymentStatus,
          paidAt: paymentStatus === "successful" ? new Date() : null,
          notes: `Booking payment (${bookingStatus})`,
        },
      });

      // 8. Create Audit Log
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
            status: bookingStatus,
            createdBy: params.createdBy || "customer",
          }),
        },
      });

      // Generate 7-day secure access tokens
      const tokens = await createBookingAccessTokens(booking.id, booking.createdAt, tx);

      return { booking, tokens };
    });

    if (bookingStatus === "confirmed" && paymentStatus === "successful") {
      sendBookingConfirmationNotification(result.booking.id).catch((err) => {
        console.error("[createBooking] Async notification error:", err);
      });
    }

    return {
      success: true,
      booking: result.booking,
      rawBookingToken: result.tokens.rawBookingToken,
      rawInvoiceToken: result.tokens.rawInvoiceToken,
      expiresAt: result.tokens.expiresAt,
    };
  } catch (err: any) {
    // Catch database unique constraint violations (P2002 or raw constraint)
    if (err.code === "P2002" || err.message?.includes("UNIQUE constraint failed")) {
      return {
        success: false,
        error: "This slot was just booked by someone else. Please choose another time.",
      };
    }
    return { success: false, error: err.message || "Failed to create booking." };
  }
}

/**
 * Cancel a booking with policy-compliant refund calculation
 */
export async function cancelBooking(bookingId: string, reason?: string, cancelledBy: string = "customer") {
  try {
    return await db.$transaction(async (tx) => {
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
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to cancel booking." };
  }
}

export interface ConfirmPaymentParams {
  bookingId: string;
  provider: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  notes?: string;
}

/**
 * Confirms a pending booking upon verified payment receipt.
 * Atomic and idempotent: if already confirmed, returns successfully without double-counting metrics.
 */
export async function confirmBookingPayment(params: ConfirmPaymentParams) {
  const { bookingId, provider, providerPaymentId, providerOrderId, notes } = params;

  const result = await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, venue: true, payments: true },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Idempotency: if already confirmed, do not increment metrics again
    if (booking.status === "confirmed" && booking.paymentStatus === "successful") {
      return { success: true, booking, message: "Booking already confirmed." };
    }

    const now = new Date();

    // 1. Update Booking
    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "confirmed",
        paymentStatus: "successful",
      },
      include: {
        venue: true,
        resource: true,
        customer: true,
        payments: true,
      },
    });

    // 2. Update or Create Payment Record
    const existingPayment = booking.payments.find((p) => p.status === "pending" || p.provider === provider);

    if (existingPayment) {
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: "successful",
          provider,
          providerPaymentId: providerPaymentId || existingPayment.providerPaymentId,
          providerOrderId: providerOrderId || existingPayment.providerOrderId,
          paidAt: now,
          notes: notes || existingPayment.notes,
        },
      });
    } else {
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          businessId: booking.businessId,
          provider,
          providerPaymentId,
          providerOrderId,
          amount: booking.total,
          method: booking.paymentMethod || "upi",
          status: "successful",
          paidAt: now,
          notes: notes || "Payment confirmed via gateway",
        },
      });
    }

    // 3. Increment customer booking count and spend
    await tx.customer.update({
      where: { id: booking.customerId },
      data: {
        totalBookings: { increment: 1 },
        totalSpend: { increment: booking.total },
        lastBookingAt: booking.startAt,
      },
    });

    // 4. Purge any slot holds for this slot
    if (booking.holdToken) {
      await tx.slotHold.deleteMany({
        where: { holdToken: booking.holdToken },
      });
    }

    // 5. Create Audit Log
    await tx.auditLog.create({
      data: {
        businessId: booking.businessId,
        action: "booking_payment_confirmed",
        entityType: "booking",
        entityId: booking.id,
        details: JSON.stringify({
          bookingNumber: booking.bookingNumber,
          provider,
          providerPaymentId,
          amount: booking.total,
          confirmedAt: now.toISOString(),
        }),
      },
    });

    return { success: true, booking: updatedBooking };
  });

  if (result.success && result.booking) {
    sendBookingConfirmationNotification(bookingId).catch((err) => {
      console.error("[confirmBookingPayment] Async notification error:", err);
    });
  }

  return result;
}
