"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { formatCurrency, formatTimeRange } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Download,
  Share2,
  Navigation,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
} from "lucide-react";

export default function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBooking() {
      try {
        const res = await fetch(`/api/v1/bookings/${bookingId}`);
        const data = await res.json();
        if (data.success && data.booking) {
          setBooking(data.booking);
          // Trigger celebratory confetti
          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
              colors: ["#10b981", "#06b6d4", "#f59e0b", "#3b82f6"],
            });
          } catch {}
        } else {
          setError(data.error || "Booking not found.");
        }
      } catch (err) {
        setError("Failed to retrieve booking information.");
      } finally {
        setIsLoading(false);
      }
    }

    loadBooking();
  }, [bookingId]);

  const handleDownloadReceipt = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading your confirmed booking...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Booking Not Found</h2>
          <p className="text-sm text-slate-500">{error || "Unable to locate this reservation."}</p>
          <Link href="/">
            <Button className="w-full">Return to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isCancelled = booking.status === "cancelled";

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Success / Status Banner */}
        <div className="text-center space-y-2">
          {!isCancelled ? (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 shadow-md shadow-emerald-500/20 mb-2">
              <CheckCircle className="w-9 h-9 stroke-[2.5]" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 shadow-md shadow-rose-500/20 mb-2">
              <AlertTriangle className="w-9 h-9" />
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {!isCancelled ? "Booking Confirmed!" : "Booking Cancelled"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {!isCancelled
              ? "Your court is reserved. Present this booking pass at the venue entrance."
              : "This reservation has been cancelled."}
          </p>
        </div>

        {/* Digital Ticket / Pass Card */}
        <Card className="border-slate-200/90 shadow-lg overflow-hidden bg-white print:border-none print:shadow-none">
          {/* Ticket Header */}
          <div className="bg-slate-900 text-white p-6 text-center relative">
            <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold block">
              SmashZone Pass
            </span>
            <div className="mt-1 text-2xl font-black tracking-wider font-mono text-white">
              {booking.bookingNumber}
            </div>
            <p className="text-xs text-slate-400 mt-1">{booking.venue?.name}</p>
          </div>

          {/* Ticket Body */}
          <CardContent className="p-6 space-y-5">
            {/* Court and Date Highlights */}
            <div className="grid grid-cols-2 gap-4 pb-5 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">
                  Court
                </span>
                <span className="text-lg font-black text-slate-900">
                  {booking.resource?.name}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">
                  Status
                </span>
                <Badge
                  className={
                    !isCancelled
                      ? "bg-emerald-100 text-emerald-800 font-bold text-xs"
                      : "bg-rose-100 text-rose-800 font-bold text-xs"
                  }
                >
                  {!isCancelled ? "Confirmed & Paid" : "Cancelled"}
                </Badge>
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-3 pb-5 border-b border-slate-100 text-xs sm:text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block font-medium text-xs">Reserved Date</span>
                  <span className="font-bold text-slate-800">
                    {new Date(booking.startAt).toLocaleDateString("en-US", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block font-medium text-xs">Time Duration</span>
                  <span className="font-bold text-slate-800">
                    {formatTimeRange(booking.startTimeStr, booking.endTimeStr)} (60 Minutes)
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block font-medium text-xs">Venue Location</span>
                  <span className="font-semibold text-slate-800 leading-snug">
                    {booking.venue?.address}, {booking.venue?.city}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer & Payment Info */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Player Name</span>
                <span className="font-bold text-slate-800">{booking.customer?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Contact</span>
                <span className="font-bold text-slate-800">{booking.customer?.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Total Paid</span>
                <span className="font-extrabold text-emerald-600 text-base">
                  {formatCurrency(booking.total)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Payment Method</span>
                <span className="font-semibold text-slate-700 capitalize">
                  {booking.paymentMethod === "placeholder" ? "Demo Preview" : booking.paymentMethod}
                </span>
              </div>
            </div>

            {/* Cancellation Notice */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 block">Cancellation Policy:</span>
              <p>
                Full refund if cancelled &gt;24 hours before slot. 50% refund between 6–24 hours.
                Non-refundable within 6 hours of match time.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
          <Button
            onClick={handleDownloadReceipt}
            variant="outline"
            className="h-12 rounded-xl font-bold gap-2 text-xs sm:text-sm"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Download Receipt / Print</span>
          </Button>

          {booking.venue?.googleMapsUrl ? (
            <a
              href={booking.venue.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl font-bold gap-2 text-xs sm:text-sm"
              >
                <Navigation className="w-4 h-4 text-emerald-600" />
                <span>Get Directions</span>
              </Button>
            </a>
          ) : (
            <Link href="/find-booking" className="w-full">
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl font-bold gap-2 text-xs sm:text-sm"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                <span>Find My Booking</span>
              </Button>
            </Link>
          )}

          <div className="sm:col-span-2 pt-2">
            <Link href={`/v/${booking.venue?.slug || ""}`} className="block w-full">
              <Button className="w-full h-13 rounded-2xl font-black text-sm sm:text-base bg-emerald-600 hover:bg-emerald-700 shadow-md gap-2">
                <span>Book Another Slot</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
