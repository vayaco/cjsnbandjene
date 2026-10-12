import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const venueFilter = searchParams.get("venueId") || undefined;

    // Build base filter scoped by businessId
    const businessId = user.businessId;

    // Current local time in Indian Standard Time (IST)
    const now = new Date();
    const dateStrToday = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const startOfToday = new Date(`${dateStrToday}T00:00:00+05:30`);
    const endOfToday = new Date(`${dateStrToday}T23:59:59.999+05:30`);

    // Venue filter logic (respecting venue manager restrictions)
    let effectiveVenueId = venueFilter;
    if (user.role === "venue_manager" && user.venueId) {
      effectiveVenueId = user.venueId;
    }

    const venueWhere = effectiveVenueId ? { id: effectiveVenueId } : {};
    const bookingVenueWhere = effectiveVenueId ? { venueId: effectiveVenueId } : {};

    // 1. Fetch Venues list for filter dropdown
    const venues = await db.venue.findMany({
      where: {
        businessId,
        status: "active",
        ...(user.role === "venue_manager" && user.venueId ? { id: user.venueId } : {}),
      },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    // 2. Fetch all active resources count to compute capacity
    const allResources = await db.resource.findMany({
      where: {
        businessId,
        status: "active",
        ...bookingVenueWhere,
      },
    });

    // Approximate total slots per day (e.g. 17 hours * number of courts)
    const hoursOpen = 17; // 06:00 to 23:00
    const totalPossibleSlotsToday = allResources.length * hoursOpen;

    // 3. Bookings and Revenue generated Today (includes bookings created today or scheduled for today)
    const confirmedTodayBookings = await db.booking.findMany({
      where: {
        businessId,
        status: "confirmed",
        OR: [
          { createdAt: { gte: startOfToday, lte: endOfToday } },
          { dateStr: dateStrToday },
        ],
        ...bookingVenueWhere,
      },
      select: { id: true, total: true },
    });

    const revenueToday = confirmedTodayBookings.reduce((sum, b) => sum + b.total, 0);
    const bookingsTodayCount = confirmedTodayBookings.length;

    // Court occupancy for slots playing today
    const scheduledForTodayCount = await db.booking.count({
      where: {
        businessId,
        dateStr: dateStrToday,
        status: "confirmed",
        ...bookingVenueWhere,
      },
    });

    const occupancyRate = totalPossibleSlotsToday > 0
      ? Math.round((scheduledForTodayCount / totalPossibleSlotsToday) * 100)
      : 0;

    const availableSlotsToday = Math.max(0, totalPossibleSlotsToday - scheduledForTodayCount);

    // Cancellations today
    const cancellationsTodayCount = await db.booking.count({
      where: {
        businessId,
        status: "cancelled",
        OR: [
          { cancelledAt: { gte: startOfToday, lte: endOfToday } },
          { dateStr: dateStrToday },
        ],
        ...bookingVenueWhere,
      },
    });

    // 4. Past 7-day revenue trend
    const trendDays: { date: string; label: string; revenue: number; bookings: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Kolkata" });
      const dStart = new Date(`${dStr}T00:00:00+05:30`);
      const dEnd = new Date(`${dStr}T23:59:59.999+05:30`);

      const dBookings = await db.booking.findMany({
        where: {
          businessId,
          status: "confirmed",
          OR: [
            { createdAt: { gte: dStart, lte: dEnd } },
            { dateStr: dStr },
          ],
          ...bookingVenueWhere,
        },
        select: { id: true, total: true },
      });

      const dayRevenue = dBookings.reduce((sum, b) => sum + b.total, 0);
      trendDays.push({
        date: dStr,
        label: dayLabel,
        revenue: dayRevenue,
        bookings: dBookings.length,
      });
    }

    // 5. Recent 8 bookings
    const recentBookings = await db.booking.findMany({
      where: {
        businessId,
        ...bookingVenueWhere,
      },
      include: {
        venue: { select: { name: true } },
        resource: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    // Pending Payments count
    const pendingPaymentsCount = await db.booking.count({
      where: {
        businessId,
        status: "payment_pending",
        ...bookingVenueWhere,
      },
    });

    // Upcoming Bookings count
    const upcomingBookingsCount = await db.booking.count({
      where: {
        businessId,
        dateStr: { gte: dateStrToday },
        status: "confirmed",
        ...bookingVenueWhere,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          revenueToday,
          bookingsToday: bookingsTodayCount,
          occupancyRate,
          availableSlotsToday,
          cancellationsToday: cancellationsTodayCount,
          pendingPaymentsCount,
          upcomingBookingsCount,
        },
        venues,
        selectedVenueId: effectiveVenueId || "all",
        trend: trendDays,
        recentBookings,
      },
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to load dashboard metrics" }, { status: 500 });
  }
}
