import { NextRequest, NextResponse } from "next/server";
import { cancelBooking } from "@/lib/booking-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason, phone } = body;

    const result = await cancelBooking(bookingId, reason, "customer");

    return NextResponse.json({
      ...result,
      message: "Booking has been cancelled successfully.",
    });
  } catch (error: any) {
    console.error("Booking cancellation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel booking" },
      { status: 400 }
    );
  }
}
