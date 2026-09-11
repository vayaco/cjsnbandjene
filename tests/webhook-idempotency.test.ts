import { PrismaClient } from "@prisma/client";
import { createBooking } from "../src/lib/booking-engine";
import { processPaymentWebhook } from "../src/lib/payment/service";
import { getBookingCalendarWindow } from "../src/lib/availability";

const prisma = new PrismaClient();

async function runWebhookIdempotencyTest() {
  console.log("==================================================");
  console.log("STARTING WEBHOOK IDEMPOTENCY TEST");
  console.log("==================================================");

  const business = await prisma.business.findFirst();
  if (!business) {
    throw new Error("No business record found in database.");
  }

  const testVenue = await prisma.venue.upsert({
    where: { slug: "test-webhook-venue" },
    update: {},
    create: {
      businessId: business.id,
      name: "Webhook Test Venue",
      slug: "test-webhook-venue",
      code: "WH",
      address: "456 Gateway Lane",
      city: "Mumbai",
      openTime: "06:00",
      closeTime: "23:00",
    },
  });

  const testCourt = await prisma.resource.upsert({
    where: { id: "test_webhook_court_1" },
    update: {},
    create: {
      id: "test_webhook_court_1",
      businessId: business.id,
      venueId: testVenue.id,
      name: "Court A",
      resourceType: "court",
      capacity: 4,
      defaultPrice: 700,
    },
  });

  const window = getBookingCalendarWindow("Asia/Kolkata");
  const testDate = window.allowedDates[1];
  const testStartTime = "16:00";
  const testEndTime = "17:00";

  // Clean up any old booking for this slot
  await prisma.notification.deleteMany({ where: { booking: { resourceId: testCourt.id, dateStr: testDate } } });
  await prisma.bookingAccessToken.deleteMany({ where: { booking: { resourceId: testCourt.id, dateStr: testDate } } });
  await prisma.payment.deleteMany({ where: { booking: { resourceId: testCourt.id, dateStr: testDate } } });
  await prisma.booking.deleteMany({ where: { resourceId: testCourt.id, dateStr: testDate } });

  // Create an initial booking in payment_pending status
  const bookingResult = await createBooking({
    venueId: testVenue.id,
    resourceId: testCourt.id,
    dateStr: testDate,
    startTimeStr: testStartTime,
    endTimeStr: testEndTime,
    customerName: "Sanjay Singhania",
    customerPhone: "9820099887",
    customerEmail: "sanjay.singhania@example.com",
    paymentMethod: "upi",
    paymentProvider: "test",
    status: "payment_pending",
    paymentStatus: "pending",
  });

  if (!bookingResult.success || !bookingResult.booking) {
    throw new Error(`Failed to create test booking: ${bookingResult.error}`);
  }

  const booking = bookingResult.booking;
  const initialCustomerId = booking.customerId;

  // Set provider orderId
  const testOrderId = `order_${booking.bookingNumber}`;
  await prisma.payment.updateMany({
    where: { bookingId: booking.id },
    data: { providerOrderId: testOrderId },
  });

  const initialCustomer = await prisma.customer.findUnique({
    where: { id: initialCustomerId },
  });
  const initialBookingsCount = initialCustomer?.totalBookings || 0;
  const initialSpend = initialCustomer?.totalSpend || 0;

  console.log(`Created pending booking: ${booking.bookingNumber} with order ID: ${testOrderId}`);
  console.log(`Initial Customer stats: Bookings: ${initialBookingsCount}, Spend: ${initialSpend}`);

  // Construct simulated webhook payload
  const webhookEventId = `evt_success_${Date.now()}`;
  const webhookBody = {
    eventId: webhookEventId,
    orderId: testOrderId,
    paymentId: `pay_${Date.now()}`,
    amount: 700,
    status: "SUCCESS",
  };

  console.log("Sending Webhook Attempt 1...");
  const res1 = await processPaymentWebhook("test", webhookBody, {});
  console.log("Attempt 1 result:", res1);

  if (!res1.success || res1.duplicate) {
    throw new Error("Attempt 1 failed to process properly");
  }

  // Verify booking was confirmed
  const bookingAfter1 = await prisma.booking.findUnique({
    where: { id: booking.id },
  });
  if (bookingAfter1?.status !== "confirmed" || bookingAfter1?.paymentStatus !== "successful") {
    throw new Error("Booking was not properly marked confirmed on attempt 1!");
  }

  // Send the EXACT SAME webhook 4 more times
  for (let i = 2; i <= 5; i++) {
    console.log(`Sending Duplicate Webhook Attempt ${i}...`);
    const res = await processPaymentWebhook("test", webhookBody, {});
    console.log(`Attempt ${i} result:`, res);

    if (!res.duplicate) {
      throw new Error(`Attempt ${i} should have been recognized as duplicate, but was not!`);
    }
  }

  // Verify Customer stats were incremented exactly ONCE
  const finalCustomer = await prisma.customer.findUnique({
    where: { id: initialCustomerId },
  });

  const finalPaymentsCount = await prisma.payment.count({
    where: { bookingId: booking.id },
  });

  console.log(`Final Customer stats: Bookings: ${finalCustomer?.totalBookings}, Spend: ${finalCustomer?.totalSpend}`);
  console.log(`Final Payment records for this booking: ${finalPaymentsCount}`);

  if (finalCustomer?.totalBookings !== initialBookingsCount + 1) {
    throw new Error(
      `CRITICAL METRIC FAILURE: Customer totalBookings was incremented incorrectly! Expected ${initialBookingsCount + 1}, got ${finalCustomer?.totalBookings}`
    );
  }

  if (finalPaymentsCount !== 1) {
    throw new Error(
      `CRITICAL INTEGRITY FAILURE: Expected exactly 1 payment record, found ${finalPaymentsCount}!`
    );
  }

  // Cleanup
  await prisma.paymentEvent.deleteMany({ where: { eventId: webhookEventId } });
  await prisma.payment.deleteMany({ where: { bookingId: booking.id } });
  await prisma.booking.deleteMany({ where: { id: booking.id } });
  await prisma.resource.deleteMany({ where: { id: testCourt.id } });
  await prisma.venue.deleteMany({ where: { id: testVenue.id } });

  console.log("==================================================");
  console.log("WEBHOOK IDEMPOTENCY TEST PASSED: 100% IDEMPOTENT!");
  console.log("==================================================");
}

runWebhookIdempotencyTest()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
