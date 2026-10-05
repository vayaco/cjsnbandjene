"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatTimeRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IndianRupee,
  Ticket,
  Percent,
  Clock,
  AlertOctagon,
  TrendingUp,
  PlusCircle,
  Building2,
  ChevronRight,
  RefreshCw,
  Calendar,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [selectedVenue, setSelectedVenue] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboard(venueId: string = "all") {
    try {
      setIsLoading(true);
      const url =
        venueId === "all"
          ? "/api/v1/admin/dashboard"
          : `/api/v1/admin/dashboard?venueId=${venueId}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard metrics", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard(selectedVenue);
  }, [selectedVenue]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    revenueToday: 0,
    bookingsToday: 0,
    occupancyRate: 0,
    availableSlotsToday: 0,
    cancellationsToday: 0,
    pendingPaymentsCount: 0,
    upcomingBookingsCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Venue Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time revenue, bookings, and court utilization</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Venue Filter Dropdown */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="all">All Venues</option>
              {data?.venues?.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <Link href="/admin/bookings/new">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 font-semibold gap-1.5 text-xs">
              <PlusCircle className="w-4 h-4" />
              <span>New Booking</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <Card className="border-slate-200/90 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Revenue Today
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-slate-900">
                {formatCurrency(metrics.revenueToday)}
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
              Live confirmed bookings
            </span>
          </CardContent>
        </Card>

        {/* Bookings Count */}
        <Card className="border-slate-200/90 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Bookings Today
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Ticket className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-slate-900">{metrics.bookingsToday}</span>
              <span className="text-xs text-slate-500 font-medium">slots booked</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Across all selected courts
            </span>
          </CardContent>
        </Card>

        {/* Occupancy Rate */}
        <Card className="border-slate-200/90 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Occupancy Rate
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-slate-900">{metrics.occupancyRate}%</span>
              <span className="text-xs text-slate-500 font-medium">utilization</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {metrics.availableSlotsToday} slots remaining open
            </span>
          </CardContent>
        </Card>

        {/* Cancellations */}
        <Card className="border-slate-200/90 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Cancellations
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertOctagon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-slate-900">
                {metrics.cancellationsToday}
              </span>
              <span className="text-xs text-slate-500 font-medium">today</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Slot returned to inventory
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Operational Highlights: Upcoming and Pending Payments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Upcoming Confirmed Bookings</span>
              <span className="text-[11px] text-slate-500">Reservations scheduled today and future dates</span>
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-800 text-xs font-bold">
            {metrics.upcomingBookingsCount} Scheduled
          </Badge>
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Pending Checkout Payments</span>
              <span className="text-[11px] text-slate-500">Slots held or awaiting gateway confirmation</span>
            </div>
          </div>
          <Badge className={metrics.pendingPaymentsCount > 0 ? "bg-amber-100 text-amber-800 text-xs font-bold" : "bg-slate-100 text-slate-600 text-xs font-bold"}>
            {metrics.pendingPaymentsCount} Pending
          </Badge>
        </div>
      </div>

      {/* 7-Day Trend Chart Preview */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                7-Day Revenue Trend
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Daily performance across all operational days</p>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 font-bold border-emerald-200 text-xs">
              Live Data
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2">
            {data?.trend?.map((item: any) => {
              const maxRev = Math.max(...data.trend.map((t: any) => t.revenue), 1000);
              const heightPercent = Math.max(12, Math.round((item.revenue / maxRev) * 100));

              return (
                <div key={item.date} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-600 hidden sm:block">
                    {item.revenue > 0 ? formatCurrency(item.revenue) : "₹0"}
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-lg h-28 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 transition-all rounded-t-lg"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">{item.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings List */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900">
              Recent Live Bookings
            </CardTitle>
            <Link href="/admin/bookings" className="text-xs font-bold text-emerald-600 hover:underline">
              View All Bookings →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {data?.recentBookings?.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-medium">
                No recent bookings recorded yet.
              </div>
            ) : (
              data?.recentBookings?.map((b: any) => (
                <div
                  key={b.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                      {b.resource?.name?.slice(-1) || "C"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {b.customer?.name}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-mono tabular-nums text-slate-500">{b.customer?.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">{b.venue?.name}</span>
                        <span>•</span>
                        <span>{b.resource?.name}</span>
                        <span>•</span>
                        <span className="tabular-nums">{b.dateStr}</span>
                        <span>•</span>
                        <span className="font-mono tabular-nums">{formatTimeRange(b.startTimeStr, b.endTimeStr)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="font-bold tabular-nums text-slate-900 text-sm">
                      {formatCurrency(b.total)}
                    </span>
                    <Badge
                      className={
                        b.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-800 text-[10px] font-semibold uppercase tracking-wider"
                          : "bg-rose-100 text-rose-800 text-[10px] font-semibold uppercase tracking-wider"
                      }
                    >
                      {b.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
