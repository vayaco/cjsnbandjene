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
    const venueId = searchParams.get("venueId");

    const whereClause: any = {
      businessId: user.businessId,
      status: "confirmed",
    };

    if (user.role === "venue_manager" && user.venueId) {
      whereClause.venueId = user.venueId;
    } else if (venueId && venueId !== "all") {
      whereClause.venueId = venueId;
    }

    const bookings = await db.booking.findMany({
      where: whereClause,
      include: {
        venue: { select: { name: true } },
        resource: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalRevenue = bookings.reduce((sum, b) => sum + b.total, 0);
    const totalBookings = bookings.length;

    // Method breakdown
    const methods: Record<string, number> = {};
    for (const b of bookings) {
      const m = b.paymentMethod || "other";
      methods[m] = (methods[m] || 0) + b.total;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalBookings,
        methods,
        bookings,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to generate reports" }, { status: 500 });
  }
}
