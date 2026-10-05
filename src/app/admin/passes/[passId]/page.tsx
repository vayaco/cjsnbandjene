"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatTimeRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers,
  ArrowLeft,
  Calendar,
  Clock,
  Building2,
  CheckCircle,
  AlertCircle,
  Ticket,
  Printer,
  Ban,
  User,
  Phone,
  Mail,
  ExternalLink,
  Download,
} from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MonthlyPassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const passId = params.passId as string;

  const [pass, setPass] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [passRes, bizRes] = await Promise.all([
          fetch(`/api/v1/admin/passes/${passId}`),
          fetch("/api/v1/admin/business"),
        ]);

        const passData = await passRes.json();
        const bizData = await bizRes.json();

        if (passData.success) {
          setPass(passData.pass);
        } else {
          setError(passData.error || "Pass not found");
        }

        if (bizData.success && bizData.business) {
          setBusiness(bizData.business);
        }
      } catch {
        setError("Failed to load pass details");
      } finally {
        setIsLoading(false);
      }
    }

    if (passId) loadData();
  }, [passId]);

  const handleCancelPass = async () => {
    if (
      !confirm(
        `Are you sure you want to cancel Monthly Pass ${pass.passNumber}? All ${pass.bookings?.length} reserved slots will be cancelled and immediately opened for other players.`
      )
    ) {
      return;
    }

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/v1/admin/passes/${passId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Monthly pass cancelled successfully.");
        // Reload
        window.location.reload();
      } else {
        alert(data.error || "Failed to cancel monthly pass.");
      }
    } catch {
      alert("Error cancelling monthly pass.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !pass) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Pass Not Found</h2>
        <p className="text-xs text-slate-500">{error || "Could not find pass record."}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/passes">Return to Monthly Passes</Link>
        </Button>
      </div>
    );
  }

  const monthName = MONTH_NAMES[(pass.month || 1) - 1];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/admin/passes"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Monthly Passes</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="text-xs font-bold gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Pass Summary</span>
          </Button>

          {pass.status === "active" && (
            <Button
              onClick={handleCancelPass}
              disabled={isCancelling}
              variant="destructive"
              size="sm"
              className="text-xs font-bold gap-1.5"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{isCancelling ? "Cancelling..." : "Cancel Pass"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Pass Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {pass.passNumber}
            </h1>
            <Badge
              className={
                pass.status === "active"
                  ? "bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px] border-0"
                  : pass.status === "completed"
                  ? "bg-sky-100 text-sky-800 font-bold uppercase text-[10px] border-0"
                  : "bg-rose-100 text-rose-800 font-bold uppercase text-[10px] border-0"
              }
            >
              {pass.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {monthName} {pass.year} • {pass.daysLabel} Pass
          </p>
        </div>
      </div>

      {/* Digital Monthly Pass Card */}
      <Card className="border-slate-200/90 shadow-md rounded-3xl overflow-hidden bg-gradient-to-br from-white via-white to-slate-50/70 border">
        {/* Pass Top Branding Strip */}
        <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {business?.logoUrl ? (
              <img
                src={business.logoUrl}
                alt="Academy Logo"
                className="w-10 h-10 rounded-2xl bg-white p-1 object-contain"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center font-bold text-white text-xs">
                BA
              </div>
            )}
            <div>
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">
                Official Monthly Pass
              </span>
              <span className="text-base font-extrabold text-white block">
                {business?.name || "Badminton Academy"}
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 block">Pass Code</span>
            <span className="text-sm font-mono font-bold text-emerald-400 block">
              {pass.passNumber}
            </span>
          </div>
        </div>

        {/* Pass Details Body */}
        <CardContent className="p-6 sm:p-8 space-y-6 text-xs">
          {/* Main Key Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">
                Pass Holder
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                {pass.customer?.name}
              </span>
              <span className="text-slate-500 font-mono text-xs block">
                {pass.customer?.phone}
              </span>
              {pass.customer?.email && (
                <span className="text-slate-400 text-[11px] block">{pass.customer.email}</span>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">
                Venue & Court
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                {pass.venue?.name}
              </span>
              <span className="text-emerald-700 font-semibold text-xs block">
                {pass.resource?.name} ({pass.resource?.resourceType || "Court"})
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">
                Schedule & Time
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                {monthName} {pass.year}
              </span>
              <span className="text-slate-700 font-semibold text-xs block">
                {pass.daysLabel}
              </span>
              <span className="text-emerald-600 font-mono font-bold text-xs block">
                {formatTimeRange(pass.startTimeStr, pass.endTimeStr)}
              </span>
            </div>
          </div>

          {/* Pricing & Sessions Breakdown Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-slate-500 text-xs font-semibold block">
                Session Package
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                {pass.totalSessions} Confirmed Sessions
              </span>
              <span className="text-[11px] text-slate-500">
                Rate: {formatCurrency(pass.pricePerSession)} per slot
              </span>
            </div>

            <div className="space-y-1 text-left sm:text-right">
              <span className="text-slate-500 text-xs font-semibold block">Total Amount</span>
              <span className="text-2xl font-black text-emerald-600 tabular-nums block">
                {formatCurrency(pass.totalAmount)}
              </span>
              <div className="flex items-center sm:justify-end gap-1.5">
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border-0">
                  {pass.paymentStatus === "successful" ? "PAID" : pass.paymentStatus.toUpperCase()}
                </Badge>
                <span className="text-[11px] text-slate-500 capitalize">
                  via {pass.paymentMethod}
                </span>
              </div>
            </div>
          </div>

          {pass.notes && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-600 text-xs">
              <span className="font-bold text-slate-800">Notes: </span>
              <span>{pass.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Sessions Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Pass Session Bookings ({pass.bookings?.length || 0})</span>
          </CardTitle>
          <span className="text-xs text-slate-400">
            All slots reserved and confirmed in schedule
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Session</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Time</th>
                  <th className="p-4">Booking ID</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Pass Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pass.bookings?.map((b: any, idx: number) => {
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 pl-6 font-bold text-slate-400 tabular-nums">
                        #{idx + 1}
                      </td>

                      <td className="p-4 font-bold text-slate-900">
                        {new Intl.DateTimeFormat("en-US", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(`${b.dateStr}T12:00:00.000Z`))}
                      </td>

                      <td className="p-4 font-mono font-semibold text-slate-700">
                        {formatTimeRange(b.startTimeStr, b.endTimeStr)}
                      </td>

                      <td className="p-4 font-mono font-bold text-emerald-700">
                        {b.bookingNumber}
                      </td>

                      <td className="p-4">
                        <Badge
                          className={
                            b.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-800 text-[10px] font-bold border-0"
                              : "bg-rose-100 text-rose-800 text-[10px] font-bold border-0"
                          }
                        >
                          {b.status}
                        </Badge>
                      </td>

                      <td className="p-4 text-right pr-6 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <a href={`/api/v1/admin/bookings/${b.id}/invoice`} download>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 gap-1 text-xs">
                              <Download className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Invoice</span>
                            </Button>
                          </a>
                          <Link href={`/booking/${b.bookingNumber}`} target="_blank">
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 gap-1 text-xs font-semibold">
                              <span>Pass</span>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
