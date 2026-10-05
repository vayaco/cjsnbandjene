"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatTime, formatTimeRange, normalizePhone } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  ArrowLeft,
  Calendar,
  Clock,
  Building2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Ticket,
  Check,
} from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = [
  { id: 0, label: "Sun", fullName: "Sunday" },
  { id: 1, label: "Mon", fullName: "Monday" },
  { id: 2, label: "Tue", fullName: "Tuesday" },
  { id: 3, label: "Wed", fullName: "Wednesday" },
  { id: 4, label: "Thu", fullName: "Thursday" },
  { id: 5, label: "Fri", fullName: "Friday" },
  { id: 6, label: "Sat", fullName: "Saturday" },
];

export default function NewMonthlyPassPage() {
  const router = useRouter();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Venues and Courts
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [courts, setCourts] = useState<any[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState("");

  // Customer Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Schedule Configuration
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedDays, setSelectedDays] = useState<number[]>([0]); // Default: Sunday (0)
  const [startTimeStr, setStartTimeStr] = useState("07:00");
  const [endTimeStr, setEndTimeStr] = useState("08:00");

  // Conflict Scanner & Dates
  const [previewSessions, setPreviewSessions] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Pricing & Payment
  const [customTotalAmount, setCustomTotalAmount] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState("successful");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Fetch Venues and their Courts from Admin API
  useEffect(() => {
    fetch("/api/v1/admin/venues")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.venues.length > 0) {
          setVenues(d.venues);
          const firstVenue = d.venues[0];
          setSelectedVenueId(firstVenue.id);

          const activeCourts = (firstVenue.resources || []).filter(
            (r: any) => r.status !== "inactive"
          );
          setCourts(activeCourts);
          if (activeCourts.length > 0) {
            setSelectedCourtId(activeCourts[0].id);
          }
        }
      })
      .catch((err) => console.error("Error loading admin venues:", err));
  }, []);

  // 2. Synchronous handler when user changes venue
  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId);
    const v = venues.find((x) => x.id === venueId);
    if (v) {
      const activeCourts = (v.resources || []).filter(
        (r: any) => r.status !== "inactive"
      );
      setCourts(activeCourts);
      if (activeCourts.length > 0) {
        setSelectedCourtId(activeCourts[0].id);
      } else {
        setSelectedCourtId("");
      }
    } else {
      setCourts([]);
      setSelectedCourtId("");
    }
  };

  // 3. Auto update endTime when startTime changes (1 hour default)
  const handleStartTimeChange = (val: string) => {
    setStartTimeStr(val);
    const [h, m] = val.split(":").map(Number);
    const nextH = Math.min(23, h + 1);
    setEndTimeStr(`${String(nextH).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  // 4. Fetch Preview Schedule whenever parameters change
  useEffect(() => {
    if (!selectedVenueId || !selectedCourtId || selectedDays.length === 0) return;

    let isMounted = true;
    setIsLoadingPreview(true);
    setPreviewError(null);

    fetch("/api/v1/admin/passes/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueId: selectedVenueId,
        resourceId: selectedCourtId,
        year: selectedYear,
        month: selectedMonth,
        daysOfWeek: selectedDays,
        startTimeStr,
        endTimeStr,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!isMounted) return;
        if (d.success) {
          setPreviewSessions(d.sessions);
          // Set default custom price if empty
          if (!customTotalAmount) {
            setCustomTotalAmount(String(d.suggestedTotal));
          }
        } else {
          setPreviewError(d.error || "Failed to calculate pass schedule");
        }
      })
      .catch(() => {
        if (isMounted) setPreviewError("Network error while generating pass preview");
      })
      .finally(() => {
        if (isMounted) setIsLoadingPreview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    selectedVenueId,
    selectedCourtId,
    selectedYear,
    selectedMonth,
    selectedDays,
    startTimeStr,
    endTimeStr,
  ]);

  // Preset Day Shortcuts
  const applyPreset = (days: number[]) => {
    setSelectedDays(days);
  };

  const toggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length === 1) return; // Keep at least one day
      setSelectedDays(selectedDays.filter((d) => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId].sort());
    }
  };

  const toggleSessionDate = (dateStr: string) => {
    setPreviewSessions((prev) =>
      prev.map((s) => (s.dateStr === dateStr ? { ...s, selected: !s.selected } : s))
    );
  };

  // Compute selected count & suggested cost
  const selectedDatesList = previewSessions.filter((s) => s.selected).map((s) => s.dateStr);
  const calculatedSubtotal = previewSessions
    .filter((s) => s.selected)
    .reduce((sum, s) => sum + s.price, 0);

  // Label for days
  const getDaysLabel = () => {
    if (selectedDays.length === 1) {
      return `Every ${DAYS_OF_WEEK.find((d) => d.id === selectedDays[0])?.fullName}`;
    }
    if (selectedDays.length === 2 && selectedDays.includes(0) && selectedDays.includes(6)) {
      return "Every Weekend (Sat & Sun)";
    }
    if (selectedDays.length === 5 && !selectedDays.includes(0) && !selectedDays.includes(6)) {
      return "Weekdays (Mon to Fri)";
    }
    return selectedDays.map((d) => DAYS_OF_WEEK.find((x) => x.id === d)?.label).join(", ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (selectedDatesList.length === 0) {
      setFormError("Please select at least one available session date for this pass.");
      return;
    }

    if (!customerName.trim()) {
      setFormError("Player / Customer name is required.");
      return;
    }

    const cleanPhone = normalizePhone(customerPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      setFormError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const finalAmount = parseFloat(customTotalAmount) || calculatedSubtotal;
      const pricePerSession = finalAmount / selectedDatesList.length;

      const res = await fetch("/api/v1/admin/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: selectedVenueId,
          resourceId: selectedCourtId,
          year: selectedYear,
          month: selectedMonth,
          daysOfWeek: selectedDays,
          daysLabel: getDaysLabel(),
          startTimeStr,
          endTimeStr,
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          customerEmail: customerEmail.trim() || undefined,
          selectedDates: selectedDatesList,
          pricePerSession,
          totalAmount: finalAmount,
          paymentStatus,
          paymentMethod,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.pass) {
        router.push(`/admin/passes/${data.pass.id}`);
      } else {
        setFormError(data.error || "Failed to issue monthly pass.");
      }
    } catch {
      setFormError("Network error while creating monthly pass.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/admin/passes"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Monthly Passes</span>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Layers className="w-6 h-6 text-emerald-600" />
          <span>Issue Monthly Pass</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Book recurring court slots for an entire month (e.g. Every Sunday in October)
        </p>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Customer Details */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Player / Pass Holder Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Player Name *</label>
              <Input
                required
                placeholder="e.g. Rohan Sharma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Mobile Number *</label>
              <Input
                required
                type="tel"
                placeholder="e.g. 9820011223"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email (Optional)</label>
              <Input
                type="email"
                placeholder="e.g. rohan@gmail.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Venue, Court & Time */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                2
              </span>
              <span>Venue, Court & Preferred Time Slot</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Venue</label>
                <select
                  value={selectedVenueId}
                  onChange={(e) => handleVenueChange(e.target.value)}
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
                <label className="block font-bold text-slate-700 mb-1">Select Court</label>
                <select
                  value={selectedCourtId}
                  onChange={(e) => setSelectedCourtId(e.target.value)}
                  disabled={courts.length === 0}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none disabled:opacity-60"
                >
                  {courts.length === 0 ? (
                    <option value="">No courts configured for this venue</option>
                  ) : (
                    courts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.resourceType || "court"}) - {formatCurrency(c.defaultPrice)}/hr
                      </option>
                    ))
                  )}
                </select>
                {courts.length === 0 && (
                  <span className="text-[10px] text-amber-600 font-semibold block mt-1">
                    No courts found for this venue. Please add courts in Venues & Courts.
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Slot Start Time</label>
                <select
                  value={startTimeStr}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none font-mono"
                >
                  {[
                    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
                    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
                    "18:00", "19:00", "20:00", "21:00", "22:00"
                  ].map((t) => (
                    <option key={t} value={t}>
                      {formatTime(t)} ({t})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Slot End Time</label>
                <select
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none font-mono"
                >
                  {[
                    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
                    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
                    "19:00", "20:00", "21:00", "22:00", "23:00"
                  ].map((t) => (
                    <option key={t} value={t}>
                      {formatTime(t)} ({t})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Month & Recurring Days Pattern */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                3
              </span>
              <span>Month & Recurring Schedule Pattern</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            {/* Month & Year Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pass Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pass Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recurring Day Presets */}
            <div>
              <span className="block font-bold text-slate-700 mb-2">Recurring Schedule Preset</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => applyPreset([0])}
                  className={`text-xs font-bold ${
                    selectedDays.length === 1 && selectedDays[0] === 0
                      ? "bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
                      : "text-slate-700"
                  }`}
                >
                  Every Sunday
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => applyPreset([6])}
                  className={`text-xs font-bold ${
                    selectedDays.length === 1 && selectedDays[0] === 6
                      ? "bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
                      : "text-slate-700"
                  }`}
                >
                  Every Saturday
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => applyPreset([0, 6])}
                  className={`text-xs font-bold ${
                    selectedDays.length === 2 && selectedDays.includes(0) && selectedDays.includes(6)
                      ? "bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
                      : "text-slate-700"
                  }`}
                >
                  Weekends (Sat & Sun)
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => applyPreset([1, 2, 3, 4, 5])}
                  className={`text-xs font-bold ${
                    selectedDays.length === 5 && !selectedDays.includes(0) && !selectedDays.includes(6)
                      ? "bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
                      : "text-slate-700"
                  }`}
                >
                  Weekdays (Mon - Fri)
                </Button>
              </div>
            </div>

            {/* Individual Day Buttons */}
            <div>
              <span className="block font-bold text-slate-700 mb-1.5">Or Choose Specific Days</span>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {DAYS_OF_WEEK.map((d) => {
                  const isSelected = selectedDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDay(d.id)}
                      className={`h-11 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center ${
                        isSelected
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Live Schedule Scanner & Date Verification */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                4
              </span>
              <span>Generated Pass Sessions ({selectedDatesList.length} Confirmed)</span>
            </CardTitle>
            <Badge variant="outline" className="text-[11px] font-semibold">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </Badge>
          </CardHeader>
          <CardContent className="p-5 text-xs">
            {isLoadingPreview ? (
              <div className="py-8 text-center text-slate-400">
                Scanning calendar for available dates...
              </div>
            ) : previewError ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                {previewError}
              </div>
            ) : previewSessions.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                No matching days found in {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500">
                  Every selected date below will be atomically reserved in the database for this player. Uncheck any single date if the player wishes to skip it.
                </p>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {previewSessions.map((session) => {
                    const isAvailable = session.status === "available";
                    return (
                      <div
                        key={session.dateStr}
                        onClick={() => {
                          if (isAvailable) toggleSessionDate(session.dateStr);
                        }}
                        className={`p-3.5 flex items-center justify-between transition-colors ${
                          !isAvailable
                            ? "bg-slate-50/80 opacity-70 cursor-not-allowed"
                            : session.selected
                            ? "bg-emerald-50/40 hover:bg-emerald-50/70 cursor-pointer"
                            : "hover:bg-slate-50 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={session.selected}
                            disabled={!isAvailable}
                            onChange={() => {
                              if (isAvailable) toggleSessionDate(session.dateStr);
                            }}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {session.formattedDate}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {formatTimeRange(session.startTime, session.endTime)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          {isAvailable ? (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-100 text-emerald-800 border-0 font-bold text-[10px]">
                                Available
                              </Badge>
                              <span className="font-bold tabular-nums text-slate-800">
                                {formatCurrency(session.price)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-rose-100 text-rose-800 border-0 font-bold text-[10px]">
                                {session.status.toUpperCase()}
                              </Badge>
                              <span className="text-[11px] text-rose-600 font-medium">
                                {session.conflictReason}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 5: Pricing, Payment & Confirmation */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                5
              </span>
              <span>Pass Pricing & Payment Settlement</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Total Pass Amount (INR)
                </label>
                <Input
                  type="number"
                  required
                  value={customTotalAmount}
                  onChange={(e) => setCustomTotalAmount(e.target.value)}
                  className="text-sm font-bold text-emerald-600"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Calculated standard: {formatCurrency(calculatedSubtotal)} ({selectedDatesList.length} slots)
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="successful">Paid in Full</option>
                  <option value="pending">Payment Pending</option>
                  <option value="complimentary">Complimentary / Scholarship</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="cash">Cash (Front Desk)</option>
                  <option value="upi">Manual UPI / QR</option>
                  <option value="bank_transfer">Bank Transfer / NEFT</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="complimentary">Complimentary</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Internal Notes (Optional)</label>
              <Input
                placeholder="e.g. October Sunday morning batch reservation"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Live Pass Summary Banner */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-emerald-400 font-bold block uppercase tracking-wider">
                  Pass Summary
                </span>
                <span className="font-bold text-sm text-white block mt-0.5">
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear} • {getDaysLabel()}
                </span>
                <span className="text-xs text-slate-300 block">
                  {selectedDatesList.length} sessions reserved at {formatTimeRange(startTimeStr, endTimeStr)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Due</span>
                <span className="text-2xl font-black text-emerald-400 tabular-nums">
                  {formatCurrency(parseFloat(customTotalAmount) || calculatedSubtotal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || selectedDatesList.length === 0}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold text-sm text-white shadow-md"
        >
          {isSubmitting
            ? "Issuing Pass & Locking Slots..."
            : `Issue Monthly Pass (${selectedDatesList.length} Sessions Confirmed)`}
        </Button>
      </form>
    </div>
  );
}
