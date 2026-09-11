import { PrismaClient } from "@prisma/client";
import {
  allocateBookingNumber,
  formatBookingCode,
  parseBookingCode,
  getBookingLookupCandidates,
} from "../src/lib/booking-number";
import { createBooking } from "../src/lib/booking-engine";

const prisma = new PrismaClient();

async function runBookingSequenceConcurrencyTest() {
  console.log("==================================================");
  console.log("STARTING BOOKING SEQUENCE ARCHITECTURE TEST");
  console.log("==================================================");

  // ----------------------------------------------------
  // TEST 1: Unit tests for formatting and parsing
  // ----------------------------------------------------
  console.log("\n[TEST 1] Testing formatBookingCode and parseBookingCode...");

  const formatCases = [
    { input: 101, expected: "NA000101" },
    { input: 102, expected: "NA000102" },
    { input: 999, expected: "NA000999" },
    { input: 1000, expected: "NA001000" },
    { input: 999999, expected: "NA999999" },
    { input: 1000000, expected: "NA1000000" }, // Natural growth beyond 6 digits
    { input: 1000001, expected: "NA1000001" },
  ];

  for (const tc of formatCases) {
    const formatted = formatBookingCode(tc.input);
    if (formatted !== tc.expected) {
      throw new Error(`Format mismatch for ${tc.input}: expected ${tc.expected}, got ${formatted}`);
    }
    const parsed = parseBookingCode(formatted);
    if (parsed !== tc.input) {
      throw new Error(`Parse mismatch for ${formatted}: expected ${tc.input}, got ${parsed}`);
    }
  }
  console.log("PASSED: formatBookingCode correctly produces NA000101 format and handles unbounded growth.");

  // ----------------------------------------------------
  // TEST 2: Testing Candidate Normalizer
  // ----------------------------------------------------
  console.log("\n[TEST 2] Testing getBookingLookupCandidates...");

  const testInputs = [
    { input: "NA000101", mustContain: "NA000101" },
    { input: "na000101", mustContain: "NA000101" },
    { input: "NA-000101", mustContain: "NA000101" },
    { input: "101", mustContain: "NA000101" },
    { input: "NA101", mustContain: "NA000101" },
  ];

  for (const tc of testInputs) {
    const candidates = getBookingLookupCandidates(tc.input);
    if (!candidates.includes(tc.mustContain)) {
      throw new Error(`Lookup candidate mismatch for "${tc.input}": expected candidates to contain ${tc.mustContain}, got: ${JSON.stringify(candidates)}`);
    }
  }
  console.log("PASSED: Candidate normalizer handles NA000101, lowercase, hyphens, and raw numbers.");

  // ----------------------------------------------------
  // TEST 3: 100 Simultaneous Allocations Concurrency Test
  // ----------------------------------------------------
  console.log("\n[TEST 3] Stress testing 100 simultaneous allocations from database sequence...");

  // Inspect sequence state before test
  const seqBefore = await prisma.bookingSequence.findUnique({ where: { id: "global" } });
  const startSeq = seqBefore ? seqBefore.nextValue : 101;
  console.log(`Initial sequence state in database: nextValue = ${startSeq}`);

  const CONCURRENCY_COUNT = 100;
  const startTime = Date.now();

  // Launch 100 concurrent promises at the exact same instant
  const allocationPromises = Array.from({ length: CONCURRENCY_COUNT }, (_, i) =>
    allocateBookingNumber()
  );

  const results = await Promise.all(allocationPromises);
  const elapsed = Date.now() - startTime;
  console.log(`Executed ${CONCURRENCY_COUNT} concurrent allocations in ${elapsed}ms`);

  // Verify all 100 returned valid results
  if (results.length !== CONCURRENCY_COUNT) {
    throw new Error(`Expected ${CONCURRENCY_COUNT} results, got ${results.length}`);
  }

  const sequenceNumbers = results.map((r) => r.sequenceNumber);
  const bookingCodes = results.map((r) => r.bookingCode);

  // Invariant 1 & 2: Every booking code must be unique (zero duplicates)
  const uniqueCodes = new Set(bookingCodes);
  if (uniqueCodes.size !== CONCURRENCY_COUNT) {
    throw new Error(`DUPLICATE CODES DETECTED! Expected ${CONCURRENCY_COUNT} unique codes, but got ${uniqueCodes.size}`);
  }

  const uniqueSeqs = new Set(sequenceNumbers);
  if (uniqueSeqs.size !== CONCURRENCY_COUNT) {
    throw new Error(`DUPLICATE SEQUENCE NUMBERS DETECTED! Expected ${CONCURRENCY_COUNT} unique sequences, but got ${uniqueSeqs.size}`);
  }

  // Verify format of all 100 codes
  for (const code of bookingCodes) {
    if (!/^NA\d{6,}$/.test(code)) {
      throw new Error(`Malformed booking code generated: ${code}`);
    }
  }

  // Sort sequences to verify continuity
  sequenceNumbers.sort((a, b) => a - b);
  const minSeq = sequenceNumbers[0];
  const maxSeq = sequenceNumbers[sequenceNumbers.length - 1];

  console.log(`Allocated sequence range: ${minSeq} to ${maxSeq}`);
  console.log(`First code in range: ${formatBookingCode(minSeq)}`);
  console.log(`Last code in range: ${formatBookingCode(maxSeq)}`);

  // Verify monotonic continuity (no gaps within the batch)
  for (let i = 0; i < sequenceNumbers.length; i++) {
    const expected = minSeq + i;
    if (sequenceNumbers[i] !== expected) {
      throw new Error(`Sequence gap or disorder at index ${i}: expected ${expected}, got ${sequenceNumbers[i]}`);
    }
  }

  // Verify database persisted state matches maxSeq + 1
  const seqAfter = await prisma.bookingSequence.findUnique({ where: { id: "global" } });
  if (!seqAfter || seqAfter.nextValue !== maxSeq + 1) {
    throw new Error(`Database sequence state corruption: expected nextValue to be ${maxSeq + 1}, got ${seqAfter?.nextValue}`);
  }

  console.log(`PASSED: 100/100 allocations succeeded with 0 duplicates, 0 gaps, and perfect database state.`);

  // ----------------------------------------------------
  // TEST 4: End-to-End Booking Creation and Identity Invariants
  // ----------------------------------------------------
  console.log("\n[TEST 4] Testing end-to-end booking creation with allocateBookingNumber...");

  const business = await prisma.business.findFirst();
  if (!business) {
    throw new Error("No business found in database.");
  }

  const venue = await prisma.venue.findFirst({
    where: { businessId: business.id },
    include: { resources: true },
  });

  if (!venue || venue.resources.length === 0) {
    throw new Error("No venue or court found in database.");
  }

  const court = venue.resources[0];

  // Clean slot for test
  const testDate = "2026-11-20";
  await prisma.booking.deleteMany({
    where: { resourceId: court.id, dateStr: testDate },
  });

  const b1Result = await createBooking({
    venueId: venue.id,
    resourceId: court.id,
    dateStr: testDate,
    startTimeStr: "14:00",
    endTimeStr: "15:00",
    customerName: "Alice Walker",
    customerPhone: "+919811122233",
    status: "confirmed",
    paymentStatus: "successful",
  });

  if (!b1Result.success || !b1Result.booking) {
    throw new Error(`Failed to create booking 1: ${b1Result.error}`);
  }

  const b2Result = await createBooking({
    venueId: venue.id,
    resourceId: court.id,
    dateStr: testDate,
    startTimeStr: "15:00",
    endTimeStr: "16:00",
    customerName: "Bob Smith",
    customerPhone: "+919822233344",
    status: "confirmed",
    paymentStatus: "successful",
  });

  if (!b2Result.success || !b2Result.booking) {
    throw new Error(`Failed to create booking 2: ${b2Result.error}`);
  }

  console.log(`Created booking 1: ID = ${b1Result.booking.id}, Code = ${b1Result.booking.bookingNumber}`);
  console.log(`Created booking 2: ID = ${b2Result.booking.id}, Code = ${b2Result.booking.bookingNumber}`);

  const b1Seq = parseBookingCode(b1Result.booking.bookingNumber);
  const b2Seq = parseBookingCode(b2Result.booking.bookingNumber);

  if (!b1Seq || !b2Seq || b2Seq !== b1Seq + 1) {
    throw new Error(`Consecutive booking test failed: ${b1Result.booking.bookingNumber} vs ${b2Result.booking.bookingNumber}`);
  }

  // Invariant 8: Cancellation never deletes or releases booking number
  const cancelledBooking = await prisma.booking.update({
    where: { id: b1Result.booking.id },
    data: { status: "cancelled", cancellationReason: "Customer requested cancellation" },
  });

  if (cancelledBooking.bookingNumber !== b1Result.booking.bookingNumber) {
    throw new Error(`Booking code changed after cancellation!`);
  }

  // Next booking should get next sequence (never reusing cancelled b1Seq)
  const b3Result = await createBooking({
    venueId: venue.id,
    resourceId: court.id,
    dateStr: testDate,
    startTimeStr: "16:00",
    endTimeStr: "17:00",
    customerName: "Charlie Brown",
    customerPhone: "+919833344455",
    status: "confirmed",
    paymentStatus: "successful",
  });

  const b3Seq = parseBookingCode(b3Result.booking.bookingNumber);
  if (b3Seq !== b2Seq + 1) {
    throw new Error(`Booking number reuse or mismatch after cancellation! Expected ${b2Seq + 1}, got ${b3Seq}`);
  }

  console.log(`Created booking 3 after cancellation: Code = ${b3Result.booking.bookingNumber} (sequence ${b3Seq})`);
  console.log("PASSED: Cancellation never releases sequence, numbers are never reused.");

  console.log("\n==================================================");
  console.log("ALL BOOKING SEQUENCE TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runBookingSequenceConcurrencyTest()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
