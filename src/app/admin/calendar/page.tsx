"use client";

import React, { useEffect, useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { formatTime, formatTimeRange, formatCurrency, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Building2,
  Clock,
  User,
  Phone,
  X,
  Plus,
} from "lucide-react";

export default function AdminCalendarPage() {
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [activeSlotDetail, setActiveSlotDetail] = useState<any>(null);

  // 1. Fetch Venues
  useEffect(() => {
    async function loadVenues() {
      try {
        const res = await fetch("/api/v1/venues");
        const data = await res.json();
        if (data.success && data.venues.length > 0) {
          setVenues(data.venues);
          setSelectedVenueId(data.venues[0].id);
        }
      } catch (e) {
        console.error("Failed to load venues", e);
      }
    }
    loadVenues();
  }, []);

  // 2. Fetch Availability when Venue or Date changes
  useEffect(() => {
    if (!selectedVenueId) return;

    async function loadCalendar() {
      try {
        setIsLoading(true);
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const res = await fetch(
          `/api/v1/availability?venueId=${selectedVenueId}&date=${dateStr}`
        );
        const data = await res.json();
        if (data.success) {
          setAvailability(data.availability);
        }
      } catch (e) {
        console.error("Failed to load calendar", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadCalendar();
  }, [selectedVenueId, selectedDate]);

  const handlePrevDay = () => setSelectedDate((d) => subDays(d, 1));
  const handleNextDay = () => setSelectedDate((d) => addDays(d, 1));
  const handleToday = () => setSelectedDate(new Date());

  return (
    <div className="space-y-6">
      {/* Calendar Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Court Calendar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational schedule and real-time court occupancy grid
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Venue Switcher */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Today
            </button>
            <span className="text-xs font-bold text-slate-900 px-2 min-w-[110px] text-center">
              {format(selectedDate, "EEE, d MMM yyyy")}
            </span>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 py-2 px-3 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-emerald-50 border border-emerald-300" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-slate-900" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-amber-100 border border-amber-300" />
          <span>Held (Checkout)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-200" />
          <span>Maintenance / Blocked</span>
        </div>
      </div>

      {/* Operational Matrix Grid */}
      <Card className="border-slate-200/90 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !availability?.resources?.length ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No courts configured for this venue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-3.5 pl-5 sticky left-0 bg-slate-50 z-10 w-36">Court</th>
                    {availability.timeHeaders.map((th: any) => (
                      <th key={th.startTime} className="p-3.5 text-center min-w-[90px]">
                        {formatTime(th.startTime)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {availability.resources.map((res: any) => (
                    <tr key={res.resourceId} className="hover:bg-slate-50/50">
                      <td className="p-3.5 pl-5 font-bold text-slate-900 sticky left-0 bg-white shadow-xs z-10">
                        <div>{res.resourceName}</div>
                        <span className="text-[10px] text-slate-400 font-normal capitalize">
                          {res.resourceType}
                        </span>
                      </td>

                      {res.slots.map((slot: any) => {
                        const isAvailable = slot.status === "available";
                        const isBooked = slot.status === "booked";
                        const isHeld = slot.status === "held";

                        return (
                          <td key={slot.slotId} className="p-1.5">
                            <button
                              onClick={() => setActiveSlotDetail(slot)}
                              className={cn(
                                "w-full h-14 rounded-xl flex flex-col items-center justify-center p-1 transition-all duration-150 text-center select-none",
                                isAvailable
                                  ? "bg-emerald-50/70 border border-emerald-200/80 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300"
                                  : isBooked
                                  ? "bg-slate-900 text-white shadow-xs"
                                  : isHeld
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-slate-100 text-slate-400 border border-slate-200 opacity-60"
                              )}
                            >
                              <span className="font-bold text-[11px] truncate w-full">
                                {isAvailable
                                  ? formatCurrency(slot.price)
                                  : isBooked
                                  ? "Booked"
                                  : isHeld
                                  ? "Holding"
                                  : "Blocked"}
                              </span>
                              <span
                                className={cn(
                                  "text-[9px]",
                                  isBooked ? "text-slate-400" : "opacity-75"
                                )}
                              >
                                {isAvailable ? "Open" : slot.status}
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Slot Details Modal */}
      {activeSlotDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Slot Information</h3>
              <button
                onClick={() => setActiveSlotDetail(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Court</span>
                <span className="font-bold text-slate-800">{activeSlotDetail.resourceName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Time Range</span>
                <span className="font-bold text-slate-800">
                  {formatTimeRange(activeSlotDetail.startTime, activeSlotDetail.endTime)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Price Rate</span>
                <span className="font-bold text-emerald-600 text-sm">
                  {formatCurrency(activeSlotDetail.price)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Current Status</span>
                <Badge
                  className={
                    activeSlotDetail.status === "available"
                      ? "bg-emerald-100 text-emerald-800"
                      : activeSlotDetail.status === "booked"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }
                >
                  {activeSlotDetail.status}
                </Badge>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100">
              <Button
                onClick={() => setActiveSlotDetail(null)}
                variant="outline"
                className="w-full text-xs font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
