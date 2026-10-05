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

    const updated = await db.resource.update({
      where: { id: resourceId },
      data: {
        ...(status && { status }),
        ...(name && { name }),
        ...(defaultPrice && { defaultPrice }),
      },
    });

    return NextResponse.json({ success: true, resource: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to update resource" }, { status: 500 });
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
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete court" },
      { status: 500 }
    );
  }
}
