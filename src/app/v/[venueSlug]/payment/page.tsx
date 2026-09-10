"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
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
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Sparkles,
  Calendar,
  Clock,
  User,
  Phone,
  AlertCircle,
} from "lucide-react";

export default function PaymentPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = use(params);
  const router = useRouter();

  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("sb_checkout_slot");
    if (!raw) {
      router.push(`/v/${venueSlug}`);
      return;
    }
    try {
      setCheckoutData(JSON.parse(raw));
    } catch {
      router.push(`/v/${venueSlug}`);
    }
  }, [venueSlug, router]);

  const handleConfirmBooking = async () => {
    if (!checkoutData) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
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
          paymentMethod: "placeholder",
          notes: "Demo reservation confirmed via preview checkout",
        }),
      });

      const data = await res.json();

      if (data.success && data.booking) {
        // Clear session storage
        sessionStorage.removeItem("sb_checkout_slot");
        // Navigate to confirmation receipt
        router.push(`/booking/${data.booking.bookingNumber}`);
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
    <div className="max-w-2xl mx-auto px-4 py-4 sm:py-8 space-y-6">
      {/* Back button */}
      <Link
        href={`/v/${venueSlug}`}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Court Selection</span>
      </Link>

      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Review & Confirm
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Final step to reserve your court time at {checkoutData.venueName}
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Booking Summary Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider block">
                Selected Booking
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
              <span>Court Rental (60 Minutes)</span>
              <span className="font-semibold">{formatCurrency(checkoutData.price)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Convenience & Platform Fee</span>
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

      {/* Payment Gateway Status Banner */}
      <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 p-5 text-emerald-950 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-base">
                Payment Gateway Integration Coming Soon
              </h3>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                Preview Mode
              </Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              We are currently setting up full payment gateway adapters (UPI Instant, Google Pay,
              Cards, Dynamic QR, and Net Banking). For this development release, you can complete and
              test the entire booking journey with <strong>1-click Demo Confirmation</strong>.
            </p>
          </div>
        </div>

        {/* Future payment methods preview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60">
          <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-100 flex items-center gap-2 text-xs text-slate-500 opacity-80">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">UPI / GPay</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-100 flex items-center gap-2 text-xs text-slate-500 opacity-80">
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Dynamic QR</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-100 flex items-center gap-2 text-xs text-slate-500 opacity-80">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Debit / Cards</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-100 flex items-center gap-2 text-xs text-slate-500 opacity-80">
            <Building className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Net Banking</span>
          </div>
        </div>
      </div>

      {/* Confirmation Action */}
      <div className="pt-2 space-y-3">
        <Button
          onClick={handleConfirmBooking}
          disabled={isSubmitting}
          size="lg"
          className="w-full h-14 rounded-2xl text-base font-extrabold bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/25 gap-2"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Confirming Your Slot...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Confirm Booking (Demo Mode — Free)</span>
            </div>
          )}
        </Button>

        <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Real-time concurrency lock active • Zero double bookings guaranteed</span>
        </p>
      </div>
    </div>
  );
}
