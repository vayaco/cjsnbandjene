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
    console.error("Fetch venues error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch venues" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !["super_admin", "admin"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin privileges required to create venues" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, address, city, phone, openTime, closeTime, imageUrl, description, courtsCount = 4 } = body;

    if (!name?.trim() || !address?.trim()) {
      return NextResponse.json(
        { success: false, error: "Venue name and address are required" },
        { status: 400 }
      );
    }

    // 1. Generate guaranteed unique slug
    let baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!baseSlug) baseSlug = "venue";

    let slug = baseSlug;
    let counter = 1;
    while (await db.venue.findUnique({ where: { slug } })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    const venueCode = (code?.trim() || slug).toUpperCase();

    // 2. Atomically create venue, operating hours, and courts inside transaction
    const venue = await db.$transaction(async (tx) => {
      const newVenue = await tx.venue.create({
        data: {
          businessId: user.businessId,
          name: name.trim(),
          slug,
          code: venueCode,
          address: address.trim(),
          city: (city?.trim() || "Mumbai"),
          phone: phone?.trim() || null,
          openTime: openTime?.trim() || "06:00",
          closeTime: closeTime?.trim() || "23:00",
          imageUrl: imageUrl?.trim() || null,
          description: description?.trim() || null,
          status: "active",
        },
      });

      // Automatically create default operating hours (Sunday=0 to Saturday=6)
      for (let day = 0; day <= 6; day++) {
        await tx.operatingHour.create({
          data: {
            venueId: newVenue.id,
            dayOfWeek: day,
            openTime: newVenue.openTime,
            closeTime: newVenue.closeTime,
            isOpen: true,
          },
        });
      }

      // Automatically generate court resources
      const totalCourts = Math.max(1, Math.min(50, Number(courtsCount) || 4));
      for (let i = 1; i <= totalCourts; i++) {
        await tx.resource.create({
          data: {
            venueId: newVenue.id,
            businessId: user.businessId,
            name: `Court ${i}`,
            resourceType: "court",
            capacity: 4,
            defaultPrice: 500,
            status: "active",
          },
        });
      }

      // Include resources in returned object
      return await tx.venue.findUnique({
        where: { id: newVenue.id },
        include: { resources: true, operatingHours: true },
      });
    });

    return NextResponse.json({ success: true, venue });
  } catch (error: any) {
    console.error("Create venue error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create venue" },
      { status: 500 }
    );
  }
}
