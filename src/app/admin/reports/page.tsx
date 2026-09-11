"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency, formatTimeRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileBarChart,
  Download,
  Calendar,
  Building2,
  FileSpreadsheet,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Info,
  ShieldCheck,
} from "lucide-react";

type ReportMode = "entire_history" | "date_range";
type ReportDateRange = "7d" | "30d" | "60d" | "90d" | "365d";

export default function AdminReportsPage() {
  const [mode, setMode] = useState<ReportMode>("entire_history");
  const [range, setRange] = useState<ReportDateRange>("30d");
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenue, setSelectedVenue] = useState("all");

  const [reportDataset, setReportDataset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/venues")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setVenues(d.venues);
      })
      .catch(() => {});
  }, []);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      params.set("mode", mode);
      if (mode === "date_range") {
        params.set("range", range);
      }
      if (selectedVenue && selectedVenue !== "all") {
        params.set("venueId", selectedVenue);
      }

      const res = await fetch(`/api/v1/admin/reports?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.data) {
        setReportDataset(data.data);
      } else {
        setErrorMessage(data.error || "Failed to load report data.");
      }
    } catch {
      setErrorMessage("Network error while generating report preview.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [mode, range, selectedVenue]);

  const handleDownloadPdf = () => {
    setIsDownloadingPdf(true);
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (mode === "date_range") {
      params.set("range", range);
    }
    if (selectedVenue && selectedVenue !== "all") {
      params.set("venueId", selectedVenue);
    }

    const downloadUrl = `/api/v1/admin/reports/pdf?${params.toString()}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setIsDownloadingPdf(false), 2000);
  };

  const handleDownloadCsv = () => {
    setIsDownloadingCsv(true);
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (mode === "date_range") {
      params.set("range", range);
    }
    if (selectedVenue && selectedVenue !== "all") {
      params.set("venueId", selectedVenue);
    }

    const downloadUrl = `/api/v1/admin/reports/csv?${params.toString()}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setIsDownloadingCsv(false), 2000);
  };

  const summary = reportDataset?.summary;
  const metadata = reportDataset?.metadata;
  const bookings = reportDataset?.bookings || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Reports & Export
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View and download your complete booking history or a specific date range.
          </p>
        </div>

        {venues.length > 1 && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Venues</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mode 1: Entire History */}
        <div
          onClick={() => setMode("entire_history")}
          className={`cursor-pointer rounded-2xl border-2 p-5 transition-all relative ${
            mode === "entire_history"
              ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                Mode 1
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Entire History
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Export every booking that has ever been recorded in the system. Includes confirmed, cancelled, refunded, and historical records.
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                mode === "entire_history"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {mode === "entire_history" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </div>
        </div>

        {/* Mode 2: Date Range */}
        <div
          onClick={() => setMode("date_range")}
          className={`cursor-pointer rounded-2xl border-2 p-5 transition-all relative ${
            mode === "date_range"
              ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                Mode 2
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Predefined Date Range
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose a specific rolling window based on booking creation timestamp.
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                mode === "date_range"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {mode === "date_range" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </div>

          {/* Date Range Selector Pills */}
          {mode === "date_range" && (
            <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap gap-2">
              {(
                [
                  { id: "7d", label: "Last 7 Days" },
                  { id: "30d", label: "Last 30 Days" },
                  { id: "60d", label: "Last 60 Days" },
                  { id: "90d", label: "Last 90 Days" },
                  { id: "365d", label: "Last 365 Days" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRange(option.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    range === option.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Date Basis Explanation Notice */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs border border-slate-200/60">
        <Info className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          <strong>Accounting Notice:</strong> Date range is based on booking creation date in venue timezone (Asia/Kolkata).
        </span>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-slate-200/90 shadow-sm bg-white">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {isLoading ? <Skeleton className="h-8 w-16" /> : summary?.totalBookings || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {summary?.confirmedBookings || 0} confirmed | {summary?.cancelledBookings || 0} cancelled
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-sm bg-white">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Gross Booking Value
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(summary?.grossBookingValue || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              All bookings recorded in period
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-sm bg-white">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Paid Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(summary?.paidAmount || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Verified successful payments
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-sm bg-white">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Net Paid Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(summary?.netPaidAmount || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Net after refunds processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar with Download Buttons */}
      <Card className="border-slate-200/90 shadow-sm bg-white">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 block">
              Active Scope: {metadata?.reportTypeLabel || "Entire History"}
            </span>
            <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
              {metadata?.periodLabel || "All recorded bookings"}
            </div>
            <span className="text-xs text-slate-500">
              Showing {bookings.length} matching booking records
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={loadReportData}
              disabled={isLoading}
              className="text-xs font-bold gap-1.5 h-10 rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            <Button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf || isLoading || bookings.length === 0}
              className="h-10 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isDownloadingPdf ? "Generating PDF..." : "Download PDF Report"}</span>
            </Button>

            <Button
              onClick={handleDownloadCsv}
              disabled={isDownloadingCsv || isLoading || bookings.length === 0}
              className="h-10 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isDownloadingCsv ? "Exporting CSV..." : "Download CSV"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview Table */}
      <Card className="border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Report Data Preview
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Showing live records from database for {metadata?.reportTypeLabel || "Selected Filter"}
            </CardDescription>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {bookings.length} Rows
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Calendar}
                title="No bookings found"
                description="There are no bookings recorded in the selected period."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-3.5 pl-5">Booking ID</th>
                    <th className="p-3.5">Created At</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Venue & Court</th>
                    <th className="p-3.5">Schedule</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Payment</th>
                    <th className="p-3.5 pr-5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 pl-5 font-mono font-bold text-emerald-700">
                        {b.bookingNumber}
                      </td>
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">
                        {b.createdAtFormatted}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{b.customerName}</div>
                        <span className="text-[11px] text-slate-400">{b.customerPhone}</span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{b.venueName}</div>
                        <span className="text-[11px] text-slate-400">{b.resourceName}</span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{b.dateStr}</div>
                        <span className="text-[11px] text-slate-500">
                          {formatTimeRange(b.startTimeStr, b.endTimeStr)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <Badge
                          className={
                            b.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-800 font-bold text-[10px] border-0"
                              : b.status === "CANCELLED"
                              ? "bg-rose-100 text-rose-800 font-bold text-[10px] border-0"
                              : "bg-slate-100 text-slate-800 font-bold text-[10px] border-0"
                          }
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800 text-[11px]">
                          {b.paymentStatus}
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {b.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right font-black text-slate-900">
                        {formatCurrency(b.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
