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

    let currentWebsiteUrl = "https://niteshbadmintonacademy.com";
    try {
      const rawRows: any = await db.$queryRawUnsafe(
        "SELECT websiteUrl FROM Business WHERE id = ? LIMIT 1",
        user.businessId
      );
      if (rawRows?.[0]?.websiteUrl) {
        currentWebsiteUrl = rawRows[0].websiteUrl;
      }
    } catch {}

    return NextResponse.json({
      success: true,
      business: business ? { ...business, websiteUrl: currentWebsiteUrl } : null,
    });
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
    const { name, logoUrl, websiteUrl, supportPhone, supportEmail, cancellationPolicy, festiveTheme } = body;

    if (websiteUrl !== undefined) {
      try {
        await db.$executeRawUnsafe(
          "UPDATE Business SET websiteUrl = ? WHERE id = ?",
          websiteUrl ? websiteUrl.trim() : null,
          user.businessId
        );
      } catch (err) {
        console.error("Failed to update websiteUrl:", err);
      }
    }

    const updated = await db.business.update({
      where: { id: user.businessId },
      data: {
        ...(name && { name: name.trim() }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl ? logoUrl.trim() : null }),
        ...(supportPhone !== undefined && { supportPhone: supportPhone.trim() }),
        ...(supportEmail !== undefined && { supportEmail: supportEmail.trim() }),
        ...(cancellationPolicy !== undefined && { cancellationPolicy }),
        ...(festiveTheme && { festiveTheme }),
      },
    });

    return NextResponse.json({
      success: true,
      business: { ...updated, websiteUrl: websiteUrl || "https://niteshbadmintonacademy.com" },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to update business" }, { status: 500 });
  }
}
