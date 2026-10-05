"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatTimeRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers,
  Search,
  PlusCircle,
  Building2,
  Calendar,
  Eye,
  CheckCircle,
  AlertCircle,
  Ticket,
  Filter,
} from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AdminMonthlyPassesPage() {
  const [passes, setPasses] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  async function loadPasses() {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedVenue !== "all") params.append("venueId", selectedVenue);
      if (selectedMonth !== "all") params.append("month", selectedMonth);
      if (selectedStatus !== "all") params.append("status", selectedStatus);

      const res = await fetch(`/api/v1/admin/passes?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPasses(data.passes);
      }
    } catch (e) {
      console.error("Failed to load monthly passes", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/v1/venues")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setVenues(d.venues);
      });
  }, []);

  useEffect(() => {
    loadPasses();
  }, [selectedVenue, selectedMonth, selectedStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPasses();
  };

  const activePasses = passes.filter((p) => p.status === "active");
  const totalSessionsCount = activePasses.reduce((acc, p) => acc + (p.totalSessions || 0), 0);
  const totalPassRevenue = passes
    .filter((p) => p.paymentStatus === "successful")
    .reduce((acc, p) => acc + (p.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-emerald-600" />
            <span>Monthly Passes</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue and manage recurring monthly court passes for players and coaching members
          </p>
        </div>

        <Link href="/admin/passes/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-1.5 text-xs">
            <PlusCircle className="w-4 h-4" />
            <span>Issue New Monthly Pass</span>
          </Button>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Active Passes</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {activePasses.length}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">
                Current month subscriptions
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Total Reserved Slots</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {totalSessionsCount}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Scheduled recurring court hours
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Pass Revenue</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block tabular-nums">
                {formatCurrency(totalPassRevenue)}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Collected from issued passes
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <Input
                  type="text"
                  placeholder="Search by Pass ID (PASS-202610...), Name, or Mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 text-xs sm:text-sm h-10"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary" className="font-bold text-xs">
                Search
              </Button>
            </form>

            {/* Venue Filter */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="w-full sm:w-40 h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Venues</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>

              {/* Month Filter */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-36 h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Months</option>
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full sm:w-32 h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Passes Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : passes.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No Monthly Passes Found"
              description="No monthly passes match your current search or filters. Create a monthly pass to book every Sunday or recurring slots for an entire month."
              actionLabel="Issue New Monthly Pass"
              onAction={() => {
                window.location.href = "/admin/passes/new";
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">Pass Number</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Venue & Court</th>
                    <th className="p-4">Recurring Schedule</th>
                    <th className="p-4">Sessions</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {passes.map((p) => {
                    const monthLabel = MONTH_NAMES[(p.month || 1) - 1];
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4 pl-6 font-mono font-bold text-slate-900">
                          <Link
                            href={`/admin/passes/${p.id}`}
                            className="text-emerald-700 hover:text-emerald-900 hover:underline"
                          >
                            {p.passNumber}
                          </Link>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-slate-900">{p.customer?.name}</div>
                          <span className="text-slate-400 text-[11px]">{p.customer?.phone}</span>
                        </td>

                        <td className="p-4">
                          <div className="font-semibold text-slate-800">{p.venue?.name}</div>
                          <span className="text-slate-400 text-[11px]">{p.resource?.name}</span>
                        </td>

                        <td className="p-4">
                          <div className="font-semibold text-slate-800">
                            {monthLabel} {p.year}
                          </div>
                          <span className="text-emerald-700 font-medium text-[11px] block">
                            {p.daysLabel} • {formatTimeRange(p.startTimeStr, p.endTimeStr)}
                          </span>
                        </td>

                        <td className="p-4 font-bold tabular-nums text-slate-800">
                          {p.totalSessions} slots
                        </td>

                        <td className="p-4">
                          <div className="font-bold tabular-nums text-slate-900">
                            {formatCurrency(p.totalAmount)}
                          </div>
                          <span className="text-[10px] text-slate-400 capitalize block">
                            via {p.paymentMethod}
                          </span>
                        </td>

                        <td className="p-4">
                          <Badge
                            className={
                              p.status === "active"
                                ? "bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px] border-0"
                                : p.status === "completed"
                                ? "bg-sky-100 text-sky-800 font-bold uppercase text-[10px] border-0"
                                : "bg-rose-100 text-rose-800 font-bold uppercase text-[10px] border-0"
                            }
                          >
                            {p.status}
                          </Badge>
                        </td>

                        <td className="p-4 text-right pr-6 whitespace-nowrap">
                          <Link href={`/admin/passes/${p.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 gap-1 text-xs font-semibold">
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>View Pass</span>
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
