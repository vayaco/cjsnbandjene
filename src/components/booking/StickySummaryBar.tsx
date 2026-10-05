"use client";

import React from "react";
import { formatTimeRange, formatCurrency } from "@/lib/utils";
import { GeneratedSlot } from "@/lib/availability";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

interface StickySummaryBarProps {
  venueName: string;
  selectedDate: Date;
  selectedSlot: GeneratedSlot | null;
  onContinue: () => void;
  isLoading?: boolean;
}

export function StickySummaryBar({
  venueName,
  selectedDate,
  selectedSlot,
  onContinue,
  isLoading = false,
}: StickySummaryBarProps) {
  if (!selectedSlot) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl p-3 sm:p-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 animate-in slide-in-from-bottom">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-6">
        {/* Summary Info */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-slate-900 text-sm sm:text-base truncate">
                {selectedSlot.resourceName}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-600 whitespace-nowrap">
                {format(selectedDate, "EEE, d MMM")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-mono tabular-nums whitespace-nowrap">{formatTimeRange(selectedSlot.startTime, selectedSlot.endTime)}</span>
              <span className="text-slate-300">•</span>
              <span className="truncate max-w-[120px] sm:max-w-none">{venueName}</span>
            </div>
          </div>

          <div className="sm:hidden text-right shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total</span>
            <span className="text-base sm:text-lg font-extrabold tabular-nums text-emerald-600">
              {formatCurrency(selectedSlot.price)}
            </span>
          </div>
        </div>

        {/* Action Button & Desktop Total */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="hidden sm:block text-right">
            <span className="text-xs text-slate-400 block font-medium">Total Price</span>
            <span className="text-2xl font-bold tabular-nums text-emerald-600">
              {formatCurrency(selectedSlot.price)}
            </span>
          </div>

          <Button
            onClick={onContinue}
            disabled={isLoading}
            size="lg"
            className="w-full sm:w-auto flex-1 sm:flex-initial h-11 sm:h-13 px-6 sm:px-8 text-sm sm:text-base font-bold gap-2"
          >
            <span>{isLoading ? "Checking..." : "Continue to Book"}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
