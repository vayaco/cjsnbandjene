"use client";

import React, { useEffect, useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { formatTime, formatTimeRange, formatCurrency, cn, normalizePhone } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CheckCircle,
  ExternalLink,
  Ban,
  AlertCircle,
  Download,
} from "lucide-react";
import Link from "next/link";

export default function AdminCalendarPage() {
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<"day" | "week">("day");
  const [availability, setAvailability] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Detail Drawer / Modal
  const [activeSlotDetail, setActiveSlotDetail] = useState<any>(null);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);

  // Quick Manual Booking Form State
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualMethod, setManualMethod] = useState("cash");
  const [manualNotes, setManualNotes] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // 1. Fetch Venues
  useEffect(() => {
    async function loadVenues() {
      try {
        const res = await fetch("/api/v1/venues");
        const data = await res.json();
        if (data.success && data.venues.length > 0) {
          setVenues(data.venues);
          setSelectedVenueId(data.venues[0].id);
        } else {
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Failed to load venues", e);
        setIsLoading(false);
      }
    }
    loadVenues();
  }, []);

  // 2. Fetch Availability when Venue or Date changes
  const loadCalendar = async () => {
    if (!selectedVenueId) return;
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
  };

  useEffect(() => {
    loadCalendar();
  }, [selectedVenueId, selectedDate]);

  // Handle Slot Click
  const handleSlotClick = async (slot: any) => {
    setActiveSlotDetail(slot);
    setModalError(null);
    setManualName("");
    setManualPhone("");
    setManualNotes("");
    setManualMethod("cash");
    setBookingDetails(null);

    if (slot.status === "booked" && slot.bookingId) {
      try {
        setIsLoadingBooking(true);
        const res = await fetch(`/api/v1/bookings/${slot.bookingId}`);
        const data = await res.json();
        if (data.success) {
          setBookingDetails(data.booking);
        }
      } catch {
        // failed to fetch booking
      } finally {
        setIsLoadingBooking(false);
      }
    }
  };

  // Submit Quick Manual Booking
  const handleQuickManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSlotDetail || !selectedVenueId) return;

    const cleanPhone = normalizePhone(manualPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      setModalError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!manualName.trim()) {
      setModalError("Please enter customer name.");
      return;
    }

    setIsSubmittingManual(true);
    setModalError(null);

    try {
      const res = await fetch("/api/v1/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: selectedVenueId,
          resourceId: activeSlotDetail.resourceId,
          dateStr: format(selectedDate, "yyyy-MM-dd"),
          startTimeStr: activeSlotDetail.startTime,
          endTimeStr: activeSlotDetail.endTime,
          customerName: manualName.trim(),
          customerPhone: cleanPhone,
          paymentMethod: manualMethod,
          notes: manualNotes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setActiveSlotDetail(null);
        await loadCalendar();
      } else {
        setModalError(data.error || "Failed to create manual booking.");
      }
    } catch {
      setModalError("Network error. Please try again.");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Cancel Booking from Drawer
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking? The slot will immediately open for other players.")) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by venue manager via calendar" }),
      });

      const data = await res.json();
      if (data.success) {
        setActiveSlotDetail(null);
        await loadCalendar();
      } else {
        alert(data.error || "Failed to cancel booking.");
      }
    } catch {
      alert("Error cancelling booking.");
    }
  };

  const handlePrevDay = () => setSelectedDate((d) => subDays(d, calendarView === "week" ? 7 : 1));
  const handleNextDay = () => setSelectedDate((d) => addDays(d, calendarView === "week" ? 7 : 1));
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
          {/* Day / Week View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setCalendarView("day")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                calendarView === "day"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Day View
            </button>
            <button
              onClick={() => setCalendarView("week")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                calendarView === "week"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Week View
            </button>
          </div>

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
          <span>Available (Click for Quick Booking)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-slate-900" />
          <span>Booked (Click for Details)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-amber-100 border border-amber-300" />
          <span>Held in Checkout</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-200" />
          <span>Blocked / Maintenance</span>
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
          ) : venues.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">No Venues Added Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Please create a venue first to start viewing and managing court schedules.
              </p>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs">
                <Link href="/admin/venues">Go to Venues and Courts</Link>
              </Button>
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
                              onClick={() => handleSlotClick(slot)}
                              className={cn(
                                "w-full h-14 rounded-xl flex flex-col items-center justify-center p-1 transition-all duration-150 text-center select-none cursor-pointer",
                                isAvailable
                                  ? "bg-emerald-50/70 border border-emerald-200/80 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300"
                                  : isBooked
                                  ? "bg-slate-900 text-white shadow-xs hover:bg-slate-800"
                                  : isHeld
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed"
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

      {/* Slot Details and Quick Action Drawer / Modal */}
      {activeSlotDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {activeSlotDetail.status === "available" ? "Quick Manual Reservation" : "Slot Information"}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeSlotDetail.resourceName} • {formatTimeRange(activeSlotDetail.startTime, activeSlotDetail.endTime)}
                </p>
              </div>
              <button
                onClick={() => setActiveSlotDetail(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error in modal */}
            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* If Slot is Booked: Show Details and Actions */}
            {activeSlotDetail.status === "booked" ? (
              <div className="mt-4 space-y-4">
                {isLoadingBooking ? (
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                ) : bookingDetails ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Booking Number</span>
                        <span className="font-mono font-bold text-emerald-600 text-sm">
                          {bookingDetails.bookingNumber}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Customer</span>
                        <span className="font-bold text-slate-800">{bookingDetails.customer?.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Mobile</span>
                        <span className="font-bold text-slate-800">{bookingDetails.customer?.phone}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Amount Paid</span>
                        <span className="font-bold text-slate-800">{formatCurrency(bookingDetails.total)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Payment Method</span>
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                          {bookingDetails.paymentMethod?.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Customer Access</span>
                        {Date.now() - new Date(bookingDetails.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000 ? (
                          <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] font-medium">
                            Link expired (7d policy)
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-medium">
                            Active link
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <a href={`/api/v1/admin/bookings/${bookingDetails.id}/invoice`} download className="w-full">
                        <Button variant="outline" size="sm" className="w-full gap-2 text-xs font-bold">
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Download Official Tax Invoice (PDF)</span>
                        </Button>
                      </a>

                      <Button asChild variant="outline" size="sm" className="w-full gap-2 text-xs font-bold">
                        <Link href={`/booking/${bookingDetails.bookingNumber}`} target="_blank">
                          <span>View Official Invoice and Pass</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </Button>

                      {bookingDetails.status !== "cancelled" && (
                        <Button
                          onClick={() => handleCancelBooking(bookingDetails.id)}
                          variant="destructive"
                          size="sm"
                          className="w-full gap-1.5 text-xs font-bold"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancel This Reservation</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No booking details found for this slot.
                  </div>
                )}
              </div>
            ) : activeSlotDetail.status === "available" ? (
              /* If Slot is Available: Show Quick Booking Form */
              <form onSubmit={handleQuickManualBooking} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Player Name *</label>
                  <Input
                    required
                    placeholder="e.g. Ramesh Shah"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="text-xs"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <Input
                    required
                    type="tel"
                    placeholder="98200 12345"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={manualMethod}
                    onChange={(e) => setManualMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
                  >
                    <option value="cash">Cash (Front Desk)</option>
                    <option value="manual_upi">Manual UPI (Scanner)</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="pass">Player Pass / Package</option>
                    <option value="complimentary">Complimentary</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes (Optional)</label>
                  <Input
                    placeholder="e.g. Walk-in reservation"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveSlotDetail(null)}
                    className="flex-1 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingManual}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                  >
                    {isSubmittingManual ? "Reserving..." : "Confirm Reservation"}
                  </Button>
                </div>
              </form>
            ) : (
              /* Blocked or Held */
              <div className="mt-4 space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-slate-400 block font-medium">Status</span>
                  <span className="font-bold text-slate-800 capitalize">{activeSlotDetail.status}</span>
                  {activeSlotDetail.blockedReason && (
                    <span className="text-slate-500 block">{activeSlotDetail.blockedReason}</span>
                  )}
                </div>
                <Button onClick={() => setActiveSlotDetail(null)} variant="outline" className="w-full text-xs">
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
