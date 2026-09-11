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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-4 sm:py-8 space-y-6">
      {/* Contextual Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/v/${venueSlug}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Court or Time</span>
        </Link>

        {secondsRemaining !== null && !isHoldExpired && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <Timer className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Slot reserved for {formatTimer(secondsRemaining)}</span>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Review and Confirm
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Final step to reserve your court time at {checkoutData.venueName}
        </p>
      </div>

      {/* Hold Expired Notice */}
      {isHoldExpired && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span>Reservation Hold Expired</span>
          </div>
          <p className="text-xs text-amber-800">
            The 10-minute reservation window has ended. To ensure fair court access, this slot has been released back into available inventory.
          </p>
          <Button asChild className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-xs font-bold">
            <Link href={`/v/${venueSlug}`}>
              Select a Slot Again
            </Link>
          </Button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Booking Summary Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                Reserved Court
              </span>
              <h2 className="text-lg font-bold mt-0.5">{checkoutData.venueName}</h2>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
              {checkoutData.resourceName}
            </Badge>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Date</span>
                <span className="font-bold text-slate-800">{checkoutData.dateFormatted}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Time Slot</span>
                <span className="font-bold text-slate-800">
                  {formatTimeRange(checkoutData.startTimeStr, checkoutData.endTimeStr)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Player Name</span>
                <span className="font-bold text-slate-800">{checkoutData.customerName}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Mobile Number</span>
                <span className="font-bold text-slate-800">+91 {checkoutData.customerPhone}</span>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-2 pt-1 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Court Reservation (60 Minutes)</span>
              <span className="font-semibold">{formatCurrency(checkoutData.price)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Platform & Convenience Fee</span>
              <span className="font-semibold text-emerald-600">FREE</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-sm">
              <span className="font-bold text-slate-900">Total Payable</span>
              <span className="font-black text-xl text-emerald-600">
                {formatCurrency(checkoutData.price)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Preview Mode Banner (Development) */}
      <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/70 p-5 text-emerald-950 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-base">
                Payment Preview Mode
              </h3>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                Development
              </Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Full payment gateway integration (UPI Intent, Dynamic QR, Net Banking, and Cards) is configured with plug-and-play adapters. For development testing, you can simulate outcomes below.
            </p>
          </div>
        </div>

        {/* Future payment methods preview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60">
          <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-100 flex items-center gap-2 text-xs text-slate-600">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">UPI / GPay</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-100 flex items-center gap-2 text-xs text-slate-600">
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Dynamic QR</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-100 flex items-center gap-2 text-xs text-slate-600">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Debit / Cards</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-100 flex items-center gap-2 text-xs text-slate-600">
            <Building className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Net Banking</span>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <Button
            onClick={() => handleSimulatePayment("success")}
            disabled={isSubmitting || isHoldExpired}
            size="lg"
            className="w-full sm:flex-1 h-13 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 gap-2"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Confirming Booking...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulate Successful Payment</span>
              </div>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSimulatePayment("failure")}
            disabled={isSubmitting || isHoldExpired}
            className="w-full sm:w-auto h-13 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold gap-1.5"
          >
            <XCircle className="w-4 h-4 text-rose-500" />
            <span>Simulate Failure</span>
          </Button>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <Lock className="w-3.5 h-3.5" />
        <span>Atomic database lock active • Double bookings prevented</span>
      </p>
    </main>
  );
}
