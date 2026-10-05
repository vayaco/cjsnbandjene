import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
      month, // 1 - 12
      daysOfWeek = [0], // 0 = Sun, 1 = Mon, ..., 6 = Sat
      startTimeStr, // e.g. "07:00"
      endTimeStr, // e.g. "08:00"
    } = body;

    if (!venueId || !resourceId || !year || !month || !startTimeStr || !endTimeStr) {
      return NextResponse.json(
        { success: false, error: "Missing required pass parameters" },
        { status: 400 }
      );
    }

    const venue = await db.venue.findUnique({
      where: { id: venueId },
      include: {
        pricingRules: { where: { status: "active" } },
      },
    });

    const resource = await db.resource.findUnique({
      where: { id: resourceId },
    });

    if (!venue || !resource || resource.venueId !== venue.id) {
      return NextResponse.json(
        { success: false, error: "Court or venue not found" },
        { status: 404 }
      );
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const now = new Date();
    const venueTz = venue.timezone || "Asia/Kolkata";

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

    // Fetch existing bookings for this resource in this month
    const startOfMonthStr = `${year}-${String(month).padStart(2, "0")}-01`;
    const endOfMonthStr = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const existingBookings = await db.booking.findMany({
      where: {
        resourceId,
        dateStr: { gte: startOfMonthStr, lte: endOfMonthStr },
        startTimeStr,
        status: { in: ["confirmed", "payment_pending"] },
      },
      include: {
        customer: { select: { name: true, phone: true } },
      },
    });

    // Fetch holidays
    const holidays = await db.holiday.findMany({
      where: {
        businessId: user.businessId,
        dateStr: { gte: startOfMonthStr, lte: endOfMonthStr },
        OR: [{ venueId: venue.id }, { venueId: null }],
      },
    });

    // Helper for pricing
    const resolvePrice = (dateStr: string, dayOfWeekNum: number): number => {
      const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;
      const dayType = isWeekend ? "weekend" : "weekday";

      const matchedRule = venue.pricingRules.find((r) => {
        const matchDay = r.dayType === "all" || r.dayType === dayType;
        const matchTime = startTimeStr >= r.startTime && startTimeStr < r.endTime;
        return matchDay && matchTime;
      });

      return matchedRule ? matchedRule.price : resource.defaultPrice;
    };

    const targetDays = new Set(daysOfWeek.map(Number));
    const sessions: any[] = [];

    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      const dow = dateObj.getUTCDay();

      if (targetDays.has(dow)) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const isPast =
          dateStr < todayInVenue ||
          (dateStr === todayInVenue && startTimeStr <= currentTimeInVenue);

        const holiday = holidays.find((h) => h.dateStr === dateStr);
        const booking = existingBookings.find((b) => b.dateStr === dateStr);

        let status: "available" | "booked" | "holiday" | "past" = "available";
        let conflictReason: string | undefined;

        if (isPast) {
          status = "past";
          conflictReason = "Past slot time";
        } else if (holiday) {
          status = "holiday";
          conflictReason = `Academy Holiday: ${holiday.reason}`;
        } else if (booking) {
          status = "booked";
          conflictReason = `Booked by ${booking.customer.name} (${booking.bookingNumber})`;
        }

        const price = resolvePrice(dateStr, dow);

        sessions.push({
          dateStr,
          dayOfWeek: dow,
          formattedDate: dayFormatter.format(dateObj),
          startTime: startTimeStr,
          endTime: endTimeStr,
          status,
          conflictReason,
          price,
          selected: status === "available",
        });
      }
    }

    const availableCount = sessions.filter((s) => s.status === "available").length;
    const suggestedTotal = sessions
      .filter((s) => s.status === "available")
      .reduce((sum, s) => sum + s.price, 0);

    return NextResponse.json({
      success: true,
      sessions,
      totalCount: sessions.length,
      availableCount,
      suggestedTotal,
      defaultSlotPrice: resource.defaultPrice,
    });
  } catch (error: any) {
    console.error("Pass preview error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to preview pass schedule" },
      { status: 500 }
    );
  }
}
