import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const venues = await db.venue.findMany({
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
    });

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

    return NextResponse.json({ success: true, venues: result });
  } catch (error: any) {
    console.error("Error fetching venues:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch venues" },
      { status: 500 }
    );
  }
}
