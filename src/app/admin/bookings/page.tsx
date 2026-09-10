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
  Search,
  PlusCircle,
  Building2,
  Ticket,
  Filter,
  FileDown,
  XCircle,
  Eye,
} from "lucide-react";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  async function loadBookings() {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedVenue !== "all") params.append("venueId", selectedVenue);
      if (selectedStatus !== "all") params.append("status", selectedStatus);

      const res = await fetch(`/api/v1/admin/bookings?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (e) {
      console.error("Failed to load bookings", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // Fetch venues for filter dropdown
    fetch("/api/v1/venues")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setVenues(d.venues);
      });
  }, []);

  useEffect(() => {
    loadBookings();
  }, [selectedVenue, selectedStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadBookings();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bookings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage, filter, and inspect all customer reservations
          </p>
        </div>

        <Link href="/admin/bookings/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-1.5 text-xs">
            <PlusCircle className="w-4 h-4" />
            <span>Create Manual Booking</span>
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <Input
                  type="text"
                  placeholder="Search by ID (SZ-...), Name, or Mobile..."
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
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="w-full md:w-44 h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Venues</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full md:w-36 h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card className="border-slate-200/90 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No bookings found"
              description="There are no reservations matching your current search or filters."
              actionLabel="Reset Filters"
              onAction={() => {
                setSearch("");
                setSelectedVenue("all");
                setSelectedStatus("all");
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">Booking ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Venue & Court</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 pl-6 font-mono font-bold text-slate-900">
                        {b.bookingNumber}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{b.customer?.name}</div>
                        <span className="text-slate-400 text-[11px]">{b.customer?.phone}</span>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{b.venue?.name}</div>
                        <span className="text-slate-400 text-[11px]">{b.resource?.name}</span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{b.dateStr}</div>
                        <span className="text-slate-500 text-[11px]">
                          {formatTimeRange(b.startTimeStr, b.endTimeStr)}
                        </span>
                      </td>
                      <td className="p-4 font-black text-slate-900">
                        {formatCurrency(b.total)}
                      </td>
                      <td className="p-4">
                        <Badge
                          className={
                            b.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-800 font-bold text-[10px]"
                              : "bg-rose-100 text-rose-800 font-bold text-[10px]"
                          }
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <Link href={`/booking/${b.bookingNumber}`} target="_blank">
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 gap-1 text-xs">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ticket</span>
                          </Button>
                        </Link>
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
