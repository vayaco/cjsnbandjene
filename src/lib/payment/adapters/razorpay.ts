import { PaymentProvider, CreateOrderParams, PaymentOrderResult, VerifyPaymentParams, VerifyPaymentResult, WebhookResult } from "../types";
import crypto from "crypto";

export class RazorpayPaymentProvider implements PaymentProvider {
  readonly id = "razorpay";
  readonly name = "Razorpay";

  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || "";
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    if (!this.keyId || !this.keySecret) {
      return {
        success: false,
        provider: this.id,
        error: "Razorpay credentials are not configured.",
      };
    }

    try {
      const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify({
          amount: Math.round(params.amount * 100), // paise
          currency: params.currency || "INR",
          receipt: params.bookingNumber,
          notes: {
            customer_name: params.customerName,
            customer_phone: params.customerPhone,
            venue_name: params.venueName,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          provider: this.id,
          error: data.error?.description || "Razorpay order creation failed",
        };
      }

      return {
        success: true,
        orderId: data.id,
        provider: this.id,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.id,
        error: err.message || "Failed to reach Razorpay API",
      };
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (!this.keySecret) {
      return {
        success: false,
        status: "failed",
        error: "Razorpay secret key not configured.",
      };
    }

    if (!params.signature) {
      return {
        success: false,
        status: "failed",
        error: "Signature is required for verification.",
      };
    }

    const text = `${params.orderId}|${params.paymentId}`;
    const expectedSig = crypto
      .createHmac("sha256", this.keySecret)
      .update(text)
      .digest("hex");

    const valid = expectedSig === params.signature;
    return {
      success: valid,
      status: valid ? "successful" : "failed",
      orderId: params.orderId,
      paymentId: params.paymentId,
      error: valid ? undefined : "Invalid payment signature.",
    };
  }

  async parseWebhook(body: any, headers: Record<string, string>): Promise<WebhookResult> {
    const signature = headers["x-razorpay-signature"];

    let valid = true;
    if (this.webhookSecret && signature) {
      const payload = JSON.stringify(body);
      const expectedSig = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(payload)
        .digest("hex");
      valid = expectedSig === signature;
    }

    const event = body?.event || "";
    const paymentEntity = body?.payload?.payment?.entity || {};
    const orderId = paymentEntity?.order_id || "";
    const paymentId = paymentEntity?.id || "";
    const isSuccess = event === "payment.captured" || event === "order.paid";

    return {
      valid,
      eventId: body?.id || `rzp_evt_${Date.now()}`,
      eventType: event,
      orderId,
      paymentId,
      amount: paymentEntity.amount ? paymentEntity.amount / 100 : undefined,
      status: isSuccess ? "successful" : "failed",
      rawPayload: body,
    };
  }
}
