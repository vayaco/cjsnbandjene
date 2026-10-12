"use client";

import React from "react";
import { formatTime, formatCurrency, cn } from "@/lib/utils";
import { GeneratedSlot, ResourceAvailability } from "@/lib/availability";
import { Clock, ShieldAlert, CheckCircle2 } from "lucide-react";

interface SlotGridProps {
  resources: ResourceAvailability[];
  selectedSlot: GeneratedSlot | null;
  onSelectSlot: (slot: GeneratedSlot) => void;
  selectedResourceId: string | null;
  onSelectResource: (resourceId: string) => void;
}

export function SlotGrid({
  resources,
  selectedSlot,
  onSelectSlot,
  selectedResourceId,
  onSelectResource,
}: SlotGridProps) {
  // If a resource is selected, filter by it, otherwise show all
  const activeResource =
    resources.find((r) => r.resourceId === selectedResourceId) || resources[0];

  return (
    <div className="w-full space-y-4">
      {/* Resource (Court) Selection Pills */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Select Court
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {resources.length} Courts Available
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none touch-pan-x">
          {resources.map((res) => {
            const isSelected = (activeResource?.resourceId || "") === res.resourceId;
            const availableCount = res.slots.filter((s) => s.status === "available").length;

            return (
              <button
                key={res.resourceId}
                onClick={() => onSelectResource(res.resourceId)}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 select-none shrink-0 cursor-pointer",
                  isSelected
                    ? "bg-[#79FE0C] border-[#79FE0C] text-black shadow-[0_0_15px_rgba(121,254,12,0.3)] font-extrabold"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                )}
              >
                <span>{res.resourceName}</span>
                <span
                  className={cn(
                    "text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-bold",
                    isSelected
                      ? "bg-black/20 text-black"
                      : "bg-[#79FE0C]/15 text-[#79FE0C] border border-[#79FE0C]/30"
                  )}
                >
                  {availableCount} open
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-1.5 px-2.5 text-[11px] sm:text-xs font-medium text-slate-400 bg-slate-950/90 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#79FE0C] shadow-[0_0_6px_#79FE0C] shrink-0" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white shrink-0" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600 shrink-0" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500 shrink-0" />
          <span>Held</span>
        </div>
      </div>

      {/* Slots List for Selected Court */}
      {activeResource ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
            {activeResource.slots.map((slot) => {
              const isSelected = selectedSlot?.slotId === slot.slotId;
              const isAvailable = slot.status === "available";
              const isBooked = slot.status === "booked";
              const isHeld = slot.status === "held";
              const isBlocked = slot.status === "blocked";
              const isPast = slot.status === "past";

              return (
                <button
                  key={slot.slotId}
                  disabled={!isAvailable}
                  onClick={() => onSelectSlot(slot)}
                  className={cn(
                    "relative flex flex-col p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all duration-150 select-none tap-target cursor-pointer",
                    isSelected
                      ? "bg-slate-900 border-[#79FE0C] text-white shadow-[0_0_20px_rgba(121,254,12,0.35)] ring-2 ring-[#79FE0C] scale-[1.02]"
                      : isAvailable
                      ? "bg-slate-950 border-slate-800 hover:border-[#79FE0C] hover:shadow-[0_0_15px_rgba(121,254,12,0.2)] active:scale-[0.98] text-white"
                      : isBooked
                      ? "bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-50"
                      : isHeld
                      ? "bg-amber-950/30 border-amber-850 text-amber-400 cursor-not-allowed"
                      : isBlocked && slot.blockedReason === "Court Under Maintenance"
                      ? "bg-slate-950 border-slate-850 text-slate-600 cursor-not-allowed opacity-70"
                      : "bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={cn(
                        "text-xs font-bold font-mono tabular-nums",
                        isSelected ? "text-[#79FE0C]" : isAvailable ? "text-white" : "text-slate-500"
                      )}
                    >
                      {formatTime(slot.startTime)}
                    </span>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-[#79FE0C]" />
                    ) : isAvailable ? (
                      <span className="text-[10px] uppercase font-bold text-[#79FE0C] bg-[#79FE0C]/10 border border-[#79FE0C]/30 px-1.5 py-0.5 rounded-md">
                        Open
                      </span>
                    ) : isBooked ? (
                      <span className="text-[10px] uppercase font-semibold text-slate-500">
                        Booked
                      </span>
                    ) : isHeld ? (
                      <span className="text-[10px] uppercase font-semibold text-amber-400">
                        Holding
                      </span>
                    ) : isBlocked && slot.blockedReason === "Court Under Maintenance" ? (
                      <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded-md">
                        Maintenance
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-semibold text-slate-500">
                        {isPast ? "Passed" : "Blocked"}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-baseline justify-between w-full">
                    <span
                      className={cn(
                        "text-sm font-bold tracking-tight tabular-nums",
                        isSelected ? "text-[#79FE0C]" : isAvailable ? "text-[#79FE0C]" : "text-slate-600"
                      )}
                    >
                      {formatCurrency(slot.price)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px]",
                        isSelected ? "text-slate-300" : "text-slate-500"
                      )}
                    >
                      60 mins
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-950 rounded-2xl border border-slate-800 p-6">
          <p className="text-slate-400 font-medium">No courts available for this venue.</p>
        </div>
      )}
    </div>
  );
}
