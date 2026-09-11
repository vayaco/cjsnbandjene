import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/utils";
import { getBookingLookupCandidates } from "@/lib/booking-number";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_TOKEN_EXPIRY_MS } from "@/lib/access-token";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingNumber, phone } = body;

    if (!bookingNumber && !phone) {
      return NextResponse.json(
        { success: false, error: "Please enter a Booking ID or Phone Number." },
        { status: 400 }
      );
    }

    const whereClause: any = {};

    if (bookingNumber && bookingNumber.trim()) {
      const candidates = getBookingLookupCandidates(bookingNumber);
      whereClause.OR = [
        ...candidates.map((code) => ({ bookingNumber: { equals: code } })),
        ...candidates.map((code) => ({ id: { equals: code } })),
      ];
    }

    if (phone && phone.trim()) {
      const cleanPhone = normalizePhone(phone);
      whereClause.customer = {
        phone: {
          contains: cleanPhone.slice(-10),
        },
      };
    }

    const booking = await db.booking.findFirst({
      where: whereClause,
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
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: "No booking found for this reference code. Please verify the code.",
        },
        { status: 404 }
      );
    }

    // Check server-authoritative 7-day expiry
    const expiresAt = new Date(booking.createdAt.getTime() + ACCESS_TOKEN_EXPIRY_MS);
    const isExpired = Date.now() >= expiresAt.getTime();
    const currentUser = await getCurrentUser();

    if (isExpired && !currentUser) {
      return NextResponse.json(
        {
          success: false,
          expired: true,
          error: "This booking link has expired. Your booking record has not been deleted. Please contact the venue if you need assistance.",
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      booking,
      expiresAt,
      isAdmin: !!currentUser,
    });
  } catch (error: any) {
    console.error("Booking lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to recover booking" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const bookingNumber = url.searchParams.get("bookingNumber") || url.searchParams.get("code");

    if (!bookingNumber || !bookingNumber.trim()) {
      return NextResponse.json(
        { success: false, error: "Booking code parameter is required." },
        { status: 400 }
      );
    }

    const candidates = getBookingLookupCandidates(bookingNumber);

    const booking = await db.booking.findFirst({
      where: {
        OR: [
          ...candidates.map((code) => ({ bookingNumber: { equals: code } })),
          ...candidates.map((code) => ({ id: { equals: code } })),
        ],
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
        payments: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found." },
        { status: 404 }
      );
    }

    // Check server-authoritative 7-day expiry
    const expiresAt = new Date(booking.createdAt.getTime() + ACCESS_TOKEN_EXPIRY_MS);
    const isExpired = Date.now() >= expiresAt.getTime();
    const currentUser = await getCurrentUser();

    if (isExpired && !currentUser) {
      return NextResponse.json(
        {
          success: false,
          expired: true,
          error: "This booking link has expired. Your booking record has not been deleted. Please contact the venue if you need assistance.",
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      booking,
      expiresAt,
      isAdmin: !!currentUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to recover booking" },
      { status: 500 }
    );
  }
}

