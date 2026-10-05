import { NextRequest, NextResponse } from "next/server";
import { validateAccessToken } from "@/lib/access-token";
import { generateBookingInvoicePdf } from "@/lib/invoice/pdf-service";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBookingLookupCandidates } from "@/lib/booking-number";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return new NextResponse("Invalid invoice request.", { status: 400 });
    }

    let booking: any = null;

    // Check if token is a secure 256-bit access token
    if (token.length >= 32) {
      const validation = await validateAccessToken(token, "any");

      if (!validation.valid) {
        if (validation.error === "expired") {
          return new NextResponse(
            "This invoice link has expired. Please contact the venue if you need assistance.",
            {
              status: 410,
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "X-Robots-Tag": "noindex, nofollow",
              },
            }
          );
        }

        return new NextResponse(
          "Invalid or expired invoice link.",
          {
            status: 404,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "X-Robots-Tag": "noindex, nofollow",
            },
          }
        );
      }

      booking = validation.booking;
    } else {
      // Check if user is authenticated admin accessing by booking number or ID
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return new NextResponse("Unauthorized invoice access.", { status: 401 });
      }

      const candidates = getBookingLookupCandidates(token);
      booking = await db.booking.findFirst({
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
        },
      });

      if (!booking) {
        return new NextResponse("Booking not found.", { status: 404 });
      }
    }

    // Fetch business branding
    const business = await db.business.findFirst({ select: { name: true } });

    // Generate internal PDF
    const pdfBuffer = await generateBookingInvoicePdf({
      bookingNumber: booking.bookingNumber,
      bookingDateStr: booking.dateStr,
      startTimeStr: booking.startTimeStr,
      endTimeStr: booking.endTimeStr,
      total: booking.total,
      subtotal: booking.subtotal,
      tax: booking.tax,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      createdAt: booking.createdAt,
      brandName: business?.name || "Nitish Badminton Academy",
      customer: {
        name: booking.customer.name,
        phone: booking.customer.phone,
        email: booking.customer.email,
      },
      venue: {
        name: booking.venue.name,
        address: booking.venue.address,
        city: booking.venue.city,
        phone: booking.venue.phone,
      },
      resource: {
        name: booking.resource.name,
        resourceType: booking.resource.resourceType,
      },
    });

    const filename = `${booking.bookingNumber}-invoice.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Invoice download error:", error);
    return new NextResponse("An error occurred while generating your invoice.", {
      status: 500,
    });
  }
}
