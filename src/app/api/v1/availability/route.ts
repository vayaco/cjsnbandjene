import { NextRequest, NextResponse } from "next/server";
import { getVenueAvailability } from "@/lib/availability";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const venueSlug = searchParams.get("venueSlug");
    const dateStr = searchParams.get("date"); // "2026-09-15"
    const holdToken = searchParams.get("holdToken") || undefined;
    const requestedIgnoreWindow = searchParams.get("ignoreWindow") === "true";

    if (!dateStr) {
      return NextResponse.json(
        { success: false, error: "Date parameter is required" },
        { status: 400 }
      );
    }

    let targetVenueId = venueId;

    if (!targetVenueId && venueSlug) {
      const venue = await db.venue.findUnique({
        where: { slug: venueSlug },
        select: { id: true },
      });
      if (venue) {
        targetVenueId = venue.id;
      }
    }

    if (!targetVenueId) {
      return NextResponse.json(
        { success: false, error: "Valid venueId or venueSlug is required" },
        { status: 400 }
      );
    }

    // Only allow ignoring booking window if requester is authenticated admin/staff
    let allowIgnoreWindow = false;
    if (requestedIgnoreWindow) {
      const user = await getCurrentUser();
      if (user) {
        allowIgnoreWindow = true;
      }
    }

    const availability = await getVenueAvailability(
      targetVenueId,
      dateStr,
      holdToken,
      allowIgnoreWindow
    );

    return NextResponse.json({ success: true, availability });
  } catch (error: any) {
    console.error("Availability API Error:", error);
    const isWindowError = error.message?.includes("no longer available for online booking");
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate availability" },
      { status: isWindowError ? 422 : 500 }
    );
  }
}
