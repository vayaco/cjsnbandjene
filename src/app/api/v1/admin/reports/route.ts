import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getAuthoritativeReportData,
  ReportMode,
  ReportDateRange,
} from "@/lib/reports/reporting-service";

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

    return NextResponse.json({
      success: true,
      data: dataset,
    });
  } catch (error: any) {
    console.error("[ReportsAPI] Preview generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate report preview." },
      { status: 500 }
    );
  }
}
