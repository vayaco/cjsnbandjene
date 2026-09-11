import { PrismaClient } from "@prisma/client";
import { createBooking } from "../src/lib/booking-engine";
import { getBookingCalendarWindow } from "../src/lib/availability";

const prisma = new PrismaClient();

async function runConcurrencyTest() {
  console.log("==================================================");
  console.log("STARTING CONCURRENCY DOUBLE-BOOKING STRESS TEST");
  console.log("==================================================");

  // 1. Setup test venue and court
  const business = await prisma.business.findFirst();
  if (!business) {
    throw new Error("No business record found in database.");
  }

  const testVenue = await prisma.venue.upsert({
    where: { slug: "test-concurrency-venue" },
    update: {},
    create: {
      businessId: business.id,
      name: "Concurrency Test Arena",
      slug: "test-concurrency-venue",
      code: "CT",
      address: "123 Test Street",
      city: "Mumbai",
      openTime: "06:00",
      closeTime: "23:00",
      slotDurationMinutes: 60,
    },
  });

  const testCourt = await prisma.resource.upsert({
    where: { id: "test_concurrency_court_1" },
    update: { status: "active" },
    create: {
      id: "test_concurrency_court_1",
      businessId: business.id,
      venueId: testVenue.id,
      name: "Court 1",
      resourceType: "court",
      capacity: 4,
      defaultPrice: 600,
      status: "active",
    },
  });

  const window = getBookingCalendarWindow("Asia/Kolkata");
  const testDate = window.allowedDates[4];
  const testStartTime = "19:00";
  const testEndTime = "20:00";

  // Clean up any previous test booking for this specific slot
  await prisma.notification.deleteMany({ where: { booking: { resourceId: testCourt.id, dateStr: testDate } } });
  await prisma.bookingAccessToken.deleteMany({ where: { booking: { resourceId: testCourt.id, dateStr: testDate } } });
  await prisma.payment.deleteMany({ where: { booking: { resourceId: testCourt.id, dateStr: testDate } } });
  await prisma.booking.deleteMany({
    where: {
      resourceId: testCourt.id,
      dateStr: testDate,
      startTimeStr: testStartTime,
    },
  });

  console.log(`Testing with 10 concurrent requests for Court 1 at ${testStartTime} on ${testDate}...`);

  // 2. Fire 10 simultaneous booking attempts
  const CONCURRENT_REQUESTS = 10;
  const promises = [];

  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    const customerName = `Contender ${i + 1}`;
    const customerPhone = `982001122${i}`;
    const customerEmail = `contender${i + 1}@example.com`;

    promises.push(
      createBooking({
        venueId: testVenue.id,
        resourceId: testCourt.id,
        dateStr: testDate,
        startTimeStr: testStartTime,
        endTimeStr: testEndTime,
        customerName,
        customerPhone,
        customerEmail,
        paymentMethod: "upi",
        createdBy: "customer",
      })
    );
  }

  const results = await Promise.all(promises);

  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);

  console.log(`Results: ${successes.length} succeeded, ${failures.length} rejected.`);

  failures.forEach((f, idx) => {
    console.log(`Rejection ${idx + 1}: ${f.error}`);
  });

  // 3. Database verification
  const dbBookings = await prisma.booking.findMany({
    where: {
      resourceId: testCourt.id,
      dateStr: testDate,
      startTimeStr: testStartTime,
      status: { in: ["confirmed", "payment_pending"] },
    },
  });

  console.log(`Database records for this slot: ${dbBookings.length}`);

  // 4. Assertions
  if (successes.length !== 1) {
    throw new Error(
      `CRITICAL FAILURE: Expected exactly 1 booking to succeed, but ${successes.length} succeeded!`
    );
  }

  if (failures.length !== CONCURRENT_REQUESTS - 1) {
    throw new Error(
      `CRITICAL FAILURE: Expected ${CONCURRENT_REQUESTS - 1} failures, but got ${failures.length}!`
    );
  }

  if (dbBookings.length !== 1) {
    throw new Error(
      `CRITICAL INTEGRITY FAILURE: Database has ${dbBookings.length} bookings for the exact same slot!`
    );
  }

  // 5. Cleanup test bookings
  await prisma.payment.deleteMany({ where: { bookingId: dbBookings[0].id } });
  await prisma.booking.deleteMany({ where: { id: dbBookings[0].id } });
  await prisma.resource.deleteMany({ where: { id: testCourt.id } });
  await prisma.venue.deleteMany({ where: { id: testVenue.id } });

  console.log("==================================================");
  console.log("CONCURRENCY TEST PASSED: ZERO DOUBLE BOOKINGS GUARANTEED!");
  console.log("==================================================");
}

runConcurrencyTest()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
