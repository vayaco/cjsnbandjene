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
  ZoomIn,
} from "lucide-react";
import { ImageLightbox } from "@/components/ui/image-lightbox";

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
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<{
    url: string;
    title: string;
    description?: string;
  } | null>(null);

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
              BA
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                Badminton Academy
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Court Bookings
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/find-booking">
              <Button variant="outline" size="sm" className="gap-1.5 font-semibold text-xs sm:text-sm tap-target rounded-xl">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>Find Booking</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Festive Banner */}
      <div className="festive-banner w-full py-2.5 px-4 items-center justify-center text-xs font-bold tracking-wide uppercase shadow-sm">
        <Sparkles className="w-4 h-4 mr-2 inline-block" />
        Celebrating the Festive Season! Book your courts now.
      </div>

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
            <p className="text-xs text-slate-500 mt-0.5">Select your nearest Badminton Academy location</p>
          </div>
          <Badge variant="secondary" className="font-semibold text-slate-600">
            {venues.length} Locations Open
          </Badge>
        </div>

        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-slate-200 rounded-3xl">
                <Skeleton className="h-48 w-full rounded-none" />
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full mt-4" />
                </CardContent>
              </Card>
            ))
          ) : venues.length === 0 ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
              <Card className="bento-card-lavender rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-violet-600 shadow-sm mb-4">
                  <MapPin className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-violet-900 mb-2">No Venues Yet</h3>
                <p className="text-violet-700 max-w-md mx-auto">
                  We are setting up our courts. Please check back later, or contact support if you believe this is an error.
                </p>
              </Card>
            </div>
          ) : (
            venues.map((venue, index) => {
              const bentoClasses = ['bento-card-mint', 'bento-card-lavender', 'bento-card-sky', 'bento-card-peach'];
              const bentoClass = bentoClasses[index % bentoClasses.length];
              
              return (
                <Card
                  key={venue.id}
                  className={`group overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between rounded-3xl ${bentoClass}`}
                >
                  <div>
                    {/* Venue Image with Fullscreen Click */}
                    <div
                      className="relative h-48 w-full bg-slate-100 overflow-hidden cursor-pointer group/img"
                      onClick={(e) => {
                        if (venue.imageUrl) {
                          e.stopPropagation();
                          setSelectedLightboxImage({
                            url: venue.imageUrl,
                            title: venue.name,
                            description: `${venue.address}, ${venue.city}`,
                          });
                        }
                      }}
                    >
                      {venue.imageUrl ? (
                        <>
                          <img
                            src={venue.imageUrl}
                            alt={venue.name}
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-[1px]">
                            <ZoomIn className="w-4 h-4" />
                            <span>Click to View Full Photo</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-1">
                          <span className="font-bold text-slate-500 text-sm">Badminton Academy</span>
                          <span className="text-[11px] text-slate-400">Court Arena</span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 pointer-events-none">
                        <Badge className="bg-white/95 text-slate-900 shadow-sm border border-slate-200/60 font-bold backdrop-blur-xs">
                          {venue.courtsCount} Courts
                        </Badge>
                      </div>
                      <div className="absolute bottom-3 left-3 pointer-events-none">
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
                        <span className="text-lg font-extrabold text-slate-900">
                          {formatCurrency(venue.startingPrice)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium"> / slot</span>
                      </div>
                      <Badge variant="outline" className="bg-white text-emerald-700 font-bold text-[10px] border-emerald-200">
                        Instant Slots
                      </Badge>
                    </div>

                    <Link href={`/v/${venue.slug}`} className="block w-full">
                      <Button className="w-full rounded-2xl font-bold bg-slate-900 hover:bg-emerald-600 text-white transition-colors duration-200 group-hover:shadow-md gap-1.5 text-xs sm:text-sm tap-target">
                        <span>Check Availability</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Value Proposition Strip */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-slate-200">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Zero App Download</h4>
              <p className="text-xs text-slate-500 mt-1">
                Book instantly directly from your phone browser. No app store installs required.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Real-Time Court Inventory</h4>
              <p className="text-xs text-slate-500 mt-1">
                Zero double-booking guarantee. Locked slots immediately update across all players.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
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
        <p>© 2026 Badminton Academy • Powered by Slot-Based Business Operating System</p>
      </footer>

      {/* Full-Screen Lightbox for Venue Images */}
      <ImageLightbox
        isOpen={!!selectedLightboxImage}
        onClose={() => setSelectedLightboxImage(null)}
        imageUrl={selectedLightboxImage?.url || ""}
        title={selectedLightboxImage?.title}
        description={selectedLightboxImage?.description}
      />
    </div>
  );
}
