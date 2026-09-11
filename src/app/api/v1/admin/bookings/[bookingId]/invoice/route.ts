import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBookingLookupCandidates } from "@/lib/booking-number";
import { generateBookingInvoicePdf } from "@/lib/invoice/pdf-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const { bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ success: false, error: "Booking identifier is required" }, { status: 400 });
    }

    const candidates = getBookingLookupCandidates(bookingId);

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
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    // Role-based venue check if applicable
    if (user.role === "venue_manager" && user.venueId && booking.venueId !== user.venueId) {
      return NextResponse.json({ success: false, error: "Forbidden: Not authorized for this venue" }, { status: 403 });
    }

    // Generate internal PDF with permanent admin retention
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
    console.error("Admin invoice download error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate admin invoice" },
      { status: 500 }
    );
  }
}
