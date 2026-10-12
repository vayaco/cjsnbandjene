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
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-md mx-auto space-y-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Court Bookings</span>
        </Link>

        <Card className="border-slate-800 bg-slate-900 shadow-2xl overflow-hidden rounded-3xl text-white">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#79FE0C]/15 border border-[#79FE0C]/30 text-[#79FE0C] flex items-center justify-center shadow-xs">
              <Building2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {brandName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
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
                <Button className="w-full h-12 gap-2 text-sm font-extrabold bg-[#79FE0C] hover:bg-[#6de809] text-black shadow-[0_0_20px_rgba(121,254,12,0.3)] cursor-pointer">
                  <span>Visit {brandName} Website</span>
                  <ExternalLink className="w-4 h-4 text-black stroke-[2.5]" />
                </Button>
              </a>

              <Link href="/" className="block w-full">
                <Button variant="outline" className="w-full h-12 gap-2 text-sm font-semibold text-slate-300 bg-slate-950 border-slate-800 hover:bg-slate-900 hover:text-white cursor-pointer">
                  <Calendar className="w-4 h-4 text-[#79FE0C]" />
                  <span>Book a Badminton Court</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-slate-500">
          Need immediate court assistance? Contact front desk: {business?.supportPhone || "+91 22 2222 2222"}
        </p>
      </div>
    </div>
  );
}
