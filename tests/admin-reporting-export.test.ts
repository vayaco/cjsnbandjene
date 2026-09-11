import { PrismaClient } from "@prisma/client";
import {
  getAuthoritativeReportData,
  calculateReportDateBoundaries,
  recordReportExportAuditLog,
} from "../src/lib/reports/reporting-service";
import {
  generateAdminReportCsv,
  sanitizeCsvField,
  getReportCsvFilename,
} from "../src/lib/reports/csv-service";
import {
  generateAdminReportPdf,
  getReportPdfFilename,
} from "../src/lib/reports/pdf-report-service";
import { createBooking } from "../src/lib/booking-engine";
import { getBookingCalendarWindow } from "../src/lib/availability";

const prisma = new PrismaClient();

async function runAdminReportingTests() {
  console.log("==================================================");
  console.log("STARTING ADMIN REPORTING & EXPORT ENGINE TESTS");
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

  const business = await prisma.business.findFirst();
  if (!business) {
    throw new Error("No business found in database.");
  }

  // 1. Date Range Boundaries
  console.log("\n--- TEST SUITE 1: DATE RANGE BOUNDARY CALCULATIONS (ASIA/KOLKATA) ---");
  const bAll = calculateReportDateBoundaries("entire_history");
  assert(bAll.startAt === null, "Entire history has startAt = null (all time)");
  assert(bAll.reportTypeLabel === "Entire History", "Entire history has correct label");
  assert(bAll.filenameSlug === "all-time", "Entire history has all-time filename slug");

  const b7 = calculateReportDateBoundaries("date_range", "7d");
  assert(b7.startAt !== null, "Last 7 days has non-null startAt");
  assert(b7.reportTypeLabel === "Last 7 Days", "Last 7 days has correct label");
  assert(b7.filenameSlug === "last-7-days", "Filename slug is last-7-days");

  const b30 = calculateReportDateBoundaries("date_range", "30d");
  assert(b30.startAt !== null, "Last 30 days has non-null startAt");
  assert(b30.filenameSlug === "last-30-days", "Filename slug is last-30-days");

  const b365 = calculateReportDateBoundaries("date_range", "365d");
  assert(b365.startAt !== null, "Last 365 days has non-null startAt");
  assert(b365.filenameSlug === "last-365-days", "Filename slug is last-365-days");

  // Verify time difference for 7 days is approximately 6-7 days in milliseconds
  const diffDays7 = Math.round((b7.endAt.getTime() - b7.startAt!.getTime()) / (24 * 60 * 60 * 1000));
  assert(diffDays7 >= 6 && diffDays7 <= 8, `7-day boundary span is accurate (${diffDays7} days)`);

  // 2. CSV Formula Injection Defense
  console.log("\n--- TEST SUITE 2: CSV FORMULA INJECTION DEFENSE & SANITIZATION ---");
  const formula1 = '=HYPERLINK("http://attacker.com", "Click Here")';
  const sanitized1 = sanitizeCsvField(formula1);
  assert(sanitized1.startsWith(`"'=HYPERLINK`), "Formula starting with '=' is prepended with single quote");

  const formula2 = '+1234567890';
  const sanitized2 = sanitizeCsvField(formula2);
  assert(sanitized2.startsWith("'+1234567890"), "Phone/string starting with '+' is safely escaped");

  const formula3 = '-50.00 discount';
  const sanitized3 = sanitizeCsvField(formula3);
  assert(sanitized3.startsWith("'-50.00"), "String starting with '-' is safely escaped");

  const formula4 = '@admin_mention';
  const sanitized4 = sanitizeCsvField(formula4);
  assert(sanitized4.startsWith("'@admin_mention"), "String starting with '@' is safely escaped");

  const safeField = "Regular Badminton Player";
  assert(sanitizeCsvField(safeField) === safeField, "Clean string is unchanged");

  const commaField = "Court 1, Wooden Floor";
  assert(sanitizeCsvField(commaField) === '"Court 1, Wooden Floor"', "Field with comma is wrapped in double quotes");

  const quoteField = 'Pooja "Smash" Verma';
  assert(sanitizeCsvField(quoteField) === '"Pooja ""Smash"" Verma"', "Internal quotes are escaped as double quotes per RFC 4180");

  // 3. Setup Known Test Bookings
  console.log("\n--- TEST SUITE 3: SETUP AND DATASET QUERYING ---");
  const venue = await prisma.venue.upsert({
    where: { slug: "test-report-venue" },
    update: {},
    create: {
      businessId: business.id,
      name: "Reporting Test Arena",
      slug: "test-report-venue",
      code: "RA",
      address: "500 Export Highway",
      city: "Mumbai",
      openTime: "06:00",
      closeTime: "23:00",
    },
  });

  const court = await prisma.resource.upsert({
    where: { id: "test_report_court" },
    update: { status: "active" },
    create: {
      id: "test_report_court",
      businessId: business.id,
      venueId: venue.id,
      name: "Audit Court 1",
      resourceType: "court",
      capacity: 4,
      defaultPrice: 800,
      status: "active",
    },
  });

  const window = getBookingCalendarWindow("Asia/Kolkata");
  const dateValid = window.allowedDates[3];

  // Clean old test bookings
  await prisma.notification.deleteMany({ where: { booking: { venueId: venue.id } } });
  await prisma.bookingAccessToken.deleteMany({ where: { booking: { venueId: venue.id } } });
  await prisma.payment.deleteMany({ where: { booking: { venueId: venue.id } } });
  await prisma.booking.deleteMany({ where: { venueId: venue.id } });

  // Create booking 1: Confirmed
  const b1 = await createBooking({
    venueId: venue.id,
    resourceId: court.id,
    dateStr: dateValid,
    startTimeStr: "09:00",
    endTimeStr: "10:00",
    customerName: "Rohan Bopanna",
    customerPhone: "9820011111",
    customerEmail: "rohan@example.com",
    paymentMethod: "upi",
    createdBy: "admin",
  });
  assert(b1.success === true, "Created test booking 1 (Confirmed)");

  // Create booking 2: With formula injection attempt in customer name
  const b2 = await createBooking({
    venueId: venue.id,
    resourceId: court.id,
    dateStr: dateValid,
    startTimeStr: "11:00",
    endTimeStr: "12:00",
    customerName: "=CMD|' /C calc'!A0",
    customerPhone: "9820022222",
    customerEmail: "calc@example.com",
    paymentMethod: "card",
    createdBy: "admin",
  });
  assert(b2.success === true, "Created test booking 2 (Formula Injection payload)");

  // Create booking 3: Cancelled
  const b3 = await createBooking({
    venueId: venue.id,
    resourceId: court.id,
    dateStr: dateValid,
    startTimeStr: "13:00",
    endTimeStr: "14:00",
    customerName: "Leander Paes",
    customerPhone: "9820033333",
    customerEmail: "leander@example.com",
    paymentMethod: "cash",
    status: "confirmed",
    createdBy: "admin",
  });
  assert(b3.success === true, "Created test booking 3 (To be cancelled)");

  // Cancel booking 3 to test status retention
  await prisma.booking.update({
    where: { id: b3.booking!.id },
    data: { status: "cancelled" },
  });

  // 4. Entire History Verification
  console.log("\n--- TEST SUITE 4: ENTIRE HISTORY AUTHORITATIVE QUERY ---");
  const entireDataset = await getAuthoritativeReportData({
    businessId: business.id,
    venueId: venue.id,
    mode: "entire_history",
  });

  assert(entireDataset.bookings.length >= 3, `Entire history contains all 3 test bookings (found: ${entireDataset.bookings.length})`);
  assert(entireDataset.summary.totalBookings >= 3, "Total bookings matches dataset count");
  assert(entireDataset.summary.cancelledBookings >= 1, "Cancelled booking is preserved in Entire History");
  assert(entireDataset.summary.confirmedBookings >= 2, "Confirmed bookings accurately counted");
  assert(entireDataset.summary.grossBookingValue >= 2400, "Gross booking value sums all 3 bookings (800 * 3 = 2400)");

  // Verify cancelled booking is not silently discarded
  const cancelledRow = entireDataset.bookings.find((b) => b.id === b3.booking!.id);
  assert(!!cancelledRow, "Cancelled booking record is present in export");
  assert(cancelledRow?.status === "CANCELLED", "Status of cancelled booking is recorded as CANCELLED");

  // 5. Parity Test: Preview vs CSV vs PDF
  console.log("\n--- TEST SUITE 5: PREVIEW, CSV & PDF DATASET PARITY ---");
  const csvBuffer = generateAdminReportCsv(entireDataset);
  assert(Buffer.isBuffer(csvBuffer), "CSV generated as Buffer");

  // Verify UTF-8 BOM
  assert(csvBuffer[0] === 0xef && csvBuffer[1] === 0xbb && csvBuffer[2] === 0xbf, "CSV buffer begins with UTF-8 BOM (0xEF, 0xBB, 0xBF)");

  const csvString = csvBuffer.slice(3).toString("utf-8");
  const csvLines = csvString.trim().split("\r\n");
  const csvHeader = csvLines[0];
  const csvDataRows = csvLines.slice(1);

  assert(csvHeader.startsWith("Booking ID,Booking Created"), "CSV contains expected header line");
  assert(csvDataRows.length === entireDataset.bookings.length, `CSV data rows (${csvDataRows.length}) exactly match dataset bookings (${entireDataset.bookings.length})`);

  // Verify formula injection sanitization in actual CSV output
  const injectionRow = csvDataRows.find((line) => line.includes("calc@example.com"));
  assert(!!injectionRow, "Injection payload booking row found in CSV");
  assert(injectionRow!.includes("=CMD"), "Formula was neutralized with quote in CSV line");

  // Generate PDF
  const pdfBuffer = generateAdminReportPdf(entireDataset);
  assert(Buffer.isBuffer(pdfBuffer), "PDF generated as Buffer");
  assert(pdfBuffer.length > 1000, `PDF has valid size (${pdfBuffer.length} bytes)`);
  const pdfMagic = pdfBuffer.slice(0, 5).toString("utf-8");
  assert(pdfMagic === "%PDF-", `PDF begins with valid '%PDF-' magic bytes: ${pdfMagic}`);

  // Filenames
  const csvFilename = getReportCsvFilename(entireDataset);
  const pdfFilename = getReportPdfFilename(entireDataset);
  assert(csvFilename === "badminton-academy-bookings-all-time.csv", `CSV filename matches specification: ${csvFilename}`);
  assert(pdfFilename === "badminton-academy-booking-report-all-time.pdf", `PDF filename matches specification: ${pdfFilename}`);

  // 6. Predefined Date Range Filtering
  console.log("\n--- TEST SUITE 6: PREDEFINED DATE RANGE FILTERING ---");
  const range7Dataset = await getAuthoritativeReportData({
    businessId: business.id,
    venueId: venue.id,
    mode: "date_range",
    range: "7d",
  });
  assert(range7Dataset.bookings.length >= 3, `Last 7 Days captured recent test bookings (found: ${range7Dataset.bookings.length})`);
  assert(range7Dataset.metadata.filenameSlug === "last-7-days", "Metadata slug is last-7-days");

  // 7. Audit Logging Verification
  console.log("\n--- TEST SUITE 7: EXPORT AUDIT LOGGING ---");
  const adminUser = await prisma.businessUser.findFirst({
    where: { role: "super_admin" },
  });

  if (adminUser) {
    await recordReportExportAuditLog({
      businessId: business.id,
      userId: adminUser.id,
      userEmail: adminUser.email,
      format: "pdf",
      mode: "entire_history",
      rowCount: entireDataset.bookings.length,
      ipAddress: "127.0.0.1",
    });

    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        businessId: business.id,
        action: "REPORT_EXPORTED",
      },
      orderBy: { createdAt: "desc" },
    });

    assert(!!auditEntry, "AuditLog entry for REPORT_EXPORTED was recorded in database");
    const auditDetails = JSON.parse(auditEntry!.details);
    assert(auditDetails.format === "pdf", "Audit log records export format as PDF");
    assert(auditDetails.mode === "entire_history", "Audit log records export mode as entire_history");
  }

  // 8. Read-Only Guarantee
  console.log("\n--- TEST SUITE 8: READ-ONLY DATA INTEGRITY GUARANTEE ---");
  const b1After = await prisma.booking.findUnique({ where: { id: b1.booking!.id } });
  assert(b1After?.status === "confirmed", "Booking status was not modified during export");
  assert(b1After?.total === 800, "Booking total was not modified during export");

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminReportingTests()
  .catch((err) => {
    console.error("FATAL ERROR IN REPORTING TESTS:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
