"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function FindBookingPage() {
  const [business, setBusiness] = useState<any>(null);

  useEffect(() => {
    async function fetchBusiness() {
      try {
        const res = await fetch("/api/v1/venues");
        const data = await res.json();
        if (data.success && data.business) {
          setBusiness(data.business);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchBusiness();
  }, []);

  const websiteUrl = business?.websiteUrl || "https://niteshbadmintonacademy.com";
  const brandName = business?.name || "Nitish Badminton Academy";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-md mx-auto space-y-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Court Bookings</span>
        </Link>

        <Card className="border-slate-200/90 shadow-md overflow-hidden rounded-3xl">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <Building2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {brandName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Individual booking passes and tax invoices are delivered directly upon booking confirmation. For all academy programs, coaching, and inquiries, visit the official site.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button variant="default" className="w-full h-12 gap-2 text-sm font-bold">
                  <span>Visit {brandName} Website</span>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>

              <Link href="/" className="block w-full">
                <Button variant="outline" className="w-full h-12 gap-2 text-sm font-semibold text-slate-700">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Book a Badminton Court</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-slate-400">
          Need immediate court assistance? Contact front desk: {business?.supportPhone || "+91 22 2222 2222"}
        </p>
      </div>
    </div>
  );
}
