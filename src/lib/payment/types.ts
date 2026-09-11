export type PaymentStatus =
  | "created"
  | "pending"
  | "successful"
  | "failed"
  | "expired"
  | "refund_pending"
  | "refunded"
  | "partially_refunded";

export interface CreateOrderParams {
  bookingId: string;
  bookingNumber: string;
  amount: number;
  currency?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  venueName: string;
}

export interface PaymentOrderResult {
  success: boolean;
  orderId?: string;
  paymentUrl?: string;
  provider: string;
  rawResponse?: any;
  error?: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature?: string;
  payload?: any;
}

export interface VerifyPaymentResult {
  success: boolean;
  status: PaymentStatus;
  paymentId?: string;
  orderId?: string;
  amount?: number;
  error?: string;
}

export interface WebhookResult {
  valid: boolean;
  eventId: string;
  eventType: string;
  orderId: string;
  paymentId?: string;
  amount?: number;
  status: PaymentStatus;
  rawPayload: any;
  error?: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly name: string;
  createOrder(params: CreateOrderParams): Promise<PaymentOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
  parseWebhook(body: any, headers: Record<string, string>): Promise<WebhookResult>;
}
