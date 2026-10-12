import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await params;
    const body = await request.json();
    const { status, name, defaultPrice } = body;

    const resource = await db.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.businessId !== user.businessId) {
      return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
    }

    if (user.role === "venue_manager" && user.venueId && user.venueId !== resource.venueId) {
      return NextResponse.json({ success: false, error: "Unauthorized for this venue" }, { status: 403 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (name?.trim()) updateData.name = name.trim();
    if (defaultPrice !== undefined && defaultPrice !== null) {
      const parsedPrice = Number(defaultPrice);
      if (!isNaN(parsedPrice) && parsedPrice >= 0) {
        updateData.defaultPrice = parsedPrice;
      }
    }

    const updated = await db.resource.update({
      where: { id: resourceId },
      data: updateData,
    });

    return NextResponse.json({ success: true, resource: updated });
  } catch (error: any) {
    console.error("Update resource error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update resource" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await params;

    const resource = await db.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource || resource.businessId !== user.businessId) {
      return NextResponse.json({ success: false, error: "Court not found" }, { status: 404 });
    }

    if (user.role === "venue_manager" && user.venueId && user.venueId !== resource.venueId) {
      return NextResponse.json({ success: false, error: "Unauthorized for this venue" }, { status: 403 });
    }

    await db.resource.delete({
      where: { id: resourceId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete court error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete court" },
      { status: 500 }
    );
  }
}
