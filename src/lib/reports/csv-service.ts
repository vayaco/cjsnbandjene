import { AuthoritativeReportDataset } from "./reporting-service";

/**
 * Sanitizes a string value against CSV formula injection attacks (CSV Injection / DDE).
 * If a value begins with =, +, -, or @, prepend a single quote so spreadsheets interpret it as raw text.
 */
export function sanitizeCsvField(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value).trim();

  // Protect against formula injection if the first character is an executable prefix
  const unsafePrefixes = ["=", "+", "-", "@", "\t", "\r"];
  let safeStr = str;
  if (unsafePrefixes.some((prefix) => str.startsWith(prefix))) {
    safeStr = `'${str}`;
  }

  // Escape quotation marks per RFC 4180
  if (safeStr.includes('"') || safeStr.includes(",") || safeStr.includes("\n") || safeStr.includes("\r")) {
    return `"${safeStr.replace(/"/g, '""')}"`;
  }

  return safeStr;
}

/**
 * Generates an accounting-grade CSV file from the authoritative normalized dataset.
 * Prepends UTF-8 BOM (\uFEFF) for immediate compatibility with Excel, Numbers, and Sheets.
 */
export function generateAdminReportCsv(dataset: AuthoritativeReportDataset): Buffer {
  const headers = [
    "Booking ID",
    "Booking Created",
    "Customer Name",
    "Customer Phone",
    "Customer Email",
    "Venue",
    "Court",
    "Booking Date",
    "Start Time",
    "End Time",
    "Booking Status",
    "Payment Status",
    "Payment Method",
    "Gross Amount (INR)",
    "Subtotal (INR)",
    "Tax (INR)",
  ];

  const lines: string[] = [];

  // Header row
  lines.push(headers.map(sanitizeCsvField).join(","));

  // Data rows
  for (const b of dataset.bookings) {
    const row = [
      b.bookingNumber,
      b.createdAtFormatted,
      b.customerName,
      b.customerPhone,
      b.customerEmail,
      b.venueName,
      b.resourceName,
      b.dateStr,
      b.startTimeStr,
      b.endTimeStr,
      b.status,
      b.paymentStatus,
      b.paymentMethod,
      b.total.toFixed(2),
      b.subtotal.toFixed(2),
      b.tax.toFixed(2),
    ];
    lines.push(row.map(sanitizeCsvField).join(","));
  }

  const csvString = lines.join("\r\n");

  // Prepend UTF-8 Byte Order Mark (BOM)
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const contentBuffer = Buffer.from(csvString, "utf-8");

  return Buffer.concat([bom, contentBuffer]);
}

/**
 * Generates the standardized filename for CSV downloads.
 */
export function getReportCsvFilename(dataset: AuthoritativeReportDataset): string {
  return `badminton-academy-bookings-${dataset.metadata.filenameSlug}.csv`;
}
