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

  // Primary brand header block
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 42, "F");

  // Brand Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("BADMINTON ACADEMY", 15, 18);

  // Document Title
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text("OFFICIAL MATCH PASS & RESERVATION RECEIPT", 15, 26);

  // Reference and Date in header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(`REFERENCE: ${data.bookingNumber}`, pageWidth - 15, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  const issueDateStr = new Date(data.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.text(`ISSUED: ${issueDateStr}`, pageWidth - 15, 26, { align: "right" });

  // Two-column layout: Billed To & Venue Location
  const infoStartY = 54;

  // Left Column: Customer
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text("BILLED TO", 15, infoStartY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(data.customer.name, 15, infoStartY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Mobile: ${data.customer.phone}`, 15, infoStartY + 13);
  if (data.customer.email) {
    doc.text(`Email: ${data.customer.email}`, 15, infoStartY + 18);
  }

  // Right Column: Venue Location
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("VENUE LOCATION", pageWidth / 2 + 5, infoStartY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(data.venue.name, pageWidth / 2 + 5, infoStartY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const venueAddressLines = doc.splitTextToSize(data.venue.address, (pageWidth / 2) - 20);
  doc.text(venueAddressLines, pageWidth / 2 + 5, infoStartY + 13);

  // Itemized Table
  const tableStartY = infoStartY + 30;

  const tableBody = [
    [
      "Court Slot Reservation\n" + `${data.resource.name} (${data.venue.name})`,
      data.bookingDateStr,
      `${data.startTimeStr} to ${data.endTimeStr}`,
      "60 mins",
      `INR ${data.total.toFixed(2)}`,
    ],
  ];

  autoTable(doc, {
    startY: tableStartY,
    head: [["Description & Resource", "Date", "Slot Time", "Duration", "Amount"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 30 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25, halign: "right" },
    },
    margin: { left: 15, right: 15 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Financial Totals Summary (Right-aligned)
  const totalsX = pageWidth - 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  doc.text("Subtotal:", totalsX - 45, finalY);
  doc.text(`INR ${data.subtotal.toFixed(2)}`, totalsX, finalY, { align: "right" });

  doc.text("Taxes & Fees:", totalsX - 45, finalY + 6);
  doc.text(`INR ${data.tax.toFixed(2)}`, totalsX, finalY + 6, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Total Paid:", totalsX - 45, finalY + 14);
  doc.text(`INR ${data.total.toFixed(2)}`, totalsX, finalY + 14, { align: "right" });

  // Verification Badge / Status Box (Left-aligned)
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(15, finalY, 95, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52); // emerald-800
  doc.text("PAYMENT VERIFIED & CONFIRMED", 20, finalY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61); // emerald-700
  doc.text(`Method: ${data.paymentMethod || "Electronic Transfer"}`, 20, finalY + 13);
  doc.text("Status: Completed / Paid in Full", 20, finalY + 18);

  // Policy & Footer
  const footerY = 265;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    "Please present this match pass at the reception desk. Non-marking badminton shoes are mandatory on synthetic courts.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );
  doc.text(
    "This is a system-generated electronic invoice and match pass. No physical signature is required.",
    pageWidth / 2,
    footerY + 5,
    { align: "center" }
  );

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
