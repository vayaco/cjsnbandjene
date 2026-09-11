"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Plus,
  MapPin,
  Clock,
  Phone,
  Layers,
  X,
  CheckCircle,
  ImageIcon,
  Upload,
  Edit,
  Eye,
} from "lucide-react";
import { ImageLightbox } from "@/components/ui/image-lightbox";

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [manageVenue, setManageVenue] = useState<any>(null);

  // New venue form
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [phone, setPhone] = useState("");
  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("23:00");
  const [courtsCount, setCourtsCount] = useState(4);
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Edit venue form
  const [editVenue, setEditVenue] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editOpenTime, setEditOpenTime] = useState("");
  const [editCloseTime, setEditCloseTime] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [isUpdatingVenue, setIsUpdatingVenue] = useState(false);

  // Full-screen image preview lightbox
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

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

  const handleUploadImage = async (file: File, isEdit: boolean = false) => {
    try {
      setIsUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/admin/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success && data.url) {
        if (isEdit) {
          setEditImageUrl(data.url);
        } else {
          setImageUrl(data.url);
        }
      } else {
        alert(data.error || "Failed to upload image");
      }
    } catch {
      alert("Error uploading image");
    } finally {
      setIsUploading(false);
    }
  };

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
          imageUrl: imageUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setName("");
        setCode("");
        setAddress("");
        setImageUrl("");
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

  const handleOpenEditModal = (venue: any) => {
    setEditVenue(venue);
    setEditName(venue.name || "");
    setEditAddress(venue.address || "");
    setEditPhone(venue.phone || "");
    setEditOpenTime(venue.openTime || "06:00");
    setEditCloseTime(venue.closeTime || "23:00");
    setEditImageUrl(venue.imageUrl || "");
  };

  const handleUpdateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVenue) return;
    setIsUpdatingVenue(true);

    try {
      const res = await fetch(`/api/v1/admin/venues/${editVenue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          address: editAddress,
          phone: editPhone,
          openTime: editOpenTime,
          closeTime: editCloseTime,
          imageUrl: editImageUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditVenue(null);
        loadVenues();
      } else {
        alert(data.error || "Failed to update venue");
      }
    } catch {
      alert("Error updating venue");
    } finally {
      setIsUpdatingVenue(false);
    }
  };

  const handleToggleMaintenance = async (resourceId: string, currentStatus: string) => {
    const newStatus = currentStatus === "maintenance" ? "active" : "maintenance";
    try {
      const res = await fetch(`/api/v1/admin/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        // Update local state to reflect change without full reload
        setVenues(venues.map(v => {
          if (v.id === manageVenue.id) {
            return {
              ...v,
              resources: v.resources.map((r: any) => 
                r.id === resourceId ? { ...r, status: newStatus } : r
              )
            };
          }
          return v;
        }));
        setManageVenue({
          ...manageVenue,
          resources: manageVenue.resources.map((r: any) => 
            r.id === resourceId ? { ...r, status: newStatus } : r
          )
        });
      }
    } catch (e) {
      console.error(e);
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-slate-200 p-5 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-10 w-full rounded-xl mt-4" />
            </Card>
          ))}
        </div>
      ) : venues.length === 0 ? (
        <Card className="border-slate-200 border-dashed p-12 text-center flex flex-col items-center">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Venues Added Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
            Add your first branch, specify operating hours, and generate court slots to start accepting bookings.
          </p>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Venue</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {venues.map((venue) => (
            <Card key={venue.id} className="border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
              {/* Venue Image Banner */}
              {venue.imageUrl ? (
                <div
                  className="h-40 w-full relative group cursor-pointer overflow-hidden bg-slate-100"
                  onClick={() => setPreviewImage({ url: venue.imageUrl, title: venue.name })}
                >
                  <img
                    src={venue.imageUrl}
                    alt={venue.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-bold">
                    <Eye className="w-4 h-4" />
                    <span>View Full Image</span>
                  </div>
                </div>
              ) : (
                <div className="h-24 w-full bg-slate-50 border-b border-slate-100 flex items-center justify-center text-slate-400 gap-1.5 text-xs">
                  <ImageIcon className="w-4 h-4" />
                  <span>No Photo Uploaded</span>
                </div>
              )}

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
                <div className="pt-3 flex items-center justify-between text-xs mb-3">
                  <span className="text-slate-400">Total Bookings:</span>
                  <span className="font-bold text-slate-900">{venue._count?.bookings || 0}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full text-xs font-bold tap-target"
                    onClick={() => setManageVenue(venue)}
                  >
                    Manage Courts
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-xs font-bold tap-target gap-1 text-slate-700 hover:text-emerald-700"
                    onClick={() => handleOpenEditModal(venue)}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit & Image</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Venue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
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
                  placeholder="e.g. Badminton Academy - Andheri"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Code *</label>
                  <Input
                    required
                    placeholder="BA-AND"
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

              {/* Venue Image Upload / URL */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="font-bold text-slate-700 block">Venue Image (Optional)</label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer">
                    <div className="h-10 border border-slate-200 rounded-xl px-3 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? "Uploading..." : "Upload Photo from Device"}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(file, false);
                      }}
                    />
                  </label>
                </div>

                <div className="relative">
                  <Input
                    placeholder="Or paste image URL (https://...)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="text-xs pr-8"
                  />
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {imageUrl && (
                  <div className="relative rounded-xl overflow-hidden h-24 border border-slate-200">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
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
                  disabled={isSubmitting || isUploading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  {isSubmitting ? "Creating..." : "Create Venue"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Venue & Change Image Modal */}
      {editVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Venue & Image</h3>
                <span className="text-[11px] text-slate-500">{editVenue.code}</span>
              </div>
              <button
                onClick={() => setEditVenue(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateVenue} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Venue Name</label>
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Address</label>
                <Input
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Open Time</label>
                  <Input
                    value={editOpenTime}
                    onChange={(e) => setEditOpenTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Close Time</label>
                  <Input
                    value={editCloseTime}
                    onChange={(e) => setEditCloseTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Edit Image Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-700 block">Venue Image</label>
                
                {editImageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden h-36 border border-slate-200 bg-slate-100 group">
                    <img src={editImageUrl} alt="Current venue" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditImageUrl("")}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-white hover:bg-rose-600 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="h-24 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1 bg-slate-50">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[11px]">No photo assigned</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <label className="flex-1 cursor-pointer">
                    <div className="h-10 border border-slate-200 rounded-xl px-3 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isUploading ? "Uploading Photo..." : "Upload New Photo"}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(file, true);
                      }}
                    />
                  </label>
                </div>

                <Input
                  placeholder="Or enter image URL (https://...)"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="pt-3 flex gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditVenue(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdatingVenue || isUploading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  {isUpdatingVenue ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox for Admin Image Preview */}
      <ImageLightbox
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ""}
        title={previewImage?.title}
      />

      {/* Manage Courts Modal */}
      {manageVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-lg">Manage Courts: {manageVenue.name}</h3>
              <button
                onClick={() => setManageVenue(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {manageVenue.resources?.map((resource: any) => (
                <div key={resource.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl">
                  <div>
                    <h4 className="font-bold text-slate-800">{resource.name}</h4>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md ${resource.status === 'maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {resource.status}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={resource.status === "maintenance" ? "default" : "outline"}
                    className="text-xs font-bold tap-target"
                    onClick={() => handleToggleMaintenance(resource.id, resource.status)}
                  >
                    {resource.status === "maintenance" ? "Enable Court" : "Set Maintenance"}
                  </Button>
                </div>
              ))}
              {(!manageVenue.resources || manageVenue.resources.length === 0) && (
                <p className="text-slate-500 text-sm text-center">No courts found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
