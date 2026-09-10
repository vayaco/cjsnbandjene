"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  MapPin,
  Clock,
  Phone,
  Layers,
  X,
  CheckCircle,
} from "lucide-react";

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New venue form
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [phone, setPhone] = useState("");
  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("23:00");
  const [courtsCount, setCourtsCount] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadVenues = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/admin/venues");
      const data = await res.json();
      if (data.success) {
        setVenues(data.venues);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
  }, []);

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          address,
          city,
          phone,
          openTime,
          closeTime,
          courtsCount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setName("");
        setCode("");
        setAddress("");
        loadVenues();
      } else {
        alert(data.error || "Failed to create venue");
      }
    } catch {
      alert("Error creating venue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Venues & Courts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure branches, court inventories, and operating schedules
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-1.5 text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Venue</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {venues.map((venue) => (
          <Card key={venue.id} className="border-slate-200 shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="bg-slate-100 text-slate-800 text-[10px] font-bold border-0 mb-1">
                    {venue.code}
                  </Badge>
                  <CardTitle className="text-base font-bold text-slate-900">
                    {venue.name}
                  </CardTitle>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {venue.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{venue.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {venue.openTime} - {venue.closeTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-900">
                  {venue.resources?.length || 0} Courts Active
                </span>
              </div>
            </CardContent>

            <div className="p-5 pt-0 border-t border-slate-100 mt-auto">
              <div className="pt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Bookings:</span>
                <span className="font-bold text-slate-900">{venue._count?.bookings || 0}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Venue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add New Venue</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVenue} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Venue Name *</label>
                <Input
                  required
                  placeholder="e.g. SmashZone - Thane"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Code *</label>
                  <Input
                    required
                    placeholder="SZ-THA"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Number of Courts</label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={courtsCount}
                    onChange={(e) => setCourtsCount(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Address *</label>
                <Input
                  required
                  placeholder="Location address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Open Time</label>
                  <Input
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Close Time</label>
                  <Input
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  {isSubmitting ? "Creating..." : "Create Venue"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
