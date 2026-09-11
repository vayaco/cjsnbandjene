import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBookingLookupCandidates } from "@/lib/booking-number";
import { validateAccessToken, ACCESS_TOKEN_EXPIRY_MS } from "@/lib/access-token";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId: tokenOrId } = await params;

    if (!tokenOrId) {
      return NextResponse.json({ success: false, error: "Identifier is required" }, { status: 400 });
    }

    // 1. Check if tokenOrId is a secure 256-bit customer access token
    if (tokenOrId.length >= 32) {
      const validation = await validateAccessToken(tokenOrId, "customer_access");

      if (!validation.valid) {
        if (validation.error === "expired") {
          return NextResponse.json(
            {
              success: false,
              expired: true,
              error: "This booking link has expired. Your booking record has not been deleted. Please contact the venue if you need assistance.",
            },
            { status: 410 }
          );
        }

        return NextResponse.json(
          { success: false, error: "Invalid or expired booking link." },
          { status: 404 }
        );
      }

      // Find active invoice download token
      const invoiceTokenRecord = await db.bookingAccessToken.findFirst({
        where: {
          bookingId: validation.booking.id,
          purpose: "invoice_download",
          expiresAt: { gt: new Date() },
          revokedAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        booking: validation.booking,
        invoiceToken: invoiceTokenRecord ? tokenOrId : undefined,
        expiresAt: validation.expiresAt,
      });
    }

    // 2. Lookup by Booking ID or primary key
    const candidates = getBookingLookupCandidates(tokenOrId);

    const booking = await db.booking.findFirst({
      where: {
        OR: [
          ...candidates.map((code) => ({ bookingNumber: { equals: code } })),
          ...candidates.map((code) => ({ id: { equals: code } })),
        ],
      },
      include: {
        venue: true,
        resource: true,
        customer: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check server-authoritative 7-day expiry
    const expiresAt = new Date(booking.createdAt.getTime() + ACCESS_TOKEN_EXPIRY_MS);
    const isExpired = Date.now() >= expiresAt.getTime();

    // Check if requester is authenticated as admin
    const currentUser = await getCurrentUser();
    if (currentUser) {
      return NextResponse.json({
        success: true,
        booking,
        isAdmin: true,
        customerLinkExpired: isExpired,
        expiresAt,
      });
    }

    // Unauthenticated customer request for expired booking
    if (isExpired) {
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
    });
  } catch (error: any) {
    console.error("Booking retrieval error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve booking" },
      { status: 500 }
    );
  }
}

