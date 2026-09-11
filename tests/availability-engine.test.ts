import { PrismaClient } from "@prisma/client";
import { getVenueAvailability, getBookingCalendarWindow } from "../src/lib/availability";
import { createBooking, cancelBooking } from "../src/lib/booking-engine";
import { createSlotHold } from "../src/lib/slot-hold";

const prisma = new PrismaClient();

async function runAvailabilityEngineTest() {
  console.log("==================================================");
  console.log("STARTING AVAILABILITY ENGINE TEST");
  console.log("==================================================");

  const business = await prisma.business.findFirst();
  if (!business) {
    throw new Error("No business record found in database.");
  }

  const testVenue = await prisma.venue.upsert({
    where: { slug: "test-avail-venue" },
    update: {},
    create: {
      businessId: business.id,
      name: "Availability Test Facility",
      slug: "test-avail-venue",
      code: "AF",
      address: "789 Shuttle Court",
      city: "Mumbai",
      openTime: "06:00",
      closeTime: "23:00",
    },
  });

  const courtActive = await prisma.resource.upsert({
    where: { id: "test_avail_court_active" },
    update: { status: "active" },
    create: {
      id: "test_avail_court_active",
      businessId: business.id,
      venueId: testVenue.id,
      name: "Main Court 1",
      resourceType: "court",
      capacity: 4,
      defaultPrice: 500,
      status: "active",
    },
  });

  const courtMaintenance = await prisma.resource.upsert({
    where: { id: "test_avail_court_maint" },
    update: { status: "maintenance" },
    create: {
      id: "test_avail_court_maint",
      businessId: business.id,
      venueId: testVenue.id,
      name: "Court 2 (Under Repair)",
      resourceType: "court",
      capacity: 4,
      defaultPrice: 500,
      status: "maintenance",
    },
  });

  const window = getBookingCalendarWindow("Asia/Kolkata");
  const testDate = window.allowedDates[2];

  // Clean up any old bookings on testVenue for this date
  await prisma.notification.deleteMany({ where: { booking: { venueId: testVenue.id, dateStr: testDate } } });
  await prisma.bookingAccessToken.deleteMany({ where: { booking: { venueId: testVenue.id, dateStr: testDate } } });
  await prisma.payment.deleteMany({ where: { booking: { venueId: testVenue.id, dateStr: testDate } } });
  await prisma.booking.deleteMany({ where: { venueId: testVenue.id, dateStr: testDate } });
  await prisma.slotHold.deleteMany({ where: { resource: { venueId: testVenue.id } } });

  // 1. Check Maintenance Court
  console.log("Checking maintenance court slots...");
  const availInitial = await getVenueAvailability(testVenue.id, testDate);
  const maintResource = availInitial.resources.find((r) => r.resourceId === courtMaintenance.id);
  const allMaintBlocked = maintResource?.slots.every((s) => s.status === "blocked");

  if (!allMaintBlocked) {
    throw new Error("Maintenance court slots were not all marked as blocked!");
  }
  console.log("PASS: Court under maintenance is correctly marked blocked for all slots.");

  // 2. Book a slot and verify it becomes 'booked'
  console.log("Booking 10:00 slot on Main Court 1...");
  const bookingRes = await createBooking({
    venueId: testVenue.id,
    resourceId: courtActive.id,
    dateStr: testDate,
    startTimeStr: "10:00",
    endTimeStr: "11:00",
    customerName: "Pooja Verma",
    customerPhone: "9820011223",
    customerEmail: "pooja.verma@example.com",
    paymentMethod: "cash",
  });

  if (!bookingRes.success || !bookingRes.booking) {
    throw new Error("Failed to create booking for test");
  }

  const availAfterBooking = await getVenueAvailability(testVenue.id, testDate);
  const activeRes = availAfterBooking.resources.find((r) => r.resourceId === courtActive.id);
  const slot10 = activeRes?.slots.find((s) => s.startTime === "10:00");

  if (slot10?.status !== "booked") {
    throw new Error(`Expected 10:00 slot to be 'booked', but got '${slot10?.status}'!`);
  }
  console.log("PASS: Booked slot is accurately identified as 'booked'.");

  // 3. Hold a slot and verify it becomes 'held'
  console.log("Holding 14:00 slot on Main Court 1 for 10 minutes...");
  const holdRes = await createSlotHold({
    venueId: testVenue.id,
    resourceId: courtActive.id,
    dateStr: testDate,
    startTimeStr: "14:00",
    endTimeStr: "15:00",
    customerName: "Rahul Dravid",
    customerPhone: "9820055443",
    holdMinutes: 10,
  });

  if (!holdRes.success) {
    throw new Error(`Failed to hold slot: ${holdRes.error}`);
  }

  // Query availability as another user (no holdToken)
  const availAfterHold = await getVenueAvailability(testVenue.id, testDate);
  const activeResAfterHold = availAfterHold.resources.find((r) => r.resourceId === courtActive.id);
  const slot14 = activeResAfterHold?.slots.find((s) => s.startTime === "14:00");

  if (slot14?.status !== "held") {
    throw new Error(`Expected 14:00 slot to be 'held', but got '${slot14?.status}'!`);
  }
  console.log("PASS: Active slot hold is accurately identified as 'held'.");

  // 4. Cancel the booking and verify slot re-opens to 'available'
  console.log("Cancelling 10:00 booking and checking slot re-opens...");
  const cancelRes = await cancelBooking(bookingRes.booking.id, "Test cancellation");
  if (!cancelRes.success) {
    throw new Error("Failed to cancel booking");
  }

  const availAfterCancel = await getVenueAvailability(testVenue.id, testDate);
  const activeResAfterCancel = availAfterCancel.resources.find((r) => r.resourceId === courtActive.id);
  const slot10Reopened = activeResAfterCancel?.slots.find((s) => s.startTime === "10:00");

  if (slot10Reopened?.status !== "available") {
    throw new Error(`Expected cancelled slot to re-open as 'available', but got '${slot10Reopened?.status}'!`);
  }
  console.log("PASS: Cancelled booking immediately returns slot to 'available'.");

  // 5. Cleanup test data
  if (holdRes.holdToken) {
    await prisma.slotHold.deleteMany({ where: { holdToken: holdRes.holdToken } });
  }
  await prisma.payment.deleteMany({ where: { bookingId: bookingRes.booking.id } });
  await prisma.booking.deleteMany({ where: { id: bookingRes.booking.id } });
  await prisma.resource.deleteMany({ where: { venueId: testVenue.id } });
  await prisma.venue.deleteMany({ where: { id: testVenue.id } });

  console.log("==================================================");
  console.log("AVAILABILITY ENGINE TEST PASSED: 100% ACCURATE!");
  console.log("==================================================");
}

runAvailabilityEngineTest()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
