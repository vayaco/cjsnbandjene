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

    // Today's date string e.g. "2026-09-15"
    const today = new Date();
    const dateStrToday = today.toISOString().split("T")[0];

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

    // 2. Fetch all venues and resources count to compute capacity
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

    // 3. Bookings Today
    const todayBookings = await db.booking.findMany({
      where: {
        businessId,
        dateStr: dateStrToday,
        ...bookingVenueWhere,
      },
      include: {
        resource: { select: { name: true } },
        venue: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { startTimeStr: "asc" },
    });

    const confirmedToday = todayBookings.filter((b) => b.status === "confirmed");
    const cancelledToday = todayBookings.filter((b) => b.status === "cancelled");

    const revenueToday = confirmedToday.reduce((sum, b) => sum + b.total, 0);
    const bookingsTodayCount = confirmedToday.length;

    const occupancyRate = totalPossibleSlotsToday > 0
      ? Math.round((bookingsTodayCount / totalPossibleSlotsToday) * 100)
      : 0;

    const availableSlotsToday = Math.max(0, totalPossibleSlotsToday - bookingsTodayCount);

    // 4. Past 7-day trend
    const trendDays: { date: string; label: string; revenue: number; bookings: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });

      const dBookings = await db.booking.findMany({
        where: {
          businessId,
          dateStr: dStr,
          status: "confirmed",
          ...bookingVenueWhere,
        },
        select: { total: true },
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
          cancellationsToday: cancelledToday.length,
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
