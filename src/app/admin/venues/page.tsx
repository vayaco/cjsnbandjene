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
  Trash2,
  AlertTriangle,
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

  // Delete venue state
  const [venueToDelete, setVenueToDelete] = useState<any>(null);
  const [isDeletingVenue, setIsDeletingVenue] = useState(false);

  // Manage courts states
  const [newCourtName, setNewCourtName] = useState("");
  const [newCourtPrice, setNewCourtPrice] = useState("500");
  const [isAddingCourt, setIsAddingCourt] = useState(false);
  const [deletingCourtId, setDeletingCourtId] = useState<string | null>(null);
  const [editingCourtPriceId, setEditingCourtPriceId] = useState<string | null>(null);
  const [editingCourtPriceValue, setEditingCourtPriceValue] = useState<string>("");
  const [isUpdatingCourtPrice, setIsUpdatingCourtPrice] = useState(false);

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

  const confirmDeleteVenue = async () => {
    if (!venueToDelete) return;
    setIsDeletingVenue(true);
    try {
      const res = await fetch(`/api/v1/admin/venues/${venueToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        if (editVenue?.id === venueToDelete.id) {
          setEditVenue(null);
        }
        setVenueToDelete(null);
        loadVenues();
      } else {
        alert(data.error || "Failed to delete venue");
      }
    } catch {
      alert("Error deleting venue");
    } finally {
      setIsDeletingVenue(false);
    }
  };

  const handleAddCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageVenue || !newCourtName.trim()) return;
    setIsAddingCourt(true);
    try {
      const res = await fetch("/api/v1/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: manageVenue.id,
          name: newCourtName.trim(),
          defaultPrice: Number(newCourtPrice) || 500,
        }),
      });
      const data = await res.json();
      if (data.success && data.resource) {
        const updatedResources = [...(manageVenue.resources || []), data.resource];
        setManageVenue({
          ...manageVenue,
          resources: updatedResources,
        });
        setVenues(venues.map((v) => (v.id === manageVenue.id ? { ...v, resources: updatedResources } : v)));
        setNewCourtName("");
      } else {
        alert(data.error || "Failed to add court");
      }
    } catch {
      alert("Error adding court");
    } finally {
      setIsAddingCourt(false);
    }
  };

  const handleDeleteCourt = async (resourceId: string, courtName: string) => {
    if (!manageVenue) return;
    if (!confirm(`Are you sure you want to delete ${courtName}? Any future bookings on this court may be affected.`)) return;

    setDeletingCourtId(resourceId);
    try {
      const res = await fetch(`/api/v1/admin/resources/${resourceId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        const updatedResources = (manageVenue.resources || []).filter((r: any) => r.id !== resourceId);
        setManageVenue({
          ...manageVenue,
          resources: updatedResources,
        });
        setVenues(venues.map((v) => (v.id === manageVenue.id ? { ...v, resources: updatedResources } : v)));
      } else {
        alert(data.error || "Failed to delete court");
      }
    } catch {
      alert("Error deleting court");
    } finally {
      setDeletingCourtId(null);
    }
  };

  const handleUpdateCourtPrice = async (resourceId: string) => {
    const parsedPrice = Number(editingCourtPriceValue);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      alert("Please enter a valid price amount");
      return;
    }

    setIsUpdatingCourtPrice(true);
    try {
      const res = await fetch(`/api/v1/admin/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPrice: parsedPrice }),
      });
      const data = await res.json();
      if (data.success && data.resource) {
        const updatedResources = (manageVenue.resources || []).map((r: any) =>
          r.id === resourceId ? { ...r, defaultPrice: parsedPrice } : r
        );
        setManageVenue({
          ...manageVenue,
          resources: updatedResources,
        });
        setVenues(venues.map((v) => (v.id === manageVenue.id ? { ...v, resources: updatedResources } : v)));
        setEditingCourtPriceId(null);
      } else {
        alert(data.error || "Failed to update court price");
      }
    } catch {
      alert("Error updating court price");
    } finally {
      setIsUpdatingCourtPrice(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Venues & Courts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure branches, court inventories, and operating schedules
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="font-semibold gap-1.5 text-xs h-10 px-5"
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
            className="font-bold text-xs gap-1.5 h-10 px-5"
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
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {venue.status}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setVenueToDelete(venue)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete venue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
                <div className="grid grid-cols-2 gap-2 mb-2">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVenueToDelete(venue)}
                  className="w-full text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 h-8 gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Venue</span>
                </Button>
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
                  className="flex-1 h-10 font-semibold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="flex-1 font-bold text-xs h-10"
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

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVenueToDelete(editVenue)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 text-xs font-bold h-9 px-4"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete Venue
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditVenue(null)}
                    className="text-xs h-9 px-4"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdatingVenue || isUploading}
                    className="font-bold text-xs h-9 px-5"
                  >
                    {isUpdatingVenue ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Manage Courts</h3>
                <p className="text-xs text-slate-500 font-medium">{manageVenue.name}</p>
              </div>
              <button
                onClick={() => setManageVenue(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Courts */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {manageVenue.resources?.map((resource: any) => (
                <div key={resource.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{resource.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md ${resource.status === 'maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {resource.status}
                        </span>

                        {editingCourtPriceId === resource.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-700">₹</span>
                            <Input
                              type="number"
                              value={editingCourtPriceValue}
                              onChange={(e) => setEditingCourtPriceValue(e.target.value)}
                              className="w-20 h-7 text-xs px-1.5 py-0.5 bg-white"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              type="button"
                              className="h-7 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 font-bold"
                              disabled={isUpdatingCourtPrice}
                              onClick={() => handleUpdateCourtPrice(resource.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              type="button"
                              variant="ghost"
                              className="h-7 px-1.5 text-[10px] text-slate-400"
                              onClick={() => setEditingCourtPriceId(null)}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCourtPriceId(resource.id);
                              setEditingCourtPriceValue(String(resource.defaultPrice));
                            }}
                            className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
                            title="Click to edit hourly price"
                          >
                            <span>₹{resource.defaultPrice}/hr</span>
                            <Edit className="w-2.5 h-2.5 text-emerald-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={resource.status === "maintenance" ? "default" : "outline"}
                      className="text-xs font-bold h-8 px-2.5"
                      onClick={() => handleToggleMaintenance(resource.id, resource.status)}
                    >
                      {resource.status === "maintenance" ? "Enable Court" : "Maintenance"}
                    </Button>
                    <button
                      type="button"
                      disabled={deletingCourtId === resource.id}
                      onClick={() => handleDeleteCourt(resource.id, resource.name)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Court"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {(!manageVenue.resources || manageVenue.resources.length === 0) && (
                <p className="text-slate-500 text-sm text-center py-4">No courts found. Add your first court below.</p>
              )}
            </div>

            {/* Add New Court Form */}
            <form onSubmit={handleAddCourt} className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-xs text-slate-900 mb-2">Add New Court</h4>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Court Name</label>
                  <Input
                    required
                    placeholder="e.g. Court 5"
                    value={newCourtName}
                    onChange={(e) => setNewCourtName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Price per Hour (₹)</label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="500"
                    value={newCourtPrice}
                    onChange={(e) => setNewCourtPrice(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isAddingCourt || !newCourtName.trim()}
                className="w-full h-10 font-bold text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingCourt ? "Adding Court..." : "Add Court to Venue"}</span>
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Venue Confirmation Modal */}
      {venueToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Venue?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete <strong className="text-slate-900">{venueToDelete.name}</strong> ({venueToDelete.code})? 
              This will remove the venue, all its courts, and associated booking records.
            </p>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVenueToDelete(null)}
                disabled={isDeletingVenue}
                className="flex-1 text-xs h-10 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteVenue}
                disabled={isDeletingVenue}
                className="flex-1 font-bold text-xs h-10"
              >
                {isDeletingVenue ? "Deleting..." : "Yes, Delete Venue"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
