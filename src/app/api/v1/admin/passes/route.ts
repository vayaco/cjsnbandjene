import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";
import { allocateBookingNumber } from "@/lib/booking-number";
import { createBookingAccessTokens } from "@/lib/access-token";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {
      businessId: user.businessId,
    };

    if (venueId && venueId !== "all") {
      where.venueId = venueId;
    }
    if (month && month !== "all") {
      where.month = parseInt(month, 10);
    }
    if (year && year !== "all") {
      where.year = parseInt(year, 10);
    }
    if (status && status !== "all") {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { passNumber: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { phone: { contains: q } } },
      ];
    }

    const passes = await db.monthlyPass.findMany({
      where,
      include: {
        venue: { select: { id: true, name: true, slug: true } },
        resource: { select: { id: true, name: true, resourceType: true } },
        customer: { select: { id: true, name: true, phone: true, email: true } },
        bookings: {
          select: {
            id: true,
            bookingNumber: true,
            dateStr: true,
            startTimeStr: true,
            endTimeStr: true,
            status: true,
            total: true,
          },
          orderBy: { dateStr: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, passes });
  } catch (error: any) {
    console.error("List monthly passes error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch monthly passes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      venueId,
      resourceId,
      year,
      month,
      daysOfWeek = [0],
      daysLabel,
      startTimeStr,
      endTimeStr,
      customerName,
      customerPhone,
      customerEmail,
      selectedDates, // Array of strings: ["2026-10-04", "2026-10-11", ...]
      pricePerSession,
      totalAmount,
      paymentStatus = "successful",
      paymentMethod = "cash",
      notes,
    } = body;

    // Validation
    if (!venueId || !resourceId || !year || !month || !startTimeStr || !endTimeStr) {
      return NextResponse.json(
        { success: false, error: "Missing required pass parameters" },
        { status: 400 }
      );
    }

    if (!selectedDates || !Array.isArray(selectedDates) || selectedDates.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one session date must be selected for the pass" },
        { status: 400 }
      );
    }

    if (!customerName || !customerName.trim()) {
      return NextResponse.json(
        { success: false, error: "Customer name is required" },
        { status: 400 }
      );
    }

    const cleanPhone = normalizePhone(customerPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Valid 10-digit mobile number is required" },
        { status: 400 }
      );
    }

    const venue = await db.venue.findUnique({
      where: { id: venueId },
    });
    const resource = await db.resource.findUnique({
      where: { id: resourceId },
    });

    if (!venue || !resource || resource.venueId !== venue.id) {
      return NextResponse.json(
        { success: false, error: "Court or venue could not be found" },
        { status: 404 }
      );
    }

    // Pre-check for conflicting bookings on selected dates
    const conflictingBookings = await db.booking.findMany({
      where: {
        resourceId,
        dateStr: { in: selectedDates },
        startTimeStr,
        status: { in: ["confirmed", "payment_pending"] },
      },
      select: {
        dateStr: true,
        bookingNumber: true,
      },
    });

    if (conflictingBookings.length > 0) {
      const datesList = conflictingBookings
        .map((b) => `${b.dateStr} (${b.bookingNumber})`)
        .join(", ");
      return NextResponse.json(
        {
          success: false,
          error: `Slot is already booked on the following dates: ${datesList}. Please deselect or choose another time.`,
        },
        { status: 409 }
      );
    }

    const totalSessions = selectedDates.length;
    const finalPricePerSession = Number(pricePerSession) || resource.defaultPrice;
    const finalTotalAmount = Number(totalAmount) || totalSessions * finalPricePerSession;

    // Execute atomic creation in transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Find or create customer
      let customer = await tx.customer.findUnique({
        where: {
          businessId_phone: {
            businessId: user.businessId,
            phone: cleanPhone,
          },
        },
      });

      const firstSessionDate = new Date(`${selectedDates[0]}T${startTimeStr}:00.000Z`);

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            businessId: user.businessId,
            phone: cleanPhone,
            name: customerName.trim(),
            email: customerEmail?.trim() || null,
            firstBookingAt: firstSessionDate,
            lastBookingAt: firstSessionDate,
            totalBookings: totalSessions,
            totalSpend: paymentStatus === "successful" ? finalTotalAmount : 0,
          },
        });
      } else {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: customerName.trim() || customer.name,
            email: customerEmail?.trim() || customer.email,
            lastBookingAt: firstSessionDate,
            totalBookings: { increment: totalSessions },
            totalSpend:
              paymentStatus === "successful"
                ? { increment: finalTotalAmount }
                : undefined,
          },
        });
      }

      // 2. Generate sequential Pass Number
      const monthPrefix = `${year}${String(month).padStart(2, "0")}`;
      const existingPassCount = await tx.monthlyPass.count({
        where: {
          businessId: user.businessId,
          year: Number(year),
          month: Number(month),
        },
      });

      const passNumber = `PASS-${monthPrefix}-${String(existingPassCount + 1).padStart(3, "0")}`;

      // 3. Create MonthlyPass record
      const monthlyPass = await tx.monthlyPass.create({
        data: {
          passNumber,
          businessId: user.businessId,
          venueId: venue.id,
          resourceId: resource.id,
          customerId: customer.id,
          month: Number(month),
          year: Number(year),
          daysOfWeek: JSON.stringify(daysOfWeek),
          daysLabel: daysLabel || "Custom Recurring Schedule",
          startTimeStr,
          endTimeStr,
          totalSessions,
          pricePerSession: finalPricePerSession,
          totalAmount: finalTotalAmount,
          paymentStatus,
          paymentMethod,
          status: "active",
          notes: notes?.trim() || null,
          createdBy: user.role,
        },
      });

      // 4. Create individual confirmed Bookings for every selected date
      const createdBookings: any[] = [];
      const perBookingPrice = finalTotalAmount / totalSessions;

      for (const dateStr of selectedDates) {
        const startAt = new Date(`${dateStr}T${startTimeStr}:00.000Z`);
        const endAt = new Date(`${dateStr}T${endTimeStr}:00.000Z`);

        const { bookingCode: bookingNumber } = await allocateBookingNumber(tx);

        const booking = await tx.booking.create({
          data: {
            bookingNumber,
            businessId: user.businessId,
            venueId: venue.id,
            resourceId: resource.id,
            customerId: customer.id,
            passId: monthlyPass.id,
            isPassBooking: true,
            startAt,
            endAt,
            dateStr,
            startTimeStr,
            endTimeStr,
            status: "confirmed",
            subtotal: perBookingPrice,
            total: perBookingPrice,
            paymentStatus: paymentStatus === "successful" ? "successful" : "pending",
            paymentMethod: paymentMethod || "pass",
            notes: `Monthly Pass #${passNumber} (${daysLabel || "Recurring Session"})`,
            createdBy: user.role,
          },
        });

        // Create Payment record for booking
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            businessId: user.businessId,
            provider: "manual",
            amount: perBookingPrice,
            method: paymentMethod || "pass",
            status: paymentStatus === "successful" ? "successful" : "pending",
            paidAt: paymentStatus === "successful" ? new Date() : null,
            notes: `Monthly Pass ${passNumber} allocation`,
          },
        });

        // Create Access tokens for each booking pass
        await createBookingAccessTokens(booking.id, booking.createdAt, tx);

        createdBookings.push(booking);
      }

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          businessId: user.businessId,
          userId: user.id,
          userEmail: user.email,
          action: "monthly_pass_issued",
          entityType: "monthly_pass",
          entityId: monthlyPass.id,
          details: JSON.stringify({
            passNumber,
            customerName: customer.name,
            customerPhone: customer.phone,
            venue: venue.name,
            court: resource.name,
            month: `${year}-${month}`,
            schedule: daysLabel,
            time: `${startTimeStr} - ${endTimeStr}`,
            sessionsCount: totalSessions,
            totalAmount: finalTotalAmount,
            paymentMethod,
          }),
        },
      });

      return {
        pass: monthlyPass,
        bookingsCount: createdBookings.length,
        bookings: createdBookings,
        customer,
      };
    });

    return NextResponse.json({
      success: true,
      pass: result.pass,
      bookingsCount: result.bookingsCount,
      customer: result.customer,
    });
  } catch (error: any) {
    console.error("Create monthly pass error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create monthly pass" },
      { status: 500 }
    );
  }
}
