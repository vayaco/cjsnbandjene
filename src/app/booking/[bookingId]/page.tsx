"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { formatCurrency, formatTimeRange } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  ChevronLeft,
  Download,
  Share2,
  Navigation,
  ArrowRight,
  AlertTriangle,
  Lock,
} from "lucide-react";

function BarcodeGraphic({ code }: { code: string }) {
  const bars = [
    3, 1, 2, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 2, 3,
    1, 2, 1, 3, 2, 1, 3, 1, 2, 2, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1,
    2, 3, 1, 2, 1, 3, 2, 1, 2, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2,
  ];

  let currentX = 2;
  return (
    <svg
      viewBox="0 0 240 60"
      className="w-full max-w-[270px] h-12 select-none"
      preserveAspectRatio="none"
    >
      {bars.map((width, idx) => {
        const x = currentX;
        currentX += width + (idx % 2 === 0 ? 2 : 1.5);
        if (idx % 2 === 0) {
          return (
            <rect
              key={idx}
              x={x}
              y="0"
              width={width}
              height="60"
              className="fill-slate-900"
            />
          );
        }
        return null;
      })}
    </svg>
  );
}

export default function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customerLinkExpired, setCustomerLinkExpired] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      try {
        const res = await fetch(`/api/v1/bookings/${bookingId}`);
        const data = await res.json();

        if (res.status === 410 || data.expired) {
          setIsExpired(true);
        } else if (data.success && data.booking) {
          setBooking(data.booking);
          setIsAdmin(data.isAdmin || false);
          setCustomerLinkExpired(data.customerLinkExpired || false);

          // Confetti celebration on confirmed bookings
          try {
            confetti({
              particleCount: 75,
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading your match pass...</p>
        </div>
      </div>
    );
  }

  // 410 Expired Access State
  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4 rounded-3xl shadow-lg border-slate-200 bg-white">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Booking Link Expired</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            For your security and privacy, online customer access links expire 7 days after booking creation.
          </p>
          <div className="p-3.5 bg-slate-50 rounded-2xl text-xs text-slate-600 text-left space-y-1.5 border border-slate-200/60">
            <p className="font-bold text-slate-800">Your record is safe:</p>
            <p>
              Your booking record and payment details have not been deleted and remain permanently preserved in our system.
            </p>
            <p>
              If you need an invoice copy or booking verification, please contact the venue front desk directly.
            </p>
          </div>
          <Link href="/">
            <Button className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-xs mt-2">
              Return to Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4 rounded-3xl shadow-lg border-slate-200 bg-white">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Booking Not Found</h2>
          <p className="text-xs text-slate-500">{error || "Unable to locate this reservation."}</p>
          <Link href="/">
            <Button className="w-full rounded-xl">Return to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const invoiceUrl = isAdmin
    ? `/api/v1/admin/bookings/${booking.id}/invoice`
    : `/invoice/${bookingId}`;

  const shareText = encodeURIComponent(
    `*Badminton Academy Match Pass*\n` +
    `Venue: ${booking.venue?.name}\n` +
    `Date: ${booking.dateStr}\n` +
    `Time: ${formatTimeRange(booking.startTimeStr, booking.endTimeStr)}\n` +
    `Court: ${booking.resource?.name}\n` +
    `Booking ID: ${booking.bookingNumber}\n` +
    `Pass: ${typeof window !== "undefined" ? window.location.href : ""}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;

  return (
    <div className="min-h-screen bg-slate-100/70 py-6 px-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Top App Bar with back button, title, and download button */}
        <div className="flex items-center justify-between px-1">
          <Link href={`/v/${booking.venue?.slug || ""}`}>
            <button className="w-11 h-11 rounded-full bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-base font-bold text-slate-800 tracking-tight">Match Pass</h1>
          <a href={invoiceUrl} download>
            <button
              className="w-11 h-11 rounded-full bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors"
              title="Download Official Tax Invoice PDF"
            >
              <Download className="w-5 h-5" />
            </button>
          </a>
        </div>

        {/* Admin Retention Header */}
        {isAdmin && (
          <div className="p-3 rounded-2xl bg-slate-900 text-white text-xs flex items-center justify-between border border-slate-800 shadow-sm">
            <span className="font-semibold text-emerald-400">Admin Mode (Permanent Access)</span>
            <span className="text-[11px] text-slate-400">
              Customer link: {customerLinkExpired ? "Expired (7d policy)" : "Active"}
            </span>
          </div>
        )}

        {/* Ticket Card Container */}
        <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/70 border border-slate-200/60 overflow-hidden relative">
          {/* Top Venue Hero Image Banner */}
          <div className="p-4 pb-1">
            <div className="relative h-56 w-full rounded-[24px] overflow-hidden bg-slate-950 shadow-inner">
              <img
                src={
                  booking.venue?.imageUrl ||
                  "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80"
                }
                alt={booking.venue?.name || "Badminton Venue"}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent flex flex-col justify-end p-5">
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-extrabold block">
                  Badminton Academy
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight mt-0.5 drop-shadow">
                  {booking.venue?.name}
                </h2>
              </div>
            </div>
          </div>

          {/* Perforated Divider #1 with Real Circular Notches */}
          <div className="relative py-2.5 flex items-center">
            <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-100/90 shadow-inner border-r border-slate-200/60" />
            <div className="w-full border-b-2 border-dashed border-slate-200 mx-5" />
            <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-100/90 shadow-inner border-l border-slate-200/60" />
          </div>

          {/* Middle Match Details Section */}
          <div className="px-6 py-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold tracking-wide">
                Court: {booking.resource?.name}
              </span>
              <div
                className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600"
                title="Reservation Confirmed"
              >
                <CheckCircle className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                {booking.venue?.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {booking.venue?.address}, {booking.venue?.city}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="grid grid-cols-2 gap-y-4 gap-x-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Date</span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">
                    {booking.dateStr}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Time</span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">
                    {formatTimeRange(booking.startTimeStr, booking.endTimeStr)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Location</span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">
                    {booking.venue?.city || "Mumbai"}, India
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Seats</span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">
                    {booking.resource?.name} ({booking.resource?.resourceType || "Court"})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Ticket holder</span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5 truncate">
                    {booking.customer?.name}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Issued to</span>
                  <span className="text-sm font-bold font-mono text-emerald-600 block mt-0.5">
                    ID: {booking.bookingNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Perforated Divider #2 with Real Circular Notches */}
          <div className="relative py-2.5 flex items-center">
            <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-100/90 shadow-inner border-r border-slate-200/60" />
            <div className="w-full border-b-2 border-dashed border-slate-200 mx-5" />
            <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-100/90 shadow-inner border-l border-slate-200/60" />
          </div>

          {/* Bottom Barcode Section */}
          <div className="px-6 pt-1 pb-6 flex flex-col items-center justify-center space-y-1.5">
            <BarcodeGraphic code={booking.bookingNumber} />
            <span className="font-mono text-xs tracking-widest text-slate-500 font-semibold">
              {booking.bookingNumber}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <a href={invoiceUrl} download className="block w-full">
            <Button className="w-full h-12 rounded-2xl font-bold text-xs sm:text-sm bg-slate-950 hover:bg-slate-800 text-white shadow-sm gap-2">
              <Download className="w-4 h-4" />
              <span>Download Official Tax Invoice (PDF)</span>
            </Button>
          </a>

          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl font-bold text-xs sm:text-sm text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/60 border-emerald-200 gap-2"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>Share Pass on WhatsApp</span>
            </Button>
          </a>

          {booking.venue?.googleMapsUrl && (
            <a
              href={booking.venue.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full"
            >
              <Button
                variant="outline"
                className="w-full h-11 rounded-2xl font-semibold text-xs text-slate-700 border-slate-200 gap-2"
              >
                <Navigation className="w-4 h-4 text-emerald-600" />
                <span>Get Venue Directions</span>
              </Button>
            </a>
          )}

          <Link href={`/v/${booking.venue?.slug || ""}`} className="block w-full">
            <Button
              variant="ghost"
              className="w-full h-11 rounded-2xl font-semibold text-xs text-slate-600 hover:text-slate-900 gap-1.5"
            >
              <span>Book Another Slot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
