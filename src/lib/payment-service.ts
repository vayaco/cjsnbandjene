/**
 * Payment Provider Abstraction Layer
 * Multi-gateway ready: Razorpay, Cashfree, PhonePe, Stripe, or Custom.
 */

export interface CreateOrderParams {
  bookingId: string;
  bookingNumber: string;
  amount: number;
  currency: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  venueName: string;
}

export interface PaymentOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  checkoutUrl?: string;
  status: "created" | "pending";
  metadata?: Record<string, any>;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  status: "successful" | "failed" | "pending";
  transactionId?: string;
  error?: string;
}

export interface PaymentProvider {
  name: string;
  createOrder(params: CreateOrderParams): Promise<PaymentOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
  refund(paymentId: string, amount: number): Promise<{ success: boolean; refundId?: string; error?: string }>;
}

/**
 * Placeholder Provider for MVP Demo Phase
 * Lets users test the full flow without real financial cards or gateway keys.
 */
export class PlaceholderPaymentProvider implements PaymentProvider {
  name = "placeholder";

  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    return {
      orderId: `demo_ord_${Date.now()}`,
      amount: params.amount,
      currency: params.currency || "INR",
      status: "created",
      metadata: {
        note: "Payment integration is scheduled for Phase 2. Demo mode active.",
      },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult> {
    return {
      verified: true,
      status: "successful",
      transactionId: `demo_tx_${Date.now()}`,
    };
  }

  async refund(paymentId: string, amount: number) {
    return {
      success: true,
      refundId: `demo_ref_${Date.now()}`,
    };
  }
}

// Active provider registry
export const paymentService: PaymentProvider = new PlaceholderPaymentProvider();
