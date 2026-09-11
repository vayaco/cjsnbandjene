import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { venueId } = await params;
    const body = await request.json();
    const { name, address, city, phone, openTime, closeTime, imageUrl, description, status } = body;

    const existing = await db.venue.findUnique({
      where: { id: venueId },
    });

    if (!existing || existing.businessId !== user.businessId) {
      return NextResponse.json({ success: false, error: "Venue not found" }, { status: 404 });
    }

    const updated = await db.venue.update({
      where: { id: venueId },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(phone !== undefined && { phone }),
        ...(openTime && { openTime }),
        ...(closeTime && { closeTime }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ success: true, venue: updated });
  } catch (error: any) {
    console.error("Venue update error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update venue" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { venueId } = await params;

    const existing = await db.venue.findUnique({
      where: { id: venueId },
    });

    if (!existing || existing.businessId !== user.businessId) {
      return NextResponse.json({ success: false, error: "Venue not found" }, { status: 404 });
    }

    await db.venue.delete({
      where: { id: venueId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete venue" },
      { status: 500 }
    );
  }
}
