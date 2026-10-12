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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#79FE0C] mx-auto" />
          <p className="text-sm font-semibold text-slate-400">Loading your match pass...</p>
        </div>
      </div>
    );
  }

  // 410 Expired Access State
  if (isExpired) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 text-white">
        <Card className="max-w-md w-full p-6 text-center space-y-4 rounded-3xl shadow-2xl border-slate-800 bg-slate-900">
          <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Booking Link Expired</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            For your security and privacy, online customer access links expire 7 days after booking creation.
          </p>
          <div className="p-3.5 bg-slate-950 rounded-2xl text-xs text-slate-300 text-left space-y-1.5 border border-slate-800">
            <p className="font-bold text-white">Your record is safe:</p>
            <p>
              Your booking record and payment details have not been deleted and remain permanently preserved in our system.
            </p>
            <p>
              If you need an invoice copy or booking verification, please contact the venue front desk directly.
            </p>
          </div>
          <Link href="/">
            <Button className="w-full h-11 rounded-xl bg-[#79FE0C] hover:bg-[#6de809] text-black font-extrabold text-xs mt-2">
              Return to Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 text-white">
        <Card className="max-w-md w-full p-6 text-center space-y-4 rounded-3xl shadow-2xl border-slate-800 bg-slate-900">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Booking Not Found</h2>
          <p className="text-xs text-slate-400">{error || "Unable to locate this reservation."}</p>
          <Link href="/">
            <Button className="w-full rounded-xl bg-[#79FE0C] hover:bg-[#6de809] text-black font-bold">Return to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const brandName = booking.venue?.business?.name || "Badminton Academy";
  const brandLogoUrl = booking.venue?.business?.logoUrl;

  const invoiceUrl = isAdmin
    ? `/api/v1/admin/bookings/${booking.id}/invoice`
    : `/invoice/${bookingId}`;

  const shareText = encodeURIComponent(
    `*${brandName} Match Pass*\n` +
    `Venue: ${booking.venue?.name}\n` +
    `Date: ${booking.dateStr}\n` +
    `Time: ${formatTimeRange(booking.startTimeStr, booking.endTimeStr)}\n` +
    `Court: ${booking.resource?.name}\n` +
    `Booking ID: ${booking.bookingNumber}\n` +
    `Pass: ${typeof window !== "undefined" ? window.location.href : ""}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;

  return (
    <div className="min-h-screen bg-black text-white py-4 sm:py-6 px-3 sm:px-4">
      <div className="max-w-md mx-auto space-y-3.5 sm:space-y-4">
        {/* Top App Bar with back button, title, and download button */}
        <div className="flex items-center justify-between px-1">
          <Link href={`/v/${booking.venue?.slug || ""}`}>
            <button className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            {brandLogoUrl && (
              <img
                src={brandLogoUrl}
                alt={brandName}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg object-contain bg-slate-950 border border-slate-800 p-0.5 shadow-xs"
              />
            )}
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">Tax Invoice & Pass</h1>
          </div>
          <a href={invoiceUrl} download>
            <button
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-center text-slate-300 hover:text-[#79FE0C] hover:bg-slate-800 transition-colors cursor-pointer"
              title="Download Official Tax Invoice PDF"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </a>
        </div>

        {/* Admin Retention Header */}
        {isAdmin && (
          <div className="p-3 rounded-2xl bg-slate-900 text-white text-xs flex items-center justify-between border border-slate-800 shadow-sm">
            <span className="font-semibold text-[#79FE0C]">Admin Mode (Permanent Access)</span>
            <span className="text-[11px] text-slate-400">
              Customer link: {customerLinkExpired ? "Expired (7d policy)" : "Active"}
            </span>
          </div>
        )}

        {/* Ticket Card Container with Physical Ticket Notches */}
        <div className="bg-slate-900 rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-800 overflow-hidden relative text-white">
          {/* Top Venue Ticket Stub */}
          <div className="p-3.5 sm:p-4 pb-1">
            {booking.venue?.imageUrl ? (
              <div className="relative h-44 sm:h-52 w-full rounded-[20px] sm:rounded-[24px] overflow-hidden bg-slate-950 shadow-inner">
                <img
                  src={booking.venue.imageUrl}
                  alt={booking.venue.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent flex flex-col justify-end p-4 sm:p-5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {brandLogoUrl && (
                      <img
                        src={brandLogoUrl}
                        alt={brandName}
                        className="w-4 h-4 rounded-sm object-contain bg-slate-950 p-0.5"
                      />
                    )}
                    <span className="text-[10px] uppercase tracking-widest text-[#79FE0C] font-bold block">
                      {brandName}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-tight mt-0.5 drop-shadow">
                    {booking.venue.name}
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {booking.venue.address}, {booking.venue.city}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-36 sm:h-44 w-full rounded-[20px] sm:rounded-[24px] bg-slate-950 border border-dashed border-slate-800 flex flex-col items-center justify-center p-5 sm:p-6 text-center select-none">
                <div className="flex items-center gap-1.5 mb-1">
                  {brandLogoUrl && (
                    <img
                      src={brandLogoUrl}
                      alt={brandName}
                      className="w-5 h-5 rounded-md object-contain bg-slate-950 border border-slate-800 p-0.5"
                    />
                  )}
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                    {brandName}
                  </span>
                </div>
                <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight mt-0.5">
                  {booking.venue?.name || "Venue"}
                </h2>
                {booking.venue?.city && (
                  <span className="text-xs text-slate-400 mt-0.5 block">
                    {booking.venue.city}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Perforated Divider with Circular Notches */}
          <div className="relative py-2.5 flex items-center">
            <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black shadow-inner border-r border-slate-800" />
            <div className="w-full border-b-2 border-dashed border-slate-800 mx-5" />
            <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black shadow-inner border-l border-slate-800" />
          </div>

          {/* Ticket Body / Invoice Details */}
          <div className="px-4 sm:px-6 pt-1 pb-5 sm:pb-6 space-y-4 sm:space-y-5">
            {/* Total Paid & Status Banner */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Total Paid (Tax Invoice)
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-[#79FE0C] tracking-tight tabular-nums">
                  {formatCurrency(booking.total)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#79FE0C]/15 border border-[#79FE0C]/30 text-[#79FE0C] text-[11px] sm:text-xs font-bold shadow-xs shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-[#79FE0C] shrink-0" />
                <span>Paid & Confirmed</span>
              </div>
            </div>

            {/* Itemized Match Details */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Invoice / Booking ID
                </span>
                <span className="text-sm font-bold font-mono text-[#79FE0C] block mt-0.5">
                  #{booking.bookingNumber}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Assigned Court
                </span>
                <span className="text-sm font-semibold text-white block mt-0.5">
                  {booking.resource?.name} ({booking.resource?.resourceType || "Court"})
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Slot Date
                </span>
                <span className="text-sm font-semibold text-white block mt-0.5 tabular-nums">
                  {booking.dateStr}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Slot Time
                </span>
                <span className="text-sm font-semibold font-mono tabular-nums text-white block mt-0.5">
                  {formatTimeRange(booking.startTimeStr, booking.endTimeStr)}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Player Name
                </span>
                <span className="text-sm font-semibold text-white block mt-0.5 truncate">
                  {booking.customer?.name}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Contact Phone
                </span>
                <span className="text-sm font-semibold font-mono text-white block mt-0.5">
                  {booking.customer?.phone}
                </span>
              </div>
            </div>

            {/* Financial Ledger Section */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Court Slot Rental (60 Mins)</span>
                <span className="font-semibold text-slate-200">{formatCurrency(booking.subtotal || booking.total)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Taxes & GST (0%)</span>
                <span className="font-semibold text-slate-200">{formatCurrency(booking.tax || 0)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-white">
                <span>Net Total Settled</span>
                <span className="text-sm text-[#79FE0C] font-extrabold">{formatCurrency(booking.total)}</span>
              </div>
              <div className="pt-1 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Payment Mode: {booking.paymentMethod || "Online / Electronic Transfer"}</span>
                <span className="text-[#79FE0C] font-semibold">Zero Balance Due</span>
              </div>
            </div>

            {/* Essential Venue Guidelines */}
            <div className="text-[11px] text-slate-300 space-y-1 bg-amber-950/30 p-3 rounded-xl border border-amber-800/50">
              <p className="font-semibold text-amber-300">Important Venue Notes:</p>
              <p>• Non-marking badminton shoes are mandatory on all synthetic courts.</p>
              <p>• Please present this electronic invoice or match pass at reception.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
          <a href={invoiceUrl} download className="block w-full">
            <Button className="w-full h-12 sm:h-13 font-extrabold text-xs sm:text-sm gap-2 bg-[#79FE0C] hover:bg-[#6de809] text-black shadow-[0_0_20px_rgba(121,254,12,0.3)] cursor-pointer">
              <Download className="w-4 h-4 text-black stroke-[2.5]" />
              <span>Download Official Tax Invoice (PDF)</span>
            </Button>
          </a>

          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
            <Button
              variant="outline"
              className="w-full h-11 sm:h-12 font-bold text-xs sm:text-sm gap-2 bg-slate-900 border-slate-800 text-white hover:bg-slate-800 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[#79FE0C]" />
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
                className="w-full h-11 sm:h-12 font-semibold text-xs sm:text-sm text-slate-300 bg-slate-950 border-slate-800 hover:bg-slate-900 hover:text-white gap-2 cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-[#79FE0C]" />
                <span>Get Venue Directions</span>
              </Button>
            </a>
          )}

          <Link href={`/v/${booking.venue?.slug || ""}`} className="block w-full">
            <Button
              variant="outline"
              className="w-full h-11 sm:h-12 font-semibold text-xs sm:text-sm text-slate-300 bg-slate-950 border-slate-800 hover:bg-slate-900 hover:text-white gap-1.5 cursor-pointer"
            >
              <span>Book Another Slot</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
