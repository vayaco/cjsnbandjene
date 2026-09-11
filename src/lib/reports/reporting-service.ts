import { db } from "../db";

export type ReportMode = "entire_history" | "date_range";
export type ReportDateRange = "7d" | "30d" | "60d" | "90d" | "365d";

export interface ReportQueryParams {
  businessId: string;
  venueId?: string | null;
  mode: ReportMode;
  range?: ReportDateRange;
  timezone?: string;
}

export interface NormalizedReportBooking {
  id: string;
  bookingNumber: string;
  createdAt: string;
  createdAtFormatted: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  venueName: string;
  resourceName: string;
  dateStr: string;
  startTimeStr: string;
  endTimeStr: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  subtotal: number;
  tax: number;
}

export interface ReportSummaryMetrics {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  refundedBookings: number;
  pendingBookings: number;
  grossBookingValue: number;
  paidAmount: number;
  refundedAmount: number;
  netPaidAmount: number;
}

export interface ReportMetadata {
  mode: ReportMode;
  range?: ReportDateRange;
  reportTypeLabel: string;
  periodLabel: string;
  generatedAtIso: string;
  generatedAtFormatted: string;
  timezone: string;
  filenameSlug: string;
}

export interface AuthoritativeReportDataset {
  metadata: ReportMetadata;
  summary: ReportSummaryMetrics;
  bookings: NormalizedReportBooking[];
}

/**
 * Calculates start and end timestamps in the business timezone (Asia/Kolkata).
 */
export function calculateReportDateBoundaries(
  mode: ReportMode,
  range: ReportDateRange = "30d",
  timezone: string = "Asia/Kolkata"
): {
  startAt: Date | null;
  endAt: Date;
  reportTypeLabel: string;
  periodLabel: string;
  filenameSlug: string;
} {
  const now = new Date();

  if (mode === "entire_history") {
    return {
      startAt: null,
      endAt: now,
      reportTypeLabel: "Entire History",
      periodLabel: "All recorded bookings",
      filenameSlug: "all-time",
    };
  }

  const daysMap: Record<ReportDateRange, number> = {
    "7d": 7,
    "30d": 30,
    "60d": 60,
    "90d": 90,
    "365d": 365,
  };

  const days = daysMap[range] || 30;

  // Calculate local date string in venue timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const month = parseInt(parts.find((p) => p.type === "month")!.value, 10);
  const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);

  // Inclusive boundary: start of the day N days ago in venue local time (converted to UTC)
  const localDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const startAt = new Date(localDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

  // Friendly date formatting in business timezone
  const displayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const startFormatted = displayFormatter.format(startAt);
  const endFormatted = displayFormatter.format(now);

  return {
    startAt,
    endAt: now,
    reportTypeLabel: `Last ${days} Days`,
    periodLabel: `${startFormatted} to ${endFormatted}`,
    filenameSlug: `last-${days}-days`,
  };
}

/**
 * Authoritative single reporting engine.
 * Queries production database directly and returns a normalized dataset for Preview, PDF, and CSV.
 */
