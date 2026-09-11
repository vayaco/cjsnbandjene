import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const business = await db.business.findUnique({
      where: { id: user.businessId },
    });

    return NextResponse.json({ success: true, business });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to fetch business" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, supportPhone, supportEmail, cancellationPolicy, festiveTheme } = body;

    const updated = await db.business.update({
      where: { id: user.businessId },
      data: {
        ...(name && { name }),
        ...(supportPhone && { supportPhone }),
        ...(supportEmail && { supportEmail }),
        ...(cancellationPolicy !== undefined && { cancellationPolicy }),
        ...(festiveTheme && { festiveTheme }),
      },
    });

    return NextResponse.json({ success: true, business: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to update business" }, { status: 500 });
  }
}
