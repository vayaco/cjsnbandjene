"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { formatCurrency, formatTime, formatTimeRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle, AlertCircle, Plus } from "lucide-react";

export default function NewManualBookingPage() {
  const router = useRouter();

  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [availability, setAvailability] = useState<any>(null);

  // Form selections
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);

  // Load venues
  useEffect(() => {
    fetch("/api/v1/venues")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.venues.length > 0) {
          setVenues(d.venues);
          setSelectedVenueId(d.venues[0].id);
        }
      })
      .finally(() => {
        setIsLoadingVenues(false);
      });
  }, []);

  // Load availability
  useEffect(() => {
    if (!selectedVenueId || !selectedDate) return;

    fetch(`/api/v1/availability?venueId=${selectedVenueId}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setAvailability(d.availability);
          setSelectedSlot(null);
        }
      });
  }, [selectedVenueId, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setError("Please select an available court slot.");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Customer name and phone number are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: selectedVenueId,
          resourceId: selectedSlot.resourceId,
          dateStr: selectedDate,
          startTimeStr: selectedSlot.startTime,
          endTimeStr: selectedSlot.endTime,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          paymentMethod,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.booking) {
        router.push("/admin/bookings");
      } else {
        setError(data.error || "Failed to create booking.");
      }
    } catch {
      setError("Network error while creating booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/admin/bookings"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Bookings</span>
      </Link>

      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Manual Booking</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Record walk-in, phone reservation, or desk payment
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {venues.length === 0 && !isLoadingVenues && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>You haven&apos;t created any venues yet. Please set up a venue before booking slots.</span>
          </div>
          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 text-xs">
            <Link href="/admin/venues">Create Venue</Link>
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Venue & Date */}
        <Card className="border-slate-200/90 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold">1. Select Venue & Date</CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Venue</label>
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
              >
                {venues.length === 0 ? (
                  <option value="">No venues available</option>
                ) : (
                  venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <Input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold"
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Slot Selection */}
        <Card className="border-slate-200/90 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold">2. Choose Available Court Slot</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {!selectedVenueId ? (
              <p className="text-xs text-slate-400">Please select a venue above to view available court slots.</p>
            ) : !availability ? (
              <p className="text-xs text-slate-400">Loading court availability...</p>
            ) : (
              <div className="space-y-4">
                {availability.resources.map((res: any) => {
                  const openSlots = res.slots.filter((s: any) => s.status === "available");

                  return (
                    <div key={res.resourceId} className="space-y-2">
                      <span className="text-xs font-bold text-slate-800">{res.resourceName}</span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {openSlots.length === 0 ? (
                          <span className="text-xs text-slate-400 col-span-3">
                            No open slots available
                          </span>
                        ) : (
                          openSlots.map((slot: any) => {
                            const isSelected = selectedSlot?.slotId === slot.slotId;
                            return (
                              <button
                                key={slot.slotId}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                className={`p-2.5 rounded-xl border text-center transition-all ${
                                  isSelected
                                    ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                    : "bg-white border-slate-200 hover:border-emerald-500 text-slate-800"
                                }`}
                              >
                                <span className="block text-xs font-bold">
                                  {formatTime(slot.startTime)}
                                </span>
                                <span className="text-[10px] text-emerald-500 font-extrabold">
                                  {formatCurrency(slot.price)}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Customer & Payment Method */}
        <Card className="border-slate-200/90 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold">3. Customer Details & Payment</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Rohan Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                <Input
                  type="tel"
                  required
                  placeholder="e.g. 9820011223"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="cash">Cash at Desk</option>
                  <option value="upi">Manual UPI / QR</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="complimentary">Complimentary / Manager Override</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Internal Notes</label>
                <Input
                  type="text"
                  placeholder="e.g. Regular coaching player"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {selectedSlot && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Selected Court Slot</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedSlot.resourceName} • {formatTimeRange(selectedSlot.startTime, selectedSlot.endTime)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total Due</span>
                  <span className="text-lg font-black text-emerald-600">
                    {formatCurrency(selectedSlot.price)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={isSubmitting || !selectedSlot}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold"
        >
          {isSubmitting ? "Confirming Booking..." : "Confirm & Save Manual Booking"}
        </Button>
      </form>
    </div>
  );
}