export async function getAuthoritativeReportData(
  params: ReportQueryParams
): Promise<AuthoritativeReportDataset> {
  const {
    businessId,
    venueId,
    mode,
    range = "30d",
    timezone = "Asia/Kolkata",
  } = params;

  const boundaries = calculateReportDateBoundaries(mode, range, timezone);

  const whereClause: any = {
    businessId,
  };

  if (venueId && venueId !== "all") {
    whereClause.venueId = venueId;
  }

  // Filter based on booking creation date/time (createdAt)
  if (boundaries.startAt) {
    whereClause.createdAt = {
      gte: boundaries.startAt,
      lte: boundaries.endAt,
    };
  }

  // Query database directly with related entities
  const rawBookings = await db.booking.findMany({
    where: whereClause,
    include: {
      venue: {
        select: {
          name: true,
          slug: true,
          city: true,
        },
      },
      resource: {
        select: {
          name: true,
          resourceType: true,
        },
      },
      customer: {
        select: {
          name: true,
          phone: true,
          email: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const displayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  let grossBookingValue = 0;
  let paidAmount = 0;
  let refundedAmount = 0;
  let confirmedBookings = 0;
  let cancelledBookings = 0;
  let refundedBookings = 0;
  let pendingBookings = 0;

  const normalizedBookings: NormalizedReportBooking[] = rawBookings.map((b) => {
    const bookingTotal = b.total || 0;
    grossBookingValue += bookingTotal;

    const normalizedStatus = (b.status || "").toLowerCase();
    if (normalizedStatus === "confirmed") {
      confirmedBookings++;
    } else if (normalizedStatus === "cancelled") {
      cancelledBookings++;
    } else if (normalizedStatus === "refunded") {
      refundedBookings++;
    } else if (normalizedStatus === "payment_pending") {
      pendingBookings++;
    }

    // Process payment information
    let resolvedPaymentStatus = (b.paymentStatus || "").toUpperCase();
    if (!resolvedPaymentStatus) {
      resolvedPaymentStatus = normalizedStatus === "confirmed" ? "PAID" : "PENDING";
    }

    // Inspect payments array for accurate accounting totals
    const successfulPayments = b.payments.filter((p) => p.status === "successful");
    const refundedPayments = b.payments.filter((p) => p.status === "refunded");

    for (const p of successfulPayments) {
      paidAmount += p.amount;
    }
    for (const p of refundedPayments) {
      refundedAmount += p.amount;
    }

    // If no explicit payment row but booking is confirmed, count booking total as paid
    if (b.payments.length === 0 && normalizedStatus === "confirmed") {
      paidAmount += bookingTotal;
    }

    const createdAtDate = new Date(b.createdAt);

    return {
      id: b.id,
      bookingNumber: b.bookingNumber,
      createdAt: b.createdAt.toISOString(),
      createdAtFormatted: displayFormatter.format(createdAtDate),
      customerName: b.customer?.name || "Anonymous",
      customerPhone: b.customer?.phone || "N/A",
      customerEmail: b.customer?.email || "N/A",
      venueName: b.venue?.name || "Main Venue",
      resourceName: b.resource?.name || "Court",
      dateStr: b.dateStr,
      startTimeStr: b.startTimeStr,
      endTimeStr: b.endTimeStr,
      status: b.status.toUpperCase(),
      paymentStatus: resolvedPaymentStatus,
      paymentMethod: (b.paymentMethod || "online").toUpperCase(),
      total: bookingTotal,
      subtotal: b.subtotal || bookingTotal,
      tax: b.tax || 0,
    };
  });

  const now = new Date();
  const generatedAtFormatted = `${displayFormatter.format(now)} IST`;

  const summary: ReportSummaryMetrics = {
    totalBookings: normalizedBookings.length,
    confirmedBookings,
    cancelledBookings,
    refundedBookings,
    pendingBookings,
    grossBookingValue,
    paidAmount,
    refundedAmount,
    netPaidAmount: paidAmount - refundedAmount,
  };

  const metadata: ReportMetadata = {
    mode,
    range: mode === "date_range" ? range : undefined,
    reportTypeLabel: boundaries.reportTypeLabel,
    periodLabel: boundaries.periodLabel,
    generatedAtIso: now.toISOString(),
    generatedAtFormatted,
    timezone,
    filenameSlug: boundaries.filenameSlug,
  };

  return {
    metadata,
    summary,
    bookings: normalizedBookings,
  };
}

/**
 * Records an export action in the AuditLog table.
 */
export async function recordReportExportAuditLog(params: {
  businessId: string;
  userId: string;
  userEmail: string;
  format: "pdf" | "csv" | "preview";
  mode: ReportMode;
  range?: ReportDateRange;
  rowCount: number;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        businessId: params.businessId,
        userId: params.userId,
        userEmail: params.userEmail,
        action: "REPORT_EXPORTED",
        entityType: "report",
        details: JSON.stringify({
          format: params.format,
          mode: params.mode,
          range: params.range || "all",
          rowCount: params.rowCount,
          exportedAt: new Date().toISOString(),
        }),
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("[ReportingService] Failed to record export audit log:", error);
  }
}
