"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency, formatTimeRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileBarChart,
  Download,
  IndianRupee,
  Calendar,
  Building2,
  FileSpreadsheet,
} from "lucide-react";

export default function AdminReportsPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenue, setSelectedVenue] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/venues")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setVenues(d.venues);
      });
  }, []);

  useEffect(() => {
    async function loadReports() {
      try {
        setIsLoading(true);
        const url =
          selectedVenue === "all"
            ? "/api/v1/admin/reports"
            : `/api/v1/admin/reports?venueId=${selectedVenue}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setReportData(data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadReports();
  }, [selectedVenue]);

  const handleExportCSV = () => {
    if (!reportData?.bookings?.length) return;

    const headers = [
      "Booking ID",
      "Date",
      "Customer",
      "Phone",
      "Venue",
      "Court",
      "Time",
      "Amount",
      "Method",
      "Status",
    ];

    const rows = reportData.bookings.map((b: any) => [
      b.bookingNumber,
      b.dateStr,
      `"${b.customer?.name || ""}"`,
      b.customer?.phone || "",
      `"${b.venue?.name || ""}"`,
      `"${b.resource?.name || ""}"`,
      `"${b.startTimeStr} - ${b.endTimeStr}"`,
      b.total,
      b.paymentMethod,
      b.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: string[]) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SmashZone_Financial_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Financial & Operational Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-ready revenue summaries and payment method distributions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Venues</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <Button
            onClick={handleExportCSV}
            disabled={!reportData?.bookings?.length}
            variant="outline"
            className="font-bold gap-2 text-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Net Revenue
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {formatCurrency(reportData?.totalRevenue || 0)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              From {reportData?.totalBookings || 0} confirmed reservations
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Average Order Value (AOV)
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(
                reportData?.totalBookings
                  ? Math.round(reportData.totalRevenue / reportData.totalBookings)
                  : 0
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Per 60-min court booking</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Indian FY Reporting
            </span>
            <div className="text-sm font-extrabold text-slate-800 mt-2">
              FY 2026-27 (1 Apr – 31 Mar)
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              Active ledger accounting
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold">Detailed Financial Ledger</CardTitle>
          <span className="text-xs text-slate-400">
            {reportData?.bookings?.length || 0} total records
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Booking ID</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Venue & Court</th>
                  <th className="p-4">Method</th>
                  <th className="p-4 text-right pr-6">Amount Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {reportData?.bookings?.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50/70">
                    <td className="p-4 pl-6 font-mono font-bold text-slate-800">
                      {b.bookingNumber}
                    </td>
                    <td className="p-4">{b.dateStr}</td>
                    <td className="p-4 font-semibold text-slate-800">{b.customer?.name}</td>
                    <td className="p-4 text-slate-600">
                      {b.venue?.name} • {b.resource?.name}
                    </td>
                    <td className="p-4 capitalize">
                      <Badge variant="outline" className="text-[10px]">
                        {b.paymentMethod}
                      </Badge>
                    </td>
                    <td className="p-4 text-right pr-6 font-black text-emerald-600">
                      {formatCurrency(b.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
