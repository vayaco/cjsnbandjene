import React from "react";
import Link from "next/link";
import { ArrowLeft, Phone, MapPin } from "lucide-react";

export default function VenueBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Venue Booking Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors py-2"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Change Venue</span>
          </Link>

          <Link href="/find-booking" className="text-xs font-semibold text-emerald-700 hover:underline">
            Find My Booking
          </Link>
        </div>
      </header>

      <div className="flex-1 pb-28">{children}</div>
    </div>
  );
}
