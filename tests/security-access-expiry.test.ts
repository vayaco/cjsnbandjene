import { PrismaClient } from "@prisma/client";
import { getBookingCalendarWindow, validateBookingDateInWindow } from "../src/lib/availability";
import { createBooking } from "../src/lib/booking-engine";
import { createSlotHold } from "../src/lib/slot-hold";
import {
  createBookingAccessTokens,
  validateAccessToken,
  ACCESS_TOKEN_EXPIRY_MS,
  hashToken,
} from "../src/lib/access-token";
import { generateBookingInvoicePdf } from "../src/lib/invoice/pdf-service";
import { sendBookingConfirmationNotification } from "../src/lib/notification/notification-service";

const prisma = new PrismaClient();

async function runSecurityAccessExpiryTests() {
  console.log("==================================================");
  console.log("STARTING SECURITY, ACCESS EXPIRY & RETENTION TESTS");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. 7-Day Booking Window Boundary Tests
  console.log("\n--- TEST SUITE 1: 7-DAY BOOKING WINDOW BOUNDARY CHECKS ---");
  const windowInfo = getBookingCalendarWindow("Asia/Kolkata");
  assert(windowInfo.allowedDates.length === 7, "Window contains exactly 7 calendar dates");
  assert(windowInfo.allowedDates[0] === windowInfo.bookingWindowStart, "Window starts on today");
  assert(windowInfo.allowedDates[6] === windowInfo.bookingWindowEnd, "Window ends on today + 6 days");

  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const todayStr = formatDate(today);
  const day6 = new Date(today);
  day6.setDate(day6.getDate() + 6);
  const day6Str = formatDate(day6);

  const day7 = new Date(today);
  day7.setDate(day7.getDate() + 7);
  const day7Str = formatDate(day7);

  const day30 = new Date(today);
  day30.setDate(day30.getDate() + 30);
  const day30Str = formatDate(day30);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  assert(validateBookingDateInWindow(todayStr).valid === true, "Today is valid in 7-day window");
  assert(validateBookingDateInWindow(day6Str).valid === true, "Today + 6 days is valid in 7-day window");
  assert(validateBookingDateInWindow(day7Str).valid === false, "Today + 7 days is rejected (outside window)");
  assert(validateBookingDateInWindow(day30Str).valid === false, "Today + 30 days is rejected (outside window)");
  assert(validateBookingDateInWindow(yesterdayStr).valid === false, "Yesterday is rejected (past date)");

  // Setup test facility in database
  const business = await prisma.business.findFirst();
  if (!business) {
    throw new Error("No business record in database.");
  }

  const venue = await prisma.venue.upsert({
    where: { slug: "test-sec-venue" },
    update: {},
    create: {
      businessId: business.id,
      name: "Security Test Center",
      slug: "test-sec-venue",
      code: "ST",
      address: "100 Security Boulevard",
      city: "Mumbai",
      openTime: "06:00",
      closeTime: "23:00",
    },
  });

  const resource = await prisma.resource.upsert({
    where: { id: "test_sec_resource" },
    update: { status: "active" },
    create: {
      id: "test_sec_resource",
      businessId: business.id,
      venueId: venue.id,
      name: "Test Secure Court 1",
      resourceType: "court",
      capacity: 4,
      defaultPrice: 600,
      status: "active",
    },
  });

  // Test slot hold rejection beyond 7-day window
  const holdRes = await createSlotHold({
    venueId: venue.id,
    resourceId: resource.id,
    dateStr: day7Str,
    startTimeStr: "10:00",
    endTimeStr: "11:00",
    customerPhone: "9876543210",
    customerName: "Test Outside",
  });
  assert(holdRes.success === false, "Hold on date outside 7-day window must be rejected");
  assert(
    holdRes.error?.includes("no longer available") || holdRes.error?.includes("window"),
    "Hold rejected with 7-day booking window violation message"
  );

  // 2. Compulsory Customer Email Validation
  console.log("\n--- TEST SUITE 2: COMPULSORY CUSTOMER EMAIL ENFORCEMENT ---");
  const noEmailResult = await createBooking({
    venueId: venue.id,
    resourceId: resource.id,
    dateStr: day6Str,
    startTimeStr: "14:00",
    endTimeStr: "15:00",
    customerName: "Test No Email",
    customerPhone: "9876543210",
    customerEmail: "",
    paymentMethod: "online",
    createdBy: "customer",
  });
  assert(noEmailResult.success === false, "createBooking without email must be rejected");
  assert(
    noEmailResult.error?.includes("email") || noEmailResult.error?.includes("invoice"),
    "Booking rejected when customer email is empty"
  );

  // 3. Successful Booking with Tokens
  console.log("\n--- TEST SUITE 3: CRYPTOGRAPHIC 256-BIT TOKEN GENERATION & STORAGE ---");
  // Clean up any existing bookings on the test resource to avoid collision on repeated runs
  await prisma.notification.deleteMany({ where: { booking: { resourceId: resource.id } } });
  await prisma.bookingAccessToken.deleteMany({ where: { booking: { resourceId: resource.id } } });
  await prisma.payment.deleteMany({ where: { booking: { resourceId: resource.id } } });
  await prisma.booking.deleteMany({ where: { resourceId: resource.id } });
  await prisma.slotHold.deleteMany({ where: { resourceId: resource.id } });
  const bookingResult = await createBooking({
    venueId: venue.id,
    resourceId: resource.id,
    dateStr: day6Str,
    startTimeStr: "14:00",
    endTimeStr: "15:00",
    customerName: "Aditi Sharma",
    customerPhone: "9876543211",
    customerEmail: "aditi.sharma@example.com",
    paymentMethod: "online",
    createdBy: "customer",
  });

  assert(bookingResult.success === true, "Booking record successfully created");
  const booking = bookingResult.booking!;
  const rawBookingToken = bookingResult.rawBookingToken!;
  const rawInvoiceToken = bookingResult.rawInvoiceToken!;

  assert(!!booking && !!booking.id, "Booking record has valid ID");
  assert(!!rawBookingToken, "Customer access token returned");
  assert(!!rawInvoiceToken, "Invoice access token returned");
  assert(rawBookingToken.length === 64, "Customer access token has 64 hex characters (256 bits)");
  assert(rawInvoiceToken.length === 64, "Invoice access token has 64 hex characters (256 bits)");

  // Verify raw token is NOT in database, only SHA-256 hash
  const rawTokenHash = hashToken(rawBookingToken);
  const tokenInDb = await prisma.bookingAccessToken.findUnique({
    where: { tokenHash: rawTokenHash },
  });
  assert(!!tokenInDb, "Token found in database by SHA-256 hash");
  assert(tokenInDb?.tokenHash === rawTokenHash, "Stored value is the cryptographic hash");
  assert(tokenInDb?.purpose === "customer_access", "Purpose correctly recorded as customer_access");

  // 4. Token Validation & 7-Day Expiry
  console.log("\n--- TEST SUITE 4: TOKEN VALIDATION & 7-DAY EXPIRATION ---");
  const validationActive = await validateAccessToken(rawBookingToken, "customer_access");
  assert(validationActive.valid === true, "Unexpired access token validates successfully");

  // Simulate expiry by updating expiresAt to yesterday in DB
  const pastExpiry = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
  await prisma.bookingAccessToken.update({
    where: { id: tokenInDb!.id },
    data: { expiresAt: pastExpiry },
  });

  const validationExpired = await validateAccessToken(rawBookingToken, "customer_access");
  assert(validationExpired.valid === false, "Expired access token is rejected");
  if (!validationExpired.valid) {
    assert(validationExpired.error === "expired", "Error code is specifically 'expired'");
  }

  // 5. Zero Data Deletion Guarantee on Expiry
  console.log("\n--- TEST SUITE 5: ZERO DATA DELETION GUARANTEE ---");
  const bookingAfterExpiry = await prisma.booking.findUnique({
    where: { id: booking.id },
  });
  assert(!!bookingAfterExpiry, "Booking record remains in database after token expiry (ZERO deletion)");

  const customerAfterExpiry = await prisma.customer.findUnique({
    where: { id: booking.customerId },
  });
  assert(!!customerAfterExpiry, "Customer record remains in database after token expiry");

  const paymentAfterExpiry = await prisma.payment.findFirst({
    where: { bookingId: booking.id },
  });
  assert(!!paymentAfterExpiry, "Payment record remains in database after token expiry");

  const tokenAfterExpiry = await prisma.bookingAccessToken.findUnique({
    where: { tokenHash: rawTokenHash },
  });
  assert(!!tokenAfterExpiry, "Token record remains in database (audit retention preserved)");

  // 6. Admin Permanent Retention & Invoice Generation
  console.log("\n--- TEST SUITE 6: ADMIN RETENTION & INTERNAL PDF GENERATION ---");
  const pdfBuffer = await generateBookingInvoicePdf({
    bookingNumber: booking.bookingNumber,
    bookingDateStr: booking.dateStr,
    startTimeStr: booking.startTimeStr,
    endTimeStr: booking.endTimeStr,
    total: booking.total,
    subtotal: booking.subtotal,
    tax: booking.tax,
    paymentStatus: booking.paymentStatus,
    paymentMethod: booking.paymentMethod,
    createdAt: booking.createdAt,
    customer: {
      name: "Aditi Sharma",
      phone: "9876543211",
      email: "aditi.sharma@example.com",
    },
    venue: {
      name: venue.name,
      address: venue.address,
      city: venue.city,
    },
    resource: {
      name: resource.name,
      resourceType: resource.resourceType,
    },
  });

  assert(Buffer.isBuffer(pdfBuffer), "Invoice generated as a Node.js Buffer");
  assert(pdfBuffer.length > 500, `PDF size is realistic (${pdfBuffer.length} bytes)`);
  const pdfHeader = pdfBuffer.slice(0, 5).toString("utf-8");
  assert(pdfHeader === "%PDF-", `PDF contains valid '%PDF-' magic bytes header: ${pdfHeader}`);

  // 7. Idempotent Notification Delivery
  console.log("\n--- TEST SUITE 7: IDEMPOTENT NOTIFICATION SYSTEM ---");
  const notifResult1 = await sendBookingConfirmationNotification(booking.id, rawInvoiceToken);
  assert(notifResult1.success === true, "First notification dispatch succeeds");

  const notifResult2 = await sendBookingConfirmationNotification(booking.id, rawInvoiceToken);
  assert(notifResult2.success === true, "Second notification dispatch returns success");
  assert(notifResult2.reason === "already_sent", "Second notification correctly detected existing sent record (idempotency enforced)");

  const notifCount = await prisma.notification.count({
    where: { bookingId: booking.id },
  });
  assert(notifCount === 1, `Exactly 1 notification record exists in database (found: ${notifCount})`);

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityAccessExpiryTests()
  .catch((err) => {
    console.error("FATAL ERROR IN SECURITY TESTS:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
