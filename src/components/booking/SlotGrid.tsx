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
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Court
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {resources.length} Courts Available
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {resources.map((res) => {
            const isSelected = (activeResource?.resourceId || "") === res.resourceId;
            const availableCount = res.slots.filter((s) => s.status === "available").length;

            return (
              <button
                key={res.resourceId}
                onClick={() => onSelectResource(res.resourceId)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold whitespace-nowrap transition-all duration-150 select-none",
                  isSelected
                    ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <span>{res.resourceName}</span>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    isSelected
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-50 text-emerald-700"
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
      <div className="flex flex-wrap items-center gap-4 py-1 px-2 text-xs font-medium text-slate-500 bg-white/70 border border-slate-200/60 rounded-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-900" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300" />
          <span>Held (Checkout)</span>
        </div>
      </div>

      {/* Slots List for Selected Court */}
      {activeResource ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
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
                    "relative flex flex-col p-3 rounded-2xl border text-left transition-all duration-150 select-none tap-target",
                    isSelected
                      ? "bg-slate-900 border-slate-900 text-white shadow-lg ring-2 ring-emerald-500 scale-[1.02]"
                      : isAvailable
                      ? "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-sm active:scale-[0.98]"
                      : isBooked
                      ? "bg-slate-100 border-slate-200/80 text-slate-400 cursor-not-allowed opacity-75"
                      : isHeld
                      ? "bg-amber-50/80 border-amber-200 text-amber-800 cursor-not-allowed"
                      : isBlocked && slot.blockedReason === "Court Under Maintenance"
                      ? "bg-[repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9_10px,#f8fafc_10px,#f8fafc_20px)] border-slate-300 text-slate-400 cursor-not-allowed opacity-80"
                      : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={cn(
                        "text-xs font-bold",
                        isSelected ? "text-slate-200" : isAvailable ? "text-slate-900" : "text-slate-400"
                      )}
                    >
                      {formatTime(slot.startTime)}
                    </span>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isAvailable ? (
                      <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        Open
                      </span>
                    ) : isBooked ? (
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        Booked
                      </span>
                    ) : isHeld ? (
                      <span className="text-[10px] uppercase font-semibold text-amber-700">
                        Holding
                      </span>
                    ) : isBlocked && slot.blockedReason === "Court Under Maintenance" ? (
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-md">
                        Maintenance
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        {isPast ? "Passed" : "Blocked"}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-baseline justify-between w-full">
                    <span
                      className={cn(
                        "text-sm font-extrabold tracking-tight",
                        isSelected ? "text-emerald-400" : isAvailable ? "text-emerald-700" : "text-slate-400"
                      )}
                    >
                      {formatCurrency(slot.price)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px]",
                        isSelected ? "text-slate-400" : "text-slate-400"
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
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-slate-500 font-medium">No courts available for this venue.</p>
        </div>
      )}
    </div>
  );
}
