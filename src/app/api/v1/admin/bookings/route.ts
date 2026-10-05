import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createBooking } from "@/lib/booking-engine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const search = searchParams.get("search");

    const whereClause: any = {
      businessId: user.businessId,
    };

    if (user.role === "venue_manager" && user.venueId) {
      whereClause.venueId = user.venueId;
    } else if (venueId && venueId !== "all") {
      whereClause.venueId = venueId;
    }

    if (status && status !== "all") {
      whereClause.status = status;
    }

    if (date) {
      whereClause.dateStr = date;
    }

    if (search) {
      const searchClean = search.trim();
      whereClause.OR = [
        { bookingNumber: { contains: searchClean } },
        { customer: { phone: { contains: searchClean } } },
        { customer: { name: { contains: searchClean } } },
      ];
    }

    const bookings = await db.booking.findMany({
      where: whereClause,
      include: {
        venue: { select: { id: true, name: true, slug: true } },
        resource: { select: { id: true, name: true, resourceType: true } },
        customer: { select: { id: true, name: true, phone: true, email: true } },
        pass: { select: { id: true, passNumber: true, daysLabel: true, month: true, year: true } },
      },
      orderBy: [{ dateStr: "desc" }, { startTimeStr: "desc" }],
      take: 100,
    });

    return NextResponse.json({ success: true, bookings });
  } catch (error: any) {
    console.error("Admin bookings list error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch bookings" }, { status: 500 });
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
      dateStr,
      startTimeStr,
      endTimeStr,
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod = "cash",
      notes,
    } = body;

    const result = await createBooking({
      venueId,
      resourceId,
      dateStr,
      startTimeStr,
      endTimeStr,
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod,
      notes,
      createdBy: user.role === "super_admin" ? "admin" : "staff",
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, booking: result.booking });
  } catch (error: any) {
    console.error("Admin create booking error:", error);
    return NextResponse.json({ success: false, error: "Failed to create manual booking" }, { status: 500 });
  }
}
