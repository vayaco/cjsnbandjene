"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatTimeRange } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
} from "lucide-react";

export default function FindBookingPage() {
  const [bookingNumber, setBookingNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpiredNotice, setIsExpiredNotice] = useState(false);

  // Cancellation state
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingNumber.trim() && !phone.trim()) {
      setError("Please provide a Booking ID or Phone Number.");
      return;
    }

    setIsSearching(true);
    setError(null);
    setBooking(null);
    setIsExpiredNotice(false);
    setCancelSuccessMessage(null);

    try {
      const res = await fetch("/api/v1/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingNumber: bookingNumber.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.status === 410 || data.expired) {
        setIsExpiredNotice(true);
      } else if (data.success && data.booking) {
        setBooking(data.booking);
      } else {
        setError(data.error || "No matching booking found. Please check your reference code.");
      }
    } catch {
      setError("Network error while searching for booking.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this booking? This action cannot be undone."
    );
    if (!confirmCancel) return;

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/v1/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Customer cancelled via self-service recovery page",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBooking(data.booking);
        setCancelSuccessMessage(
          `Booking successfully cancelled. Refund eligible: ${data.refundPercent}% (${formatCurrency(
            data.refundAmount
          )}).`
        );
      } else {
        setError(data.error || "Failed to cancel booking.");
      }
    } catch {
      setError("Network error during cancellation.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Find Your Booking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enter your unique Booking ID (e.g. NA000101) to view match details, venue location, or download your invoice.
          </p>
        </div>

        {/* Lookup Form */}
        <Card className="border-slate-200/90 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Booking ID (e.g. NA000101) *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. NA000101"
                  value={bookingNumber}
                  onChange={(e) => setBookingNumber(e.target.value)}
                  className="font-mono uppercase text-base tracking-wider"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Mobile Number (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">For phone-based lookup</span>
                </div>
                <Input
                  type="tel"
                  placeholder="e.g. 98200 11223"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-base"
                />
              </div>

              <Button
                type="submit"
                disabled={isSearching}
                className="w-full h-12 font-bold bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                {isSearching ? (
                  <span>Searching...</span>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Lookup Reservation</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isExpiredNotice && (
          <Card className="border-amber-200 bg-amber-50/70 p-5 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Customer Access Link Expired
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  For your privacy and security, public online access links expire 7 days after booking creation.
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your booking record and payment confirmation remain permanently and securely preserved in our system. Please contact the venue front desk directly if you need assistance or an invoice copy.
                </p>
              </div>
            </div>
          </Card>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {cancelSuccessMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{cancelSuccessMessage}</span>
          </div>
        )}

        {/* Found Booking Card */}
        {booking && (
          <Card className="border-slate-200 shadow-md overflow-hidden bg-white animate-in slide-in-from-bottom-2">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-emerald-400 font-mono font-bold block">
                  Reference: {booking.bookingNumber}
                </span>
                <h3 className="text-base font-bold mt-0.5">{booking.venue?.name}</h3>
              </div>
              <Badge
                className={
                  booking.status === "confirmed"
                    ? "bg-emerald-500 text-white font-bold text-xs"
                    : "bg-rose-500 text-white font-bold text-xs"
                }
              >
                {booking.status === "confirmed" ? "Confirmed" : booking.status}
              </Badge>
            </div>

            <CardContent className="p-5 space-y-4">
              {/* Location & Time Highlights */}
              <div className="space-y-2.5 pb-4 border-b border-slate-100 text-xs">
                <div className="flex items-start gap-2.5 text-slate-700">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">{booking.venue?.name}</span>
                    <span className="text-slate-500">{booking.venue?.address}, {booking.venue?.city}</span>
                    {booking.venue?.phone && (
                      <span className="block text-slate-400 mt-0.5">Desk Phone: {booking.venue.phone}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-slate-700">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong className="text-slate-900">Date:</strong> {booking.dateStr}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-slate-700">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong className="text-slate-900">Time:</strong> {formatTimeRange(booking.startTimeStr, booking.endTimeStr)} (60 Mins)
                  </span>
                </div>
              </div>

              {/* Court & Customer Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Assigned Court</span>
                  <span className="font-extrabold text-slate-800 text-sm">
                    {booking.resource?.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Total Paid</span>
                  <span className="font-extrabold text-emerald-600 text-sm">
                    {formatCurrency(booking.total)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Customer Name</span>
                  <span className="font-bold text-slate-800">{booking.customer?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Customer Phone</span>
                  <span className="font-bold text-slate-800">{booking.customer?.phone}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
                <Link href={`/booking/${booking.bookingNumber}`} className="w-full sm:flex-1">
                  <Button className="w-full text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Full Invoice & Pass</span>
                  </Button>
                </Link>

                {booking.status === "confirmed" && (
                  <Button
                    variant="outline"
                    onClick={handleCancelBooking}
                    disabled={isCancelling}
                    className="w-full sm:w-auto text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200"
                  >
                    {isCancelling ? "Cancelling..." : "Cancel Booking"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
