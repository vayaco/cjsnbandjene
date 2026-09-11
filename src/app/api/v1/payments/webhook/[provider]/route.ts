import { NextRequest, NextResponse } from "next/server";
import { processPaymentWebhook } from "@/lib/payment/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const body = await request.json().catch(() => ({}));

    // Convert request headers to Record<string, string>
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const result = await processPaymentWebhook(provider, body, headers);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      duplicate: result.duplicate || false,
      bookingId: result.bookingId,
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Webhook processing failed." },
      { status: 500 }
    );
  }
}
