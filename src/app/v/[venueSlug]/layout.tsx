import React from "react";
import Link from "next/link";
import { ArrowLeft, Phone, MapPin, ExternalLink } from "lucide-react";

export default function VenueBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Venue Booking Header */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-3.5 sm:px-4 h-14 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-300 hover:text-[#79FE0C] transition-colors py-2 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Change Venue</span>
            <span className="sm:hidden">All Venues</span>
          </Link>

          <a
            href="https://niteshbadmintonacademy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#79FE0C] transition-colors shrink-0"
          >
            <span className="hidden sm:inline">Academy Website</span>
            <span className="sm:hidden">Website</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </header>

      <div className="flex-1 pb-28">{children}</div>
    </div>
  );
}
