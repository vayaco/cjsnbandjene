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
    const { venueId, name, defaultPrice = 500, capacity = 4, resourceType = "court" } = body;

    if (!venueId || !name) {
      return NextResponse.json({ success: false, error: "Venue ID and Court Name are required" }, { status: 400 });
    }

    const venue = await db.venue.findUnique({
      where: { id: venueId },
    });

    if (!venue || venue.businessId !== user.businessId) {
      return NextResponse.json({ success: false, error: "Venue not found" }, { status: 404 });
    }

    if (user.role === "venue_manager" && user.venueId && user.venueId !== venueId) {
      return NextResponse.json({ success: false, error: "Unauthorized for this venue" }, { status: 403 });
    }

    const resource = await db.resource.create({
      data: {
        venueId,
        businessId: user.businessId,
        name: name.trim(),
        defaultPrice: Number(defaultPrice) || 500,
        capacity: Number(capacity) || 4,
        resourceType,
        status: "active",
      },
    });

    return NextResponse.json({ success: true, resource });
  } catch (error: any) {
    console.error("Create court error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create court" },
      { status: 500 }
    );
  }
}
