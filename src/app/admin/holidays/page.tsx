"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Plus, Trash2, ShieldAlert } from "lucide-react";

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [dateStr, setDateStr] = useState("");
  const [reason, setReason] = useState("");
  const [venueId, setVenueId] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [holidaysRes, venuesRes] = await Promise.all([
        fetch("/api/v1/admin/holidays"),
        fetch("/api/v1/admin/venues"),
      ]);
      
      const holidaysData = await holidaysRes.json();
      const venuesData = await venuesRes.json();

      if (holidaysData.success) setHolidays(holidaysData.holidays);
      if (venuesData.success) setVenues(venuesData.venues);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateStr,
          reason,
          venueId: venueId === "all" ? null : venueId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDateStr("");
        setReason("");
        setVenueId("all");
        loadData();
      } else {
        alert(data.error || "Failed to add holiday");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this holiday?")) return;
    try {
      const res = await fetch(`/api/v1/admin/holidays?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Holiday Management</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Mark dates as holidays to block all bookings and notify customers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="md:col-span-1">
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Add Holiday</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleAddHoliday} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
                  <Input 
                    type="date" 
                    required 
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Reason</label>
                  <Input 
                    required 
                    placeholder="e.g. Diwali Festival"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    This reason will be shown to customers.
                  </span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Applies To</label>
                  <select
                    value={venueId}
                    onChange={(e) => setVenueId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">All Venues</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  {isSubmitting ? "Adding..." : "Add Holiday"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <div className="md:col-span-2">
          <Card className="border-slate-200 h-full">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-600" />
                Upcoming Holidays
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500">Loading...</div>
              ) : holidays.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900">No holidays scheduled</h3>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Add holidays using the form to block bookings for specific dates.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {holidays.map((holiday) => (
                    <div key={holiday.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900">
                              {format(new Date(holiday.dateStr), "MMM do, yyyy")}
                            </span>
                            <span className="text-[10px] uppercase font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md">
                              {holiday.venue ? holiday.venue.name : "All Venues"}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-medium">{holiday.reason}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(holiday.id)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
