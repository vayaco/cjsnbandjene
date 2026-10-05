import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [venues, businessRecord] = await Promise.all([
      db.venue.findMany({
        where: { status: "active" },
        include: {
          resources: {
            where: { status: "active" },
            select: { id: true, defaultPrice: true },
          },
          pricingRules: {
            where: { status: "active" },
            select: { price: true },
          },
        },
        orderBy: { name: "asc" },
      }),
      db.business.findFirst({
        select: {
          name: true,
          slug: true,
          logoUrl: true,
          supportPhone: true,
          supportEmail: true,
          festiveTheme: true,
        },
      }),
    ]);

    let websiteUrl = "https://niteshbadmintonacademy.com";
    try {
      const rawRows: any = await db.$queryRawUnsafe("SELECT websiteUrl FROM Business LIMIT 1");
      if (rawRows?.[0]?.websiteUrl) {
        websiteUrl = rawRows[0].websiteUrl;
      }
    } catch {}

    const business = businessRecord ? { ...businessRecord, websiteUrl } : null;

    const result = venues.map((v) => {
      // Find starting price
      const resourcePrices = v.resources.map((r) => r.defaultPrice);
      const rulePrices = v.pricingRules.map((r) => r.price);
      const allPrices = [...resourcePrices, ...rulePrices];
      const startingPrice = allPrices.length > 0 ? Math.min(...allPrices) : 500;

      return {
        id: v.id,
        name: v.name,
        slug: v.slug,
        code: v.code,
        address: v.address,
        city: v.city,
        phone: v.phone,
        openTime: v.openTime,
        closeTime: v.closeTime,
        imageUrl: v.imageUrl,
        description: v.description,
        courtsCount: v.resources.length,
        startingPrice,
      };
    });

    return NextResponse.json({ success: true, business, venues: result });
  } catch (error: any) {
    console.error("Error fetching venues:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch venues" },
      { status: 500 }
    );
  }
}
