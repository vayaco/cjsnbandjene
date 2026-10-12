"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatTimeRange } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  QrCode,
  Smartphone,
  Building,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Sparkles,
  Calendar,
  Clock,
  User,
  Phone,
  AlertCircle,
  Timer,
  XCircle,
} from "lucide-react";

export default function PaymentPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const holdToken = searchParams.get("holdToken");

  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [isHoldExpired, setIsHoldExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Load checkout details and sync hold timer
  useEffect(() => {
    const raw = sessionStorage.getItem("sb_checkout_slot");
    if (!raw) {
      router.push(`/v/${venueSlug}`);
      return;
    }

    try {
      const data = JSON.parse(raw);
      setCheckoutData(data);

      if (data.expiresAt) {
        const diff = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
        setSecondsRemaining(diff);
      } else {
        setSecondsRemaining(600); // 10 minutes fallback
      }
    } catch {
      router.push(`/v/${venueSlug}`);
    }
  }, [venueSlug, router]);

  // 2. Countdown Timer effect
  useEffect(() => {
    if (secondsRemaining === null) return;
    if (secondsRemaining <= 0) {
      setIsHoldExpired(true);
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setIsHoldExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining]);

  // Format seconds to mm:ss
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleSimulatePayment = async (outcome: "success" | "failure") => {
    if (!checkoutData) return;

    if (isHoldExpired) {
      setErrorMessage("Your reservation hold has expired. Please select a court slot again.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    if (outcome === "failure") {
      setTimeout(() => {
        setIsSubmitting(false);
        setErrorMessage(
          "Simulated payment declined by bank. Your slot remains reserved for the remaining time. You may retry."
        );
      }, 800);
      return;
    }

    try {
      // Create confirmed booking using holdToken
      const res = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: checkoutData.venueId,
          resourceId: checkoutData.resourceId,
          dateStr: checkoutData.dateStr,
          startTimeStr: checkoutData.startTimeStr,
          endTimeStr: checkoutData.endTimeStr,
          customerName: checkoutData.customerName,
          customerPhone: checkoutData.customerPhone,
          customerEmail: checkoutData.customerEmail,
          paymentMethod: "upi",
          paymentProvider: "test",
          holdToken: holdToken || checkoutData.holdToken,
          status: "confirmed",
          paymentStatus: "successful",
          notes: "Confirmed via development preview checkout",
        }),
      });

      const data = await res.json();

      if (data.success && data.booking) {
        sessionStorage.removeItem("sb_checkout_slot");
        const targetUrl = data.rawBookingToken
          ? `/booking/${data.rawBookingToken}`
          : `/booking/${data.booking.bookingNumber}`;
        router.push(targetUrl);
      } else {
        setErrorMessage(data.error || "Failed to confirm booking. Please try another slot.");
      }
    } catch (err: any) {
      setErrorMessage("Network connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!checkoutData) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#79FE0C]" />
      </div>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-3.5 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 text-white">
      {/* Contextual Back Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/v/${venueSlug}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Change Court or Time</span>
          <span className="sm:hidden">Change Slot</span>
        </Link>

        {secondsRemaining !== null && !isHoldExpired && (
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-950/60 border border-amber-800/80 text-amber-300 text-[11px] sm:text-xs font-bold shrink-0">
            <Timer className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
            <span>
              <span className="hidden sm:inline">Slot reserved for </span>
              <span className="sm:hidden">Hold: </span>
              {formatTimer(secondsRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="text-left">
        <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight">
          Review and Confirm
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Final step to reserve your court time at {checkoutData.venueName}
        </p>
      </div>

      {/* Hold Expired Notice */}
      {isHoldExpired && (
        <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-amber-200 text-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span>Reservation Hold Expired</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            The 10-minute reservation window has ended. To ensure fair court access, this slot has been released back into available inventory.
          </p>
          <Button asChild className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold">
            <Link href={`/v/${venueSlug}`}>
              Select a Slot Again
            </Link>
          </Button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Booking Summary Card */}
      <Card className="border-slate-800 bg-slate-900 shadow-xl overflow-hidden rounded-2xl sm:rounded-3xl">
        <div className="bg-slate-950 text-white p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#79FE0C] uppercase tracking-wider block">
                Reserved Court
              </span>
              <h2 className="text-base sm:text-lg font-bold mt-0.5 truncate text-white">{checkoutData.venueName}</h2>
            </div>
            <Badge className="bg-[#79FE0C]/15 text-[#79FE0C] border border-[#79FE0C]/30 text-xs font-bold shrink-0">
              {checkoutData.resourceName}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-[#79FE0C]">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Date</span>
                <span className="font-bold text-white">{checkoutData.dateFormatted}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-[#79FE0C]">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Time Slot</span>
                <span className="font-bold text-white">
                  {formatTimeRange(checkoutData.startTimeStr, checkoutData.endTimeStr)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-[#79FE0C]">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Player Name</span>
                <span className="font-bold text-white">{checkoutData.customerName}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-[#79FE0C]">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Mobile Number</span>
                <span className="font-bold text-white">+91 {checkoutData.customerPhone}</span>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-2 pt-1 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>Court Reservation (60 Minutes)</span>
              <span className="font-semibold text-white">{formatCurrency(checkoutData.price)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Platform & Convenience Fee</span>
              <span className="font-bold text-[#79FE0C]">FREE</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-sm">
              <span className="font-semibold text-white">Total Payable</span>
              <span className="font-extrabold text-2xl tabular-nums text-[#79FE0C]">
                {formatCurrency(checkoutData.price)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Preview Mode Banner (Development) */}
      <div className="rounded-2xl border-2 border-dashed border-[#79FE0C]/40 bg-slate-950/80 p-4 sm:p-5 text-white space-y-3.5 sm:space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#79FE0C] text-black flex items-center justify-center shrink-0 shadow-sm font-bold">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm sm:text-base">
                Payment Preview Mode
              </h3>
              <Badge className="bg-[#79FE0C] text-black text-[10px] font-bold">
                Development
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Full payment gateway integration (UPI Intent, Dynamic QR, Net Banking, and Cards) is configured with plug-and-play adapters. For development testing, you can simulate outcomes below.
            </p>
          </div>
        </div>

        {/* Future payment methods preview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#79FE0C] shrink-0" />
            <span className="font-medium text-[11px] sm:text-xs">UPI / GPay</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
            <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#79FE0C] shrink-0" />
            <span className="font-medium text-[11px] sm:text-xs">Dynamic QR</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
            <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#79FE0C] shrink-0" />
            <span className="font-medium text-[11px] sm:text-xs">Debit / Cards</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
            <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#79FE0C] shrink-0" />
            <span className="font-medium text-[11px] sm:text-xs">Net Banking</span>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
          <Button
            onClick={() => handleSimulatePayment("success")}
            disabled={isSubmitting || isHoldExpired}
            size="lg"
            className="w-full sm:flex-1 h-12 sm:h-13 text-xs sm:text-sm font-extrabold gap-2 bg-[#79FE0C] hover:bg-[#6de809] text-black shadow-[0_0_20px_rgba(121,254,12,0.35)] cursor-pointer"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                <span>Confirming Booking...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-black stroke-[2.5]" />
                <span>Simulate Successful Payment</span>
              </div>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSimulatePayment("failure")}
            disabled={isSubmitting || isHoldExpired}
            className="w-full sm:w-auto h-11 sm:h-13 border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-950/70 text-xs font-bold gap-1.5 cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>Simulate Failure</span>
          </Button>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
        <Lock className="w-3.5 h-3.5" />
        <span>Atomic database lock active • Double bookings prevented</span>
      </p>
    </main>
  );
}
