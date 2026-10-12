"use client";

import React from "react";
import { format, addDays, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  daysCount?: number;
}

export function DateStrip({
  selectedDate,
  onSelectDate,
  daysCount = 7,
}: DateStripProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const dates = React.useMemo(() => {
    const today = new Date();
    return Array.from({ length: daysCount }, (_, i) => addDays(today, i));
  }, [daysCount]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const offset = direction === "left" ? -240 : 240;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-[#79FE0C]" />
          Select Date
        </span>
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            aria-label="Previous dates"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            aria-label="Next dates"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x -mx-1 px-1 scroll-smooth touch-pan-x"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {dates.map((date, idx) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = idx === 0;

          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] sm:min-w-[80px] py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl sm:rounded-2xl border transition-all duration-150 snap-start select-none cursor-pointer",
                isSelected
                  ? "bg-[#79FE0C] border-[#79FE0C] text-black shadow-[0_0_20px_rgba(121,254,12,0.35)] scale-[1.02]"
                  : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
              )}
            >
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] font-bold uppercase tracking-wider",
                  isSelected ? "text-black" : "text-slate-400"
                )}
              >
                {isToday ? "Today" : format(date, "EEE")}
              </span>
              <span
                className={cn(
                  "text-lg sm:text-xl font-black tracking-tight mt-0.5 tabular-nums",
                  isSelected ? "text-black" : "text-white"
                )}
              >
                {format(date, "d")}
              </span>
              <span
                className={cn(
                  "text-[9px] sm:text-[10px] font-semibold mt-0.5",
                  isSelected ? "text-slate-900" : "text-slate-500"
                )}
              >
                {format(date, "MMM")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
