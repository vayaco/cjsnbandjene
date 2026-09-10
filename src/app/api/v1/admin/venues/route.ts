import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const venues = await db.venue.findMany({
      where: {
        businessId: user.businessId,
        ...(user.role === "venue_manager" && user.venueId ? { id: user.venueId } : {}),
      },
      include: {
        resources: true,
        pricingRules: true,
        _count: {
          select: { bookings: true, resources: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, venues });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to fetch venues" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Only super admins can create venues" }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, address, city, phone, openTime, closeTime, imageUrl, description, courtsCount = 4 } = body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const venue = await db.venue.create({
      data: {
        businessId: user.businessId,
        name,
        slug,
        code: code.toUpperCase(),
        address,
        city: city || "Mumbai",
        phone,
        openTime: openTime || "06:00",
        closeTime: closeTime || "23:00",
        imageUrl,
        description,
      },
    });

    // Automatically create default operating hours
    for (let day = 0; day <= 6; day++) {
      await db.operatingHour.create({
        data: {
          venueId: venue.id,
          dayOfWeek: day,
          openTime: venue.openTime,
          closeTime: venue.closeTime,
          isOpen: true,
        },
      });
    }

    // Automatically create courts
    for (let i = 1; i <= Number(courtsCount); i++) {
      await db.resource.create({
        data: {
          venueId: venue.id,
          businessId: user.businessId,
          name: `Court ${i}`,
          resourceType: "court",
          capacity: 4,
          defaultPrice: 500,
          status: "active",
        },
      });
    }

    return NextResponse.json({ success: true, venue });
  } catch (error: any) {
    console.error("Create venue error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create venue" }, { status: 500 });
  }
}
