import { NextRequest, NextResponse } from "next/server";
import { confirmBookingPayment } from "@/lib/booking-engine";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  // Guard: Never expose fake payment simulation in production
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_PAYMENT_SIMULATION !== "true") {
    return NextResponse.json(
      { success: false, error: "Payment simulation is disabled in production." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { bookingId, bookingNumber, outcome = "success" } = body;

    if (!bookingId && !bookingNumber) {
      return NextResponse.json(
        { success: false, error: "Booking ID or booking number is required." },
        { status: 400 }
      );
    }

    // Lookup booking
    const booking = await db.booking.findFirst({
      where: {
        OR: [
          ...(bookingId ? [{ id: bookingId }] : []),
          ...(bookingNumber ? [{ bookingNumber }] : []),
        ],
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found." },
        { status: 404 }
      );
    }

    if (outcome === "success") {
      const result = await confirmBookingPayment({
        bookingId: booking.id,
        provider: "test",
        providerPaymentId: `sim_pay_${Date.now()}`,
        providerOrderId: `sim_order_${booking.bookingNumber}`,
        notes: "Simulated successful payment in development mode",
      });

      return NextResponse.json({
        success: true,
        message: "Payment simulated successfully. Booking confirmed!",
        booking: result.booking,
      });
    } else {
      // Simulate failure
      await db.payment.updateMany({
        where: { bookingId: booking.id },
        data: {
          status: "failed",
          notes: "Simulated payment failure triggered by user in preview mode",
        },
      });

      return NextResponse.json({
        success: false,
        error: "Your simulated payment was declined. Please try again.",
      });
    }
  } catch (error: any) {
    console.error("Simulation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to simulate payment." },
      { status: 500 }
    );
  }
}
