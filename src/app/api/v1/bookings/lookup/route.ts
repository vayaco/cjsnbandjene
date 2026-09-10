import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { bookingNumber, phone } = await request.json();

    if (!bookingNumber || !phone) {
      return NextResponse.json(
        { success: false, error: "Please enter both Booking ID and Phone Number." },
        { status: 400 }
      );
    }

    const cleanPhone = normalizePhone(phone);
    const cleanBookingNum = bookingNumber.trim();

    const booking = await db.booking.findFirst({
      where: {
        OR: [{ bookingNumber: cleanBookingNum }, { id: cleanBookingNum }],
        customer: {
          phone: {
            contains: cleanPhone.slice(-10), // match last 10 digits
          },
        },
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
          },
        },
        resource: {
          select: {
            name: true,
            resourceType: true,
          },
        },
        customer: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: "No booking found matching that Booking ID and Phone Number. Please verify your details.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error("Booking lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to recover booking" },
      { status: 500 }
    );
  }
}
