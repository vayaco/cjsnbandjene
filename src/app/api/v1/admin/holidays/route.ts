import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const holidays = await db.holiday.findMany({
      where: {
        businessId: user.businessId,
      },
      include: {
        venue: {
          select: { name: true }
        }
      },
      orderBy: { dateStr: "asc" },
    });

    return NextResponse.json({ success: true, holidays });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to fetch holidays" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Only super admins can add holidays" }, { status: 403 });
    }

    const body = await request.json();
    const { dateStr, reason, venueId } = body;

    const holiday = await db.holiday.create({
      data: {
        businessId: user.businessId,
        dateStr,
        reason,
        venueId: venueId || null,
      },
    });

    return NextResponse.json({ success: true, holiday });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to create holiday" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Only super admins can delete holidays" }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
    }

    await db.holiday.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to delete holiday" }, { status: 500 });
  }
}
