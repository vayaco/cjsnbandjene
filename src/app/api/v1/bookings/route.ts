import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/booking-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      venueId,
      resourceId,
      dateStr,
      startTimeStr,
      endTimeStr,
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod = "placeholder",
      paymentProvider,
      status,
      paymentStatus,
      holdToken,
      notes,
    } = body;

    if (!venueId || !resourceId || !dateStr || !startTimeStr || !endTimeStr) {
      return NextResponse.json(
        { success: false, error: "Missing required booking slot information." },
        { status: 400 }
      );
    }

    if (!customerName || !customerPhone) {
      return NextResponse.json(
        { success: false, error: "Customer name and phone number are required." },
        { status: 400 }
      );
    }

    const result = await createBooking({
      venueId,
      resourceId,
      dateStr,
      startTimeStr,
      endTimeStr,
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod,
      paymentProvider,
      status,
      paymentStatus,
      holdToken,
      notes,
      createdBy: "customer",
    });

    if (!result.success) {
      const isWindowError = result.error?.includes("no longer available for online booking");
      const isInputError = result.error?.includes("valid email") || result.error?.includes("valid phone");
      const status = isWindowError ? 422 : isInputError ? 400 : 409;

      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      rawBookingToken: result.rawBookingToken,
      rawInvoiceToken: result.rawInvoiceToken,
      expiresAt: result.expiresAt,
      message: "Booking confirmed successfully!",
    });
  } catch (error: any) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create booking" },
      { status: 500 }
    );
  }
}
