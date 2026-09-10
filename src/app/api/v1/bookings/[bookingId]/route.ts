import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    const booking = await db.booking.findFirst({
      where: {
        OR: [{ id: bookingId }, { bookingNumber: bookingId }],
      },
      include: {
        venue: {
          select: {
            name: true,
            slug: true,
            address: true,
            city: true,
            phone: true,
            googleMapsUrl: true,
            cancellationPolicy: true,
          },
        },
        resource: {
          select: {
            name: true,
            resourceType: true,
          },
        },
        customer: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
        payments: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error("Booking retrieval error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve booking" },
      { status: 500 }
    );
  }
}
