import { PaymentProvider, CreateOrderParams, PaymentOrderResult, VerifyPaymentParams, VerifyPaymentResult, WebhookResult } from "../types";
import crypto from "crypto";

export class CashfreePaymentProvider implements PaymentProvider {
  readonly id = "cashfree";
  readonly name = "Cashfree Payments";

  private appId: string;
  private secretKey: string;
  private isProduction: boolean;

  constructor() {
    this.appId = process.env.CASHFREE_APP_ID || "";
    this.secretKey = process.env.CASHFREE_SECRET_KEY || "";
    this.isProduction = process.env.NODE_ENV === "production";
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    if (!this.appId || !this.secretKey) {
      return {
        success: false,
        provider: this.id,
        error: "Cashfree credentials are not configured.",
      };
    }

    const orderId = `CF_${params.bookingNumber}_${Date.now()}`;
    const baseUrl = this.isProduction
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";

    try {
      const response = await fetch(`${baseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2023-08-01",
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: params.amount,
          order_currency: params.currency || "INR",
          customer_details: {
            customer_id: `cust_${params.customerPhone}`,
            customer_name: params.customerName,
            customer_email: params.customerEmail || "customer@badmintonacademy.in",
            customer_phone: params.customerPhone,
          },
          order_meta: {
            return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/booking/${params.bookingNumber}?order_id={order_id}`,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          provider: this.id,
          error: data.message || "Cashfree order creation failed",
        };
      }

      return {
        success: true,
        orderId: data.order_id,
        paymentUrl: data.payment_session_id,
        provider: this.id,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.id,
        error: err.message || "Failed to reach Cashfree API",
      };
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (!this.appId || !this.secretKey) {
      return {
        success: false,
        status: "failed",
        error: "Cashfree credentials not configured.",
      };
    }

    const baseUrl = this.isProduction
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";

    try {
      const response = await fetch(`${baseUrl}/orders/${params.orderId}`, {
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
        },
      });

      const data = await response.json();
      const status = data.order_status === "PAID" ? "successful" : "pending";

      return {
        success: status === "successful",
        status,
        orderId: data.order_id,
        amount: data.order_amount,
      };
    } catch (err: any) {
      return {
        success: false,
        status: "failed",
        error: err.message,
      };
    }
  }

  async parseWebhook(body: any, headers: Record<string, string>): Promise<WebhookResult> {
    const signature = headers["x-webhook-signature"];
    const timestamp = headers["x-webhook-timestamp"];

    let valid = true;
    if (this.secretKey && signature && timestamp) {
      const payload = timestamp + JSON.stringify(body);
      const expectedSig = crypto
        .createHmac("sha256", this.secretKey)
        .update(payload)
        .digest("base64");
      valid = expectedSig === signature;
    }

    const eventType = body?.type || "unknown";
    const orderData = body?.data?.order || {};
    const paymentData = body?.data?.payment || {};
    const isPaid = paymentData?.payment_status === "SUCCESS" || eventType === "PAYMENT_SUCCESS_WEBHOOK";

    return {
      valid,
      eventId: body?.event_time || `cf_evt_${Date.now()}`,
      eventType,
      orderId: orderData.order_id || "",
      paymentId: paymentData.cf_payment_id || "",
      amount: paymentData.payment_amount,
      status: isPaid ? "successful" : "failed",
      rawPayload: body,
    };
  }
}
