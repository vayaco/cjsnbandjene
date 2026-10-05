import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoiceData {
  bookingNumber: string;
  bookingDateStr: string;
  startTimeStr: string;
  endTimeStr: string;
  total: number;
  subtotal: number;
  tax: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  createdAt: Date;
  brandName?: string;
  brandLogoUrl?: string;
  customer: {
    name: string;
    phone: string;
    email?: string | null;
  };
  venue: {
    name: string;
    address: string;
    city: string;
    phone?: string | null;
  };
  resource: {
    name: string;
    resourceType?: string;
  };
}

/**
 * Generates an official PDF invoice for a booking.
 * Returns a Node.js Buffer suitable for streaming via HTTP or attaching to transactional emails.
 */
export async function generateBookingInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const brandTitle = data.brandName || "Nitish Badminton Academy";

  // Top accent hairline bar
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(18, 0, pageWidth - 36, 1.5, "F");

  // Top Brand Header (Clean White / Minimalist)
  // Left: Brand Name and Document Type
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(brandTitle.toUpperCase(), 18, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("OFFICIAL TAX INVOICE & BOOKING PASS", 18, 24);

  // Right: Invoice Number, Issue Date, Status Pill
  const rightX = pageWidth - 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`INVOICE #${data.bookingNumber}`, rightX, 18, { align: "right" });

  const issueDateStr = new Date(data.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date of Issue: ${issueDateStr}`, rightX, 23.5, { align: "right" });

  // Paid Status Pill
  const pillW = 28;
  const pillH = 5.5;
  const pillX = rightX - pillW;
  const pillY = 27;
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(pillX, pillY, pillW, pillH, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(21, 128, 61); // emerald-700
  doc.text("PAID IN FULL", pillX + pillW / 2, pillY + 3.8, { align: "center" });

  // Hairline Divider
  const dividerY = 37;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.2);
  doc.line(18, dividerY, rightX, dividerY);

  // Two-column layout: Billed To & Venue Location
  const infoStartY = 45;

  // Left Column: Customer
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("BILLED TO", 18, infoStartY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(data.customer.name, 18, infoStartY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Mobile: ${data.customer.phone}`, 18, infoStartY + 11.5);
  if (data.customer.email) {
    doc.text(`Email: ${data.customer.email}`, 18, infoStartY + 16.5);
  }

  // Right Column: Venue Location
  const rightColX = 110;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("FACILITY & VENUE LOCATION", rightColX, infoStartY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.venue.name, rightColX, infoStartY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const venueAddressLines = doc.splitTextToSize(data.venue.address, rightX - rightColX);
  doc.text(venueAddressLines, rightColX, infoStartY + 11.5);

  const addressOffset = Array.isArray(venueAddressLines) ? venueAddressLines.length * 4.5 : 5;
  doc.text(`${data.venue.city}, India`, rightColX, infoStartY + 11.5 + addressOffset);

  // Itemized Table
  const tableStartY = Math.max(infoStartY + 26, infoStartY + 16 + addressOffset + 6);

  const tableBody = [
    [
      `Court Slot Reservation\n${data.resource.name} (${data.venue.name})`,
      data.bookingDateStr,
      `${data.startTimeStr} to ${data.endTimeStr}`,
      "60 mins",
      `INR ${data.total.toFixed(2)}`,
    ],
  ];

  autoTable(doc, {
    startY: tableStartY,
    head: [["DESCRIPTION & RESOURCE", "DATE", "SLOT TIME", "DURATION", "AMOUNT"]],
    body: tableBody,
    theme: "plain",
    headStyles: {
      fillColor: [248, 250, 252], // slate-50
      textColor: [71, 85, 105], // slate-600
      fontSize: 7.5,
      fontStyle: "bold",
      cellPadding: 3.5,
      lineColor: [226, 232, 240],
      lineWidth: { bottom: 0.3 },
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 4.5,
      textColor: [15, 23, 42],
      lineColor: [241, 245, 249],
      lineWidth: { bottom: 0.2 },
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 28 },
      2: { cellWidth: 36 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 18, right: 18 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Financial Totals Summary (Right-aligned)
  const totalsX = rightX;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  doc.text("Subtotal:", totalsX - 45, finalY);
  doc.text(`INR ${data.subtotal.toFixed(2)}`, totalsX, finalY, { align: "right" });

  doc.text("Taxes & Fees (GST 0%):", totalsX - 45, finalY + 6);
  doc.text(`INR ${data.tax.toFixed(2)}`, totalsX, finalY + 6, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(totalsX - 50, finalY + 9, totalsX, finalY + 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Total Paid:", totalsX - 45, finalY + 15);
  doc.text(`INR ${data.total.toFixed(2)}`, totalsX, finalY + 15, { align: "right" });

  // Verification Badge / Status Box (Left-aligned)
  const badgeW = 90;
  const badgeH = 21;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(18, finalY - 1, badgeW, badgeH, 2, 2, "FD");

  // Emerald Indicator Dot
  doc.setFillColor(16, 185, 129);
  doc.circle(23, finalY + 4.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(22, 101, 52); // emerald-800
  doc.text("Payment Verified & Confirmed", 27, finalY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Payment Method: ${data.paymentMethod || "Online / Electronic Transfer"}`, 22, finalY + 11);
  doc.text("Settlement Status: Paid in Full (Zero Balance Due)", 22, finalY + 15.5);

  // Venue Guidelines
  const guidelinesY = 225;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("IMPORTANT VENUE GUIDELINES", 18, guidelinesY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("1. Non-marking badminton shoes are strictly mandatory on synthetic courts.", 18, guidelinesY + 5.5);
  doc.text("2. Please present this official pass at the reception desk 10 minutes prior to slot time.", 18, guidelinesY + 10.5);
  doc.text("3. This electronic tax invoice serves as your valid booking confirmation and receipt.", 18, guidelinesY + 15.5);

  // Footer
  const footerY = 276;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(18, footerY - 4, rightX, footerY - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Tax Invoice | ${brandTitle}`, 18, footerY);
  doc.text(
    "System-generated electronic document. No physical signature required.",
    rightX,
    footerY,
    { align: "right" }
  );

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
