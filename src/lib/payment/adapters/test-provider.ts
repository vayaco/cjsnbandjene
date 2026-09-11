import { PaymentProvider, CreateOrderParams, PaymentOrderResult, VerifyPaymentParams, VerifyPaymentResult, WebhookResult } from "../types";
import crypto from "crypto";

/**
 * Test Payment Provider for development and preview modes.
 * Strictly disabled in production.
 */
export class TestPaymentProvider implements PaymentProvider {
  readonly id = "test";
  readonly name = "Simulated Payment Gateway (Preview)";

  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    const orderId = `test_order_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    return {
      success: true,
      orderId,
      provider: this.id,
      paymentUrl: `/preview-payment?orderId=${orderId}&amount=${params.amount}`,
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (params.paymentId.startsWith("fail_")) {
      return {
        success: false,
        status: "failed",
        error: "Simulated payment failure",
      };
    }

    return {
      success: true,
      status: "successful",
      orderId: params.orderId,
      paymentId: params.paymentId || `test_pay_${Date.now()}`,
    };
  }

  async parseWebhook(body: any, headers: Record<string, string>): Promise<WebhookResult> {
    const eventId = body.eventId || `test_evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const orderId = body.orderId || "";
    const isSuccess = body.status === "SUCCESS" || body.status === "successful";

    return {
      valid: true,
      eventId,
      eventType: isSuccess ? "payment.successful" : "payment.failed",
      orderId,
      paymentId: body.paymentId || `test_pay_${Date.now()}`,
      amount: body.amount,
      status: isSuccess ? "successful" : "failed",
      rawPayload: body,
    };
  }
}
