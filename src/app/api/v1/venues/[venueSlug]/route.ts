import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { venueSlug } = await params;

    const venue = await db.venue.findUnique({
      where: { slug: venueSlug },
      include: {
        business: {
          select: {
            name: true,
            slug: true,
            logoUrl: true,
            supportPhone: true,
            supportEmail: true,
          },
        },
        resources: {
          where: { status: { not: "inactive" } },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!venue) {
      return NextResponse.json(
        { success: false, error: "Venue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, venue });
  } catch (error: any) {
    console.error("Error fetching venue:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch venue" },
      { status: 500 }
    );
  }
}
