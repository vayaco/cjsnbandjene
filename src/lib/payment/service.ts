import { db } from "../db";
import { PaymentProvider } from "./types";
import { TestPaymentProvider } from "./adapters/test-provider";
import { CashfreePaymentProvider } from "./adapters/cashfree";
import { RazorpayPaymentProvider } from "./adapters/razorpay";
import { confirmBookingPayment } from "../booking-engine";

const testProvider = new TestPaymentProvider();
const cashfreeProvider = new CashfreePaymentProvider();
const razorpayProvider = new RazorpayPaymentProvider();

const providers: Record<string, PaymentProvider> = {
  test: testProvider,
  cashfree: cashfreeProvider,
  razorpay: razorpayProvider,
};

/**
 * Returns the requested or default payment provider.
 * Defaults to the test provider if keys are not configured.
 */
export function getPaymentProvider(providerId?: string): PaymentProvider {
  if (providerId && providers[providerId]) {
    return providers[providerId];
  }

  // Auto-detect based on configured environment variables
  if (process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY) {
    return cashfreeProvider;
  }
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return razorpayProvider;
  }

  return testProvider;
}

/**
 * Initiates a payment order for a booking.
 */
export async function initiatePaymentOrder(bookingId: string, providerId?: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { venue: true, customer: true },
  });

  if (!booking) {
    return { success: false, error: "Booking not found" };
  }

  const provider = getPaymentProvider(providerId);

  const orderResult = await provider.createOrder({
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    amount: booking.total,
    currency: "INR",
    customerName: booking.customer.name,
    customerPhone: booking.customer.phone,
    customerEmail: booking.customer.email || undefined,
    venueName: booking.venue.name,
  });

  if (!orderResult.success || !orderResult.orderId) {
    return {
      success: false,
      error: orderResult.error || "Failed to create payment order with provider.",
    };
  }

  // Update payment record with providerOrderId
  await db.payment.updateMany({
    where: { bookingId: booking.id },
    data: {
      provider: provider.id,
      providerOrderId: orderResult.orderId,
      status: "pending",
    },
  });

  return {
    success: true,
    orderId: orderResult.orderId,
    paymentUrl: orderResult.paymentUrl,
    provider: provider.id,
  };
}

export interface WebhookProcessResult {
  success: boolean;
  message: string;
  duplicate?: boolean;
  bookingId?: string;
  error?: string;
}

/**
 * Processes incoming payment webhooks idempotently.
 * Never confirms a booking more than once, even under duplicate requests.
 */
export async function processPaymentWebhook(
  providerId: string,
  body: any,
  headers: Record<string, string>
): Promise<WebhookProcessResult> {
  const provider = getPaymentProvider(providerId);

  // Parse webhook payload
  const webhookResult = await provider.parseWebhook(body, headers);

  if (!webhookResult.valid) {
    return {
      success: false,
      message: "Invalid webhook signature",
      error: webhookResult.error || "Signature verification failed",
    };
  }

  const eventId = webhookResult.eventId;

  // 1. Idempotency Check: check if eventId was already processed
  const existingEvent = await db.paymentEvent.findUnique({
    where: { eventId },
  });

  if (existingEvent && existingEvent.processed) {
    return {
      success: true,
      duplicate: true,
      message: "Webhook event already processed previously.",
    };
  }

  // 2. Find associated Payment and Booking by orderId
  const payment = await db.payment.findFirst({
    where: {
      OR: [
        { providerOrderId: webhookResult.orderId },
        { booking: { bookingNumber: webhookResult.orderId } },
      ],
    },
    include: { booking: true },
  });

  if (!payment || !payment.booking) {
    // Record event as unmapped for inspection
    await db.paymentEvent.upsert({
      where: { eventId },
      update: { error: "No matching order found for orderId: " + webhookResult.orderId },
      create: {
        businessId: "global",
        provider: provider.id,
        eventId,
        eventType: webhookResult.eventType,
        payload: JSON.stringify(body),
        signatureValid: true,
        processed: false,
        error: "No matching order found for orderId: " + webhookResult.orderId,
      },
    });

    return {
      success: false,
      message: "Booking for payment order could not be resolved.",
      error: "Order not found",
    };
  }

  const businessId = payment.businessId;

  // 3. Record or update PaymentEvent
  await db.paymentEvent.upsert({
    where: { eventId },
    update: { processed: false },
    create: {
      businessId,
      provider: provider.id,
      eventId,
      eventType: webhookResult.eventType,
      payload: JSON.stringify(body),
      signatureValid: true,
      processed: false,
    },
  });

  // 4. Process payment status update
  if (webhookResult.status === "successful") {
    await confirmBookingPayment({
      bookingId: payment.bookingId,
      provider: provider.id,
      providerPaymentId: webhookResult.paymentId,
      providerOrderId: webhookResult.orderId,
      notes: `Webhook confirmation (${webhookResult.eventType})`,
    });

    // Mark event as processed
    await db.paymentEvent.update({
      where: { eventId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Payment confirmed and booking activated.",
      bookingId: payment.bookingId,
    };
  } else {
    // Mark payment as failed
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
        notes: `Webhook payment failure: ${webhookResult.error || "Failed"}`,
      },
    });

    await db.paymentEvent.update({
      where: { eventId },
      data: {
        processed: true,
        processedAt: new Date(),
        error: "Payment failed via gateway webhook",
      },
    });

    return {
      success: true,
      message: "Payment marked as failed.",
      bookingId: payment.bookingId,
    };
  }
}
