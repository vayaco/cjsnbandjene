import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getAuthoritativeReportData,
  recordReportExportAuditLog,
  ReportMode,
  ReportDateRange,
} from "@/lib/reports/reporting-service";
import { generateAdminReportCsv, getReportCsvFilename } from "@/lib/reports/csv-service";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const modeParam = searchParams.get("mode");
    const rangeParam = searchParams.get("range");
    const venueId = searchParams.get("venueId");

    const mode: ReportMode = modeParam === "entire_history" ? "entire_history" : "date_range";
    const range: ReportDateRange =
      rangeParam === "7d" || rangeParam === "60d" || rangeParam === "90d" || rangeParam === "365d"
        ? rangeParam
        : "30d";

    const dataset = await getAuthoritativeReportData({
      businessId: user.businessId,
      venueId: user.role === "venue_manager" && user.venueId ? user.venueId : venueId,
      mode,
      range,
    });

    const csvBuffer = generateAdminReportCsv(dataset);
    const filename = getReportCsvFilename(dataset);

    // Audit log this administrative export action asynchronously
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    recordReportExportAuditLog({
      businessId: user.businessId,
      userId: user.id,
      userEmail: user.email,
      format: "csv",
      mode,
      range: mode === "date_range" ? range : undefined,
      rowCount: dataset.bookings.length,
      ipAddress,
    });

    return new NextResponse(new Uint8Array(csvBuffer), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": csvBuffer.length.toString(),
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[ReportsCSVAPI] Export error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate CSV export." },
      { status: 500 }
    );
  }
}
