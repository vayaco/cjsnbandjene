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
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
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
  const [business, setBusiness] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<"welcome" | "venues">("welcome");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<{
    url: string;
    title: string;
    description?: string;
  } | null>(null);

  const getInitials = (name?: string) => {
    if (!name) return "BA";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#venues") {
      setStep("venues");
    }
  }, []);

  const handleGoToVenues = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep("venues");
      setIsTransitioning(false);
      if (typeof window !== "undefined") {
        window.location.hash = "venues";
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 180);
  };

  const handleBackToWelcome = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep("welcome");
      setIsTransitioning(false);
      if (typeof window !== "undefined") {
        history.pushState(null, "", window.location.pathname);
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 180);
  };

  useEffect(() => {
    async function fetchVenues() {
      try {
        const res = await fetch("/api/v1/venues");
        const data = await res.json();
        if (data.success) {
          setVenues(data.venues);
          if (data.business) {
            setBusiness(data.business);
          }
        }
      } catch (err) {
        console.error("Failed to load venues", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchVenues();
  }, []);

  if (step === "welcome") {
    return (
      <div
        className={`min-h-[100dvh] h-[100dvh] w-full relative bg-black text-white flex flex-col justify-between overflow-hidden select-none transition-all duration-200 ${
          isTransitioning ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"
        }`}
      >
        {/* Atmospheric Badminton Environmental Background (Subtle Context, Not Subject) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
          {/* Badminton Court & Shuttlecock: Positioned and focused to be clearly visible on both mobile and desktop */}
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[75%] md:w-[60%] lg:w-[50%] h-full">
            <img
              src="/images/welcome-shuttlecock.jpg"
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover object-[85%_75%] sm:object-[65%_center] opacity-40 sm:opacity-35 md:opacity-40 filter brightness-90 contrast-110"
            />
            {/* Soft seamless tonal gradient dissolving image into dark canvas */}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent sm:from-black sm:via-black/75" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent sm:from-black sm:via-black/40" />
          </div>
          {/* Pristine reading zone protection on the left */}
          <div className="absolute inset-y-0 left-0 w-[60%] sm:w-[70%] md:w-[55%] bg-gradient-to-r from-black via-black/90 to-transparent" />
        </div>

        {/* Foreground Content Container (Unified Single Surface, No Box/Card) */}
        <div className="relative z-10 max-w-5xl mx-auto w-full h-full flex flex-col justify-between px-5 sm:px-8 md:px-12 py-6 sm:py-9 md:py-11">
          {/* Academy Identity at Top */}
          <header className="flex items-center justify-between w-full">
            <div>
              <span className="font-extrabold text-sm sm:text-base text-white tracking-tight block leading-tight">
                {business?.name || "Nitesh Badminton Academy"}
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-[#79FE0C] tracking-wide block mt-0.5">
                Official Booking Portal
              </span>
            </div>

            <a
              href={business?.websiteUrl || "https://niteshbadmintonacademy.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-slate-400 hover:text-white inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full hover:bg-slate-900/80 border border-transparent hover:border-slate-800 transition-colors tap-target"
            >
              <span>Website</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </header>

          {/* Central Dominant Hero Typography */}
          <div className="my-auto py-3 sm:py-10 max-w-xl md:max-w-2xl text-left">
            {/* Circular Academy Logo (1.2x Larger & Generous Gap Above Headline) */}
            <div className="-mt-14 xs:-mt-16 sm:mt-0 mb-10 xs:mb-12 sm:mb-6 flex justify-center sm:justify-start w-full sm:w-auto">
              <div className="w-36 h-36 xs:w-40 xs:h-40 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-slate-950 border-2 border-[#79FE0C]/40 p-2.5 sm:p-1.5 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_25px_rgba(121,254,12,0.2)]">
                <img
                  src={business?.logoUrl || "/images/nba-logo.jpeg"}
                  alt={business?.name || "Nitesh Badminton Academy"}
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
            </div>

            <h1 className="text-[30px] xs:text-[36px] sm:text-5xl md:text-[54px] lg:text-[58px] font-extrabold text-white tracking-tight leading-[1.08]">
              Book Your Badminton Court <br />
              <span className="text-[#79FE0C]">In 3 Simple Clicks</span>
            </h1>

            <p className="mt-4 sm:mt-5 md:mt-6 text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed font-normal max-w-lg">
              Select your venue, pick your preferred court and time slot, and play. No registration needed.
            </p>

            {/* Desktop & Tablet Next Action (Placed directly in content flow) */}
            <div className="hidden sm:flex items-center gap-4 mt-8 sm:mt-10">
              <button
                type="button"
                onClick={handleGoToVenues}
                className="h-14 px-8 bg-[#79FE0C] hover:bg-[#6de809] active:scale-[0.99] text-black font-extrabold text-base rounded-2xl flex items-center gap-3 shadow-[0_0_25px_rgba(121,254,12,0.35)] hover:shadow-[0_0_35px_rgba(121,254,12,0.5)] transition-all cursor-pointer tap-target"
              >
                <span>Next</span>
                <ArrowRight className="w-5 h-5 text-black stroke-[2.5]" />
              </button>
              <span className="text-xs text-slate-400 font-medium">
                Choose location and view courts
              </span>
            </div>
          </div>

          {/* Mobile Next Action (Full-width, thumb-friendly, completely seamless with background) */}
          <div className="sm:hidden pt-4 pb-2 w-full">
            <button
              type="button"
              onClick={handleGoToVenues}
              className="w-full h-14 bg-[#79FE0C] hover:bg-[#6de809] active:scale-[0.99] text-black font-extrabold text-base rounded-2xl flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(121,254,12,0.35)] transition-all cursor-pointer tap-target"
            >
              <span>Next</span>
              <ArrowRight className="w-5 h-5 text-black stroke-[2.5]" />
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-2.5 font-medium">
              Tap Next to choose your playing location
            </p>
          </div>

          {/* Desktop Subtle Footer Strip */}
          <div className="hidden sm:flex items-center justify-between pt-6 border-t border-slate-800/80 text-xs text-slate-400 font-medium">
            <span>© 2026 {business?.name || "Nitesh Badminton Academy"}</span>
            <div className="flex items-center gap-6">
              <span>Instant Confirmation</span>
              <span>•</span>
              <span>Direct Academy Support</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-black text-white flex flex-col transition-all duration-200 ${
        isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
      }`}
    >
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-15 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleBackToWelcome}
              className="w-9 h-9 xs:w-auto xs:h-9 xs:px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
              title="Back to start"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">Back</span>
            </button>

            {business?.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name || "Logo"}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-slate-950 border border-slate-800 p-0.5 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#79FE0C] flex items-center justify-center text-black font-bold text-xs shadow-md shadow-[#79FE0C]/20 shrink-0 tracking-wider">
                {getInitials(business?.name)}
              </div>
            )}
            <div className="min-w-0">
              <span className="font-bold text-white tracking-tight text-sm sm:text-lg truncate block max-w-[140px] xs:max-w-[200px] sm:max-w-none">
                {business?.name || "Badminton Academy"}
              </span>
              <span className="hidden sm:inline-block text-xs font-bold text-[#79FE0C] bg-[#79FE0C]/10 border border-[#79FE0C]/30 px-2 py-0.5 rounded-full">
                Court Bookings
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={business?.websiteUrl || "https://niteshbadmintonacademy.com"}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5 font-semibold text-xs sm:text-sm tap-target h-8 sm:h-9 px-2.5 sm:px-4 bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white">
                <span className="hidden sm:inline">{business?.name ? `${business.name} Website` : "Academy Website"}</span>
                <span className="sm:hidden">Website</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Festive Banner */}
      <div className="festive-banner w-full py-2 px-3 sm:py-2.5 sm:px-4 flex items-center justify-center text-[11px] sm:text-xs font-bold tracking-wide uppercase shadow-xs text-center leading-tight">
        <Sparkles className="w-3.5 h-3.5 mr-1.5 inline-block shrink-0" />
        <span>Celebrating the Festive Season! Book your courts now.</span>
      </div>

      {/* Venue Selection Screen */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-3.5 sm:px-6 py-5 sm:py-7">
        {/* Venue Selection Header */}
        <div className="flex items-center justify-between gap-2 mb-4 sm:mb-5">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Choose a Venue</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 truncate">
              Select your nearest {business?.name || "Badminton Academy"} location
            </p>
          </div>
          <Badge variant="secondary" className="font-semibold bg-slate-900 text-slate-300 border border-slate-800 shrink-0 text-[11px] sm:text-xs">
            {venues.length} Locations Open
          </Badge>
        </div>

        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-slate-800 bg-slate-900 rounded-3xl">
                <Skeleton className="h-48 w-full rounded-none bg-slate-800" />
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4 bg-slate-800" />
                  <Skeleton className="h-4 w-full bg-slate-800" />
                  <Skeleton className="h-10 w-full mt-4 bg-slate-800" />
                </CardContent>
              </Card>
            ))
          ) : venues.length === 0 ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
              <Card className="bento-card-lavender rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-[#79FE0C] shadow-sm mb-4">
                  <MapPin className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Venues Yet</h3>
                <p className="text-slate-400 max-w-md mx-auto">
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
                  className={`group overflow-hidden hover:border-[#79FE0C]/50 hover:shadow-[0_0_30px_rgba(121,254,12,0.18)] transition-all duration-300 flex flex-col justify-between rounded-3xl ${bentoClass}`}
                >
                  <div>
                    {/* Venue Image with Fullscreen Click */}
                    <div
                      className="relative h-44 sm:h-48 w-full bg-slate-950 overflow-hidden cursor-pointer group/img"
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
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-[2px]">
                            <ZoomIn className="w-4 h-4 text-[#79FE0C]" />
                            <span>Click to View Full Photo</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 border-b border-slate-800 text-slate-400 gap-0.5 p-4 text-center">
                          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                            Badminton Academy
                          </span>
                          <span className="font-semibold text-slate-300 text-base">
                            {venue.name}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {venue.city}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 pointer-events-none">
                        <Badge className="bg-black/85 text-white shadow-sm border border-slate-700 font-semibold backdrop-blur-xs text-[11px]">
                          {venue.courtsCount} Courts
                        </Badge>
                      </div>
                      <div className="absolute bottom-3 left-3 pointer-events-none">
                        <Badge className="bg-[#79FE0C] text-black font-extrabold shadow-md text-[11px]">
                          Open Today
                        </Badge>
                      </div>
                    </div>

                    {/* Venue Details */}
                    <CardContent className="p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#79FE0C] transition-colors">
                        {venue.name}
                      </h3>

                      <div className="mt-2 space-y-1.5 text-xs text-slate-300">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#79FE0C] shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{venue.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#79FE0C] shrink-0" />
                          <span className="font-mono text-[11px] tabular-nums text-slate-300">
                            {venue.openTime} - {venue.closeTime} Daily
                          </span>
                        </div>
                      </div>

                      {venue.description && (
                        <p className="mt-2.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {venue.description}
                        </p>
                      )}
                    </CardContent>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="p-4 sm:p-5 pt-0 mt-auto">
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mb-3">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Starting from</span>
                        <span className="text-lg font-extrabold text-[#79FE0C] tabular-nums">
                          {formatCurrency(venue.startingPrice)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium"> / slot</span>
                      </div>
                      <Badge variant="outline" className="bg-[#79FE0C]/10 text-[#79FE0C] font-bold text-[10px] border-[#79FE0C]/30">
                        Instant Slots
                      </Badge>
                    </div>

                    <Link href={`/v/${venue.slug}`} className="block w-full">
                      <Button className="w-full h-11 font-extrabold gap-1.5 text-xs sm:text-sm tap-target bg-[#79FE0C] hover:bg-[#6de809] text-black shadow-[0_0_15px_rgba(121,254,12,0.25)]">
                        <span>Check Availability</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-black stroke-[2.5]" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Value Proposition Strip */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-[#79FE0C] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Zero App Download</h4>
              <p className="text-xs text-slate-400 mt-1">
                Book instantly directly from your phone browser. No app store installs required.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-[#79FE0C] flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Real-Time Court Inventory</h4>
              <p className="text-xs text-slate-400 mt-1">
                Zero double-booking guarantee. Locked slots immediately update across all players.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-[#79FE0C] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Direct Support</h4>
              <p className="text-xs text-slate-400 mt-1">
                Plans changed? Contact the venue desk directly or use your instant confirmation pass link.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-black py-6 mt-12 text-center text-xs text-slate-400 space-y-2">
        <p className="flex items-center justify-center gap-2">
          <span>Official Portal:</span>
          <a
            href={business?.websiteUrl || "https://niteshbadmintonacademy.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#79FE0C] hover:underline inline-flex items-center gap-1"
          >
            <span>{business?.name || "Nitish Badminton Academy"}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </p>
        <p className="text-slate-500">© 2026 {business?.name || "Badminton Academy"} | Seamless Court Reservations</p>
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
