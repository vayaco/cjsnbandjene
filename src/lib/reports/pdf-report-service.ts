import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { AuthoritativeReportDataset } from "./reporting-service";

/**
 * Generates an accounting-grade landscape A4 PDF report from the authoritative dataset.
 * Supports multi-page pagination, repeated table headers, and page numbering footers.
 */
export function generateAdminReportPdf(dataset: AuthoritativeReportDataset): Buffer {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2;         // 267 mm

  // 1. Primary Header Banner (Slate-950)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Business Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("BADMINTON ACADEMY", marginX, 12);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text("OFFICIAL BOOKING & FINANCIAL AUDIT REPORT", marginX, 19);

  // Report Scope (Right aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(dataset.metadata.reportTypeLabel.toUpperCase(), pageWidth - marginX, 12, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Scope: ${dataset.metadata.periodLabel}`, pageWidth - marginX, 19, { align: "right" });

  // 2. Report Metadata Sub-bar
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, 32, contentWidth, 8, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(marginX, 32, contentWidth, 8, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated: ${dataset.metadata.generatedAtFormatted} (${dataset.metadata.timezone})`, marginX + 4, 37.5);
  doc.text("Date filter is based on booking creation timestamp.", pageWidth - marginX - 4, 37.5, { align: "right" });

  // 3. Financial & Operational Summary Cards (4 Columns)
  const cardY = 44;
  const cardHeight = 18;
  const cardGap = 5;
  const cardWidth = (contentWidth - cardGap * 3) / 4;

  const summaryCards = [
    {
      title: "TOTAL BOOKINGS",
      value: String(dataset.summary.totalBookings),
      subtext: `${dataset.summary.confirmedBookings} Confirmed | ${dataset.summary.cancelledBookings} Cancelled`,
    },
    {
      title: "GROSS BOOKING VALUE",
      value: `INR ${dataset.summary.grossBookingValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      subtext: "Total recorded booking volume",
    },
    {
      title: "TOTAL PAID AMOUNT",
      value: `INR ${dataset.summary.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      subtext: "Successful customer payments",
    },
    {
      title: "NET PAID AMOUNT",
      value: `INR ${dataset.summary.netPaidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      subtext: `After INR ${dataset.summary.refundedAmount.toFixed(2)} refunds`,
    },
  ];

  summaryCards.forEach((card, idx) => {
    const x = marginX + idx * (cardWidth + cardGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(card.title, x + 3.5, cardY + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(card.value, x + 3.5, cardY + 10.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(card.subtext, x + 3.5, cardY + 15.5);
  });

  // 4. Booking Table
  const tableStartY = cardY + cardHeight + 6;

  const tableHead = [[
    "Booking ID",
    "Created Date",
    "Customer Name",
    "Phone",
    "Venue / Court",
    "Schedule",
    "Status",
    "Payment",
    "Amount (INR)",
  ]];

  const tableBody = dataset.bookings.map((b) => [
    b.bookingNumber,
    b.createdAtFormatted,
    b.customerName,
    b.customerPhone,
    `${b.venueName}\n${b.resourceName}`,
    `${b.dateStr}\n${b.startTimeStr} to ${b.endTimeStr}`,
    b.status,
    `${b.paymentStatus}\n(${b.paymentMethod})`,
    b.total.toFixed(2),
  ]);

  if (tableBody.length === 0) {
    tableBody.push([
      "No bookings found",
      "-",
      "-",
      "-",
      "-",
      "-",
      "-",
      "-",
      "0.00",
    ]);
  }

  autoTable(doc, {
    startY: tableStartY,
    head: tableHead,
    body: tableBody,
    showHead: "everyPage",
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "left",
      cellPadding: 3,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.8,
      textColor: [15, 23, 42],
      valign: "middle",
      overflow: "linebreak",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: "bold" },
      1: { cellWidth: 32 },
      2: { cellWidth: 35 },
      3: { cellWidth: 28 },
      4: { cellWidth: 38 },
      5: { cellWidth: 38 },
      6: { cellWidth: 22 },
      7: { cellWidth: 25 },
      8: { cellWidth: 24, halign: "right", fontStyle: "bold" },
    },
    margin: { left: marginX, right: marginX, bottom: 18 },
    didDrawPage: (data) => {
      // Bottom running footer on every page
      const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      const footerLeft = `Badminton Academy Confidential Audit Report | Total Bookings: ${dataset.summary.totalBookings}`;
      doc.text(footerLeft, marginX, pageHeight - 7);

      const footerRight = `Page ${pageNumber} of ${(doc as any).internal.getNumberOfPages()}`;
      doc.text(footerRight, pageWidth - marginX, pageHeight - 7, { align: "right" });
    },
  });

  // Re-visit pages to ensure total page count in footer is correct
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    // Overwrite page number with accurate total page count
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth - marginX - 35, pageHeight - 10, 35, 6, "F");
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: "right" });
  }

  const outputArray = doc.output("arraybuffer");
  return Buffer.from(outputArray);
}

/**
 * Generates the standardized filename for PDF report downloads.
 */
export function getReportPdfFilename(dataset: AuthoritativeReportDataset): string {
  return `badminton-academy-booking-report-${dataset.metadata.filenameSlug}.pdf`;
}
