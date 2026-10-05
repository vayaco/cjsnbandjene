"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Settings,
  ShieldCheck,
  History,
  User,
  Building,
  AlertCircle,
  Upload,
  X,
  ImageIcon,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Business info
  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [festiveTheme, setFestiveTheme] = useState("default");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [logsRes, businessRes] = await Promise.all([
          fetch("/api/v1/admin/audit-logs"),
          fetch("/api/v1/admin/business")
        ]);
        
        const logsData = await logsRes.json();
        const businessData = await businessRes.json();

        if (logsData.success) {
          setLogs(logsData.logs);
        }
        if (businessData.success && businessData.business) {
          const b = businessData.business;
          setBusinessName(b.name || "");
          setLogoUrl(b.logoUrl || "");
          setWebsiteUrl(b.websiteUrl || "https://niteshbadmintonacademy.com");
          setSupportPhone(b.supportPhone || "");
          setSupportEmail(b.supportEmail || "");
          setCancellationPolicy(b.cancellationPolicy || "");
          setFestiveTheme(b.festiveTheme || "default");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingLogs(false);
      }
    }
    loadData();
  }, []);

  const handleUploadLogo = async (file: File) => {
    try {
      setIsUploadingLogo(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/admin/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setLogoUrl(data.url);
      } else {
        alert(data.error || "Failed to upload logo image");
      }
    } catch {
      alert("Error uploading logo image");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/admin/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: businessName,
          logoUrl,
          websiteUrl,
          supportPhone,
          supportEmail,
          cancellationPolicy,
          festiveTheme,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("businessSettingsUpdated", {
              detail: { name: businessName, logoUrl },
            })
          );
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.error || "Failed to save settings");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving business settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Business Settings & Audit Trail
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure brand identity, academy logo, cancellation policies, and review audit logs
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Business settings & brand identity updated successfully! Changes reflect across all customer and admin pages.</span>
        </div>
      )}

      {/* Business Profile */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600" />
            <span>Academy Brand Profile & Logo</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
            {/* Academy Logo Upload Section */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
              <label className="font-bold text-slate-900 block">Academy Logo</label>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {logoUrl ? (
                  <div className="relative w-24 h-24 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center shrink-0 shadow-xs group">
                    <img
                      src={logoUrl}
                      alt="Academy Logo"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-slate-900 text-white hover:bg-rose-600 transition-colors shadow-sm"
                      title="Remove Logo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-slate-400 gap-1 shrink-0">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[10px] font-semibold">No Logo</span>
                  </div>
                )}

                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <div className="h-9 px-4 border border-slate-200/90 rounded-full flex items-center gap-2 bg-gradient-to-b from-white to-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-all duration-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_2px_8px_-1px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 active:translate-y-0">
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isUploadingLogo ? "Uploading Logo..." : "Upload Logo Image"}</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingLogo}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadLogo(file);
                        }}
                      />
                    </label>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLogoUrl("")}
                        className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Or paste direct logo URL (https://...)"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="text-xs h-9 bg-white"
                  />
                  <p className="text-[11px] text-slate-500">
                    This logo appears in the top navigation of customer booking pages, booking passes, invoices, and the admin sidebar.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Academy Brand Name</label>
                <Input
                  required
                  placeholder="e.g. Nitesh Badminton Academy"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Displayed on the customer homepage, invoice passes, emails, and header.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Support Phone</label>
                <Input
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Official Academy Website URL</label>
                <Input
                  placeholder="https://niteshbadmintonacademy.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Customer booking navigation and headers link directly to this site so platforms stay interconnected.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Support Email</label>
                <Input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Cancellation Policy</label>
                <textarea
                  rows={2}
                  value={cancellationPolicy}
                  onChange={(e) => setCancellationPolicy(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Festive Season Theme</label>
                <select
                  value={festiveTheme}
                  onChange={(e) => setFestiveTheme(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="default">Default Sport (None)</option>
                  <option value="diwali">Diwali Lights</option>
                  <option value="holi">Holi Colors</option>
                  <option value="christmas">Christmas & New Year</option>
                  <option value="national">National (Independence/Republic Day)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Applies festive accents across the customer portal.
                </span>
              </div>
            </div>

            <Button type="submit" disabled={isSaving} className="font-bold px-6 h-11">
              {isSaving ? "Saving..." : "Save Business Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Audit Logs Section */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600" />
            <span>Immutable Audit Trail</span>
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            Security Compliance
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingLogs ? (
            <div className="p-6 text-slate-400 text-xs">Loading audit records...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No audit logs recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50/70 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 capitalize">
                        {log.action?.replace("_", " ")}
                      </span>
                      <Badge className="bg-slate-100 text-slate-700 text-[9px] border-0">
                        {log.entityType}
                      </Badge>
                    </div>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-slate-600 text-[11px] font-mono bg-slate-50 p-2 rounded-lg mt-1 break-all">
                    {log.details}
                  </div>

                  {log.userEmail && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Triggered by: {log.userEmail}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
