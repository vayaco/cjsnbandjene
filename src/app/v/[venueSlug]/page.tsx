"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { DateStrip } from "@/components/booking/DateStrip";
import { SlotGrid } from "@/components/booking/SlotGrid";
import { StickySummaryBar } from "@/components/booking/StickySummaryBar";
import { GeneratedSlot, ResourceAvailability } from "@/lib/availability";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Phone, AlertCircle, X, Check, ShieldCheck, ZoomIn, ArrowLeft, Info } from "lucide-react";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import Link from "next/link";

export default function VenueBookingPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = use(params);
  const router = useRouter();

  const [venue, setVenue] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [resources, setResources] = useState<ResourceAvailability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  const [isLoadingVenue, setIsLoadingVenue] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayReason, setHolidayReason] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);

  // Customer Details Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Venue Details
  useEffect(() => {
    async function loadVenue() {
      try {
        setIsLoadingVenue(true);
        const res = await fetch(`/api/v1/venues/${venueSlug}`);
        const data = await res.json();
        if (data.success) {
          setVenue(data.venue);
        } else {
          setErrorMessage("Venue not found.");
        }
      } catch (err) {
        setErrorMessage("Failed to load venue.");
      } finally {
        setIsLoadingVenue(false);
      }
    }
    loadVenue();
  }, [venueSlug]);

  // 2. Fetch Availability when Date changes
  useEffect(() => {
    if (!venue?.id) return;

    async function loadAvailability() {
      try {
        setIsLoadingSlots(true);
        setErrorMessage(null);
        setSelectedSlot(null); // Reset selection on date change

        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const res = await fetch(`/api/v1/availability?venueId=${venue.id}&date=${dateStr}`);
        const data = await res.json();

        if (data.success && data.availability) {
          setIsHoliday(data.availability.isHoliday || false);
          setHolidayReason(data.availability.holidayReason || null);
          setResources(data.availability.resources);
          if (data.availability.resources.length > 0 && !selectedResourceId) {
            setSelectedResourceId(data.availability.resources[0].resourceId);
          }
        } else {
          setErrorMessage(data.error || "Failed to load court availability.");
        }
      } catch (err) {
        setErrorMessage("Network error loading court slots.");
      } finally {
        setIsLoadingSlots(false);
      }
    }

    loadAvailability();
  }, [venue?.id, selectedDate]);

  const handleSelectSlot = (slot: GeneratedSlot) => {
    if (slot.status !== "available") return;
    if (selectedSlot?.slotId === slot.slotId) {
      setSelectedSlot(null); // Toggle off
    } else {
      setSelectedSlot(slot);
      setErrorMessage(null);
    }
  };

  const handleContinue = () => {
    if (!selectedSlot) return;
    setShowDetailsModal(true);
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    if (!customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setErrorMessage("Please enter your email so your invoice can be sent, otherwise you may lose access to it.");
      return;
    }

    if (!selectedSlot || !venue) {
      setErrorMessage("Please select a court and time slot first.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const dateStr = format(selectedDate, "yyyy-MM-dd");

      // 1. Lock slot in database for 10 minutes
      const holdRes = await fetch("/api/v1/bookings/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: venue.id,
          resourceId: selectedSlot.resourceId,
          dateStr,
          startTimeStr: selectedSlot.startTime,
          endTimeStr: selectedSlot.endTime,
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          holdMinutes: 10,
        }),
      });

      const holdData = await holdRes.json();

      if (!holdRes.ok || !holdData.success) {
        setErrorMessage(holdData.error || "This slot is no longer available. Please choose another time.");
        setShowDetailsModal(false);
        // Refresh availability
        const res = await fetch(`/api/v1/availability?venueId=${venue.id}&date=${dateStr}`);
        const data = await res.json();
        if (data.success) {
          setResources(data.availability.resources);
          setSelectedSlot(null);
        }
        return;
      }

      // 2. Save checkout data and navigate to review & payment with holdToken
      const checkoutData = {
        venueId: venue.id,
        venueName: venue.name,
        venueSlug: venue.slug,
        venueAddress: venue.address,
        resourceId: selectedSlot.resourceId,
        resourceName: selectedSlot.resourceName,
        dateStr,
        dateFormatted: format(selectedDate, "EEEE, d MMMM yyyy"),
        startTimeStr: selectedSlot.startTime,
        endTimeStr: selectedSlot.endTime,
        price: selectedSlot.price,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerEmail: customerEmail.trim(),
        holdToken: holdData.holdToken,
        expiresAt: holdData.expiresAt,
      };

      sessionStorage.setItem("sb_checkout_slot", JSON.stringify(checkoutData));
      router.push(`/v/${venueSlug}/payment?holdToken=${holdData.holdToken}`);
    } catch (err: any) {
      setErrorMessage("Network connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingVenue) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl bg-slate-900 border border-slate-800" />
        <Skeleton className="h-16 w-full rounded-2xl bg-slate-900 border border-slate-800" />
        <Skeleton className="h-64 w-full rounded-2xl bg-slate-900 border border-slate-800" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Venue Not Found</h2>
        <p className="text-slate-400 text-sm mt-1">This booking link might be invalid or expired.</p>
        <Button onClick={() => router.push("/")} className="mt-6 bg-[#79FE0C] hover:bg-[#6de809] text-black font-bold">
          Browse All Venues
        </Button>
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-3.5 sm:px-4 py-3.5 sm:py-6 space-y-4 sm:space-y-6 text-white">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Venues</span>
      </Link>

      {/* Venue Header Banner */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 sm:p-5 shadow-xs overflow-hidden">
        {venue.imageUrl && (
          <div
            className="relative h-44 sm:h-64 w-full rounded-xl sm:rounded-2xl overflow-hidden mb-3.5 sm:mb-4 cursor-pointer group shadow-xs bg-slate-950"
            onClick={() => setShowLightbox(true)}
          >
            <img
              src={venue.imageUrl}
              alt={venue.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs backdrop-blur-[2px]">
              <ZoomIn className="w-4 h-4 text-[#79FE0C]" />
              <span>Click to View Full Photo</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                {venue.name}
              </h1>
              <Badge className="bg-[#79FE0C]/10 text-[#79FE0C] border border-[#79FE0C]/30 font-semibold text-[11px] sm:text-xs">
                Academy Code: <span className="font-mono font-bold ml-1">{venue.code}</span>
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-[#79FE0C] shrink-0" />
              <span>{venue.address}, {venue.city}</span>
            </div>
            {venue.phone && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Front Desk: <span className="font-mono tabular-nums text-slate-300">{venue.phone}</span></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs sm:text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Booking Flow Step Indicator */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl text-[11px] sm:text-xs font-semibold shadow-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 text-[#79FE0C]">
          <span className="w-5 h-5 rounded-full bg-[#79FE0C] text-black flex items-center justify-center text-[10px] sm:text-[11px] font-bold font-mono shrink-0">1</span>
          <span className="hidden sm:inline">Choose Court & Time</span>
          <span className="sm:hidden">Select Slot</span>
        </div>
        <span className="text-slate-600">→</span>
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400">
          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] sm:text-[11px] font-bold font-mono shrink-0">2</span>
          <span className="hidden sm:inline">Player Details</span>
          <span className="sm:hidden">Details</span>
        </div>
        <span className="text-slate-600">→</span>
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400">
          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] sm:text-[11px] font-bold font-mono shrink-0">3</span>
          <span className="hidden sm:inline">Review & Pay</span>
          <span className="sm:hidden">Payment</span>
        </div>
      </div>

      {/* Choose a Date */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3 sm:p-4 shadow-xs space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
          Choose a Date
        </span>
        <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>

      {/* Choose a Court & Time */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Choose a Court and Time Slot
          </span>
          <span className="hidden sm:inline-block text-xs text-slate-400 font-medium">
            Standard 60-Minute Slots
          </span>
        </div>
        {isLoadingSlots ? (
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28 rounded-xl bg-slate-800" />
              <Skeleton className="h-10 w-28 rounded-xl bg-slate-800" />
              <Skeleton className="h-10 w-28 rounded-xl bg-slate-800" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl bg-slate-800" />
              ))}
            </div>
          </div>
        ) : isHoliday ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-amber-950/40 border border-amber-800/60 rounded-full flex items-center justify-center text-amber-400 mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Venue Closed</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              This venue is closed on {format(selectedDate, "MMM do")}.
              {holidayReason && <span className="block mt-1 font-medium text-amber-400">Reason: {holidayReason}</span>}
            </p>
          </div>
        ) : (
          <SlotGrid
            resources={resources}
            selectedSlot={selectedSlot}
            onSelectSlot={handleSelectSlot}
            selectedResourceId={selectedResourceId}
            onSelectResource={setSelectedResourceId}
          />
        )}
      </div>

      {/* Step 3: Sticky Bottom Bar */}
      <StickySummaryBar
        venueName={venue.name}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        onContinue={handleContinue}
      />

      {/* Step 4: Customer Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 rounded-t-[28px] sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-800 animate-in slide-in-from-bottom sm:zoom-in-95 max-h-[90vh] overflow-y-auto text-white">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Your Contact Details</h3>
                <p className="text-xs text-slate-400 mt-0.5">Booking confirmation will be sent here</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white tap-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProceedToPayment} className="mt-4 sm:mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Full Name *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="text-base h-11 bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus-visible:border-[#79FE0C] focus-visible:ring-[#79FE0C]/20"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Mobile Number (10 Digits) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-mono font-medium text-slate-400">
                    +91
                  </span>
                  <Input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98200 11223"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-13 text-base font-medium tracking-wide h-11 bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus-visible:border-[#79FE0C] focus-visible:ring-[#79FE0C]/20"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Used as your booking recovery ID. No passwords needed.
                </span>
              </div>

              <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-300">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Please enter your email so your invoice can be sent, otherwise you may lose access to it.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email Address *
                </label>
                <Input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="text-base h-11 bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus-visible:border-[#79FE0C] focus-visible:ring-[#79FE0C]/20"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl flex items-start gap-2.5 text-xs text-slate-300 border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-[#79FE0C] shrink-0 mt-0.5" />
                <span>
                  Zero spam. We only use your phone number to identify your court booking at the venue desk.
                </span>
              </div>

              <div className="pt-2 sm:pt-3 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 h-11 font-semibold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-11 font-bold bg-[#79FE0C] hover:bg-[#6de809] text-black shadow-[0_0_20px_rgba(121,254,12,0.3)]"
                >
                  Proceed to Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen Lightbox for Venue Photo */}
      <ImageLightbox
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        imageUrl={venue.imageUrl || ""}
        title={venue.name}
        description={`${venue.address}, ${venue.city}`}
      />
    </main>
  );
}
