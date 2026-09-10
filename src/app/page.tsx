"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  Search,
  Sparkles,
  Award,
  Zap,
} from "lucide-react";

interface VenueCardData {
  id: string;
  name: string;
  slug: string;
  code: string;
  address: string;
  city: string;
  phone?: string;
  openTime: string;
  closeTime: string;
  imageUrl?: string;
  description?: string;
  courtsCount: number;
  startingPrice: number;
}

export default function HomePage() {
  const [venues, setVenues] = useState<VenueCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchVenues() {
      try {
        const res = await fetch("/api/v1/venues");
        const data = await res.json();
        if (data.success) {
          setVenues(data.venues);
        }
      } catch (err) {
        console.error("Failed to load venues", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchVenues();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-600/20">
              SZ
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                SmashZone
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Arena Bookings
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/find-booking">
              <Button variant="outline" size="sm" className="gap-1.5 font-semibold text-xs sm:text-sm">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>Find Booking</span>
              </Button>
            </Link>
            <Link href="/admin/login">
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 text-xs">
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Zero App Download • Instant Online Confirmation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Book Your Badminton Court <br className="hidden sm:inline" />
            <span className="text-emerald-600">In 3 Simple Clicks</span>
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
            Choose your venue, pick your preferred court and slot time, and get instant access.
            No mandatory passwords or registration required.
          </p>
        </div>

        {/* Venue Selection Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Choose a Venue</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select your nearest SmashZone location</p>
          </div>
          <Badge variant="secondary" className="font-semibold text-slate-600">
            {venues.length} Locations Open
          </Badge>
        </div>

        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-slate-200">
                  <Skeleton className="h-48 w-full rounded-none" />
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full mt-4" />
                  </CardContent>
                </Card>
              ))
            : venues.map((venue) => (
                <Card
                  key={venue.id}
                  className="group overflow-hidden border-slate-200/90 hover:border-emerald-500/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Venue Image */}
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                      {venue.imageUrl ? (
                        <img
                          src={venue.imageUrl}
                          alt={venue.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                          No Image
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-white/95 text-slate-900 shadow-sm border border-slate-200/60 font-bold backdrop-blur-xs">
                          {venue.courtsCount} Courts
                        </Badge>
                      </div>
                      <div className="absolute bottom-3 left-3">
                        <Badge className="bg-emerald-600 text-white font-bold shadow-md">
                          Open Today
                        </Badge>
                      </div>
                    </div>

                    {/* Venue Details */}
                    <CardContent className="p-5">
                      <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {venue.name}
                      </h3>

                      <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{venue.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            {venue.openTime} - {venue.closeTime} Daily
                          </span>
                        </div>
                      </div>

                      {venue.description && (
                        <p className="mt-3 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {venue.description}
                        </p>
                      )}
                    </CardContent>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="p-5 pt-0 mt-auto">
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between mb-3">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Starting from</span>
                        <span className="text-base font-extrabold text-emerald-700">
                          {formatCurrency(venue.startingPrice)}
                          <span className="text-xs text-slate-500 font-normal"> / hour</span>
                        </span>
                      </div>
                    </div>

                    <Link href={`/v/${venue.slug}`} className="block w-full">
                      <Button className="w-full h-11 font-bold gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                        <span>Select Venue</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
        </div>

        {/* Feature Highlights */}
        <div className="mt-14 pt-10 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/70">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Instant Confirmation</h4>
              <p className="text-xs text-slate-500 mt-1">
                Your court is locked automatically in real time. Zero double bookings guaranteed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/70">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">BWF Approved Mats</h4>
              <p className="text-xs text-slate-500 mt-1">
                Synthetic rubber cushion flooring with glare-free LED lighting for optimal play.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/70">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Simple Cancellations</h4>
              <p className="text-xs text-slate-500 mt-1">
                Plans changed? Cancel easily up to 6 hours before slot time through booking recovery.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-400">
        <p>© 2026 SmashZone Sports Arena • Powered by Slot-Based Business Operating System</p>
      </footer>
    </div>
  );
}
