"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Settings, ShieldCheck, History, User, Building, AlertCircle } from "lucide-react";

export default function AdminSettingsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Business info
  const [businessName, setBusinessName] = useState("SmashZone Sports Arena");
  const [supportPhone, setSupportPhone] = useState("+91 98201 12345");
  const [supportEmail, setSupportEmail] = useState("support@smashzone.in");
  const [cancellationPolicy, setCancellationPolicy] = useState(
    "Full refund if cancelled >24 hours prior. 50% refund between 6-24 hours. Non-refundable within 6 hours."
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await fetch("/api/v1/admin/audit-logs");
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingLogs(false);
      }
    }
    loadLogs();
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Business Settings & Audit Trail
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure business metadata, global cancellation rules, and inspect system audit logs
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Business settings updated successfully!</span>
        </div>
      )}

      {/* Business Profile */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600" />
            <span>Business Profile & Contact</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Business Brand Name</label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
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
                <label className="font-bold text-slate-700 block mb-1">Support Email</label>
                <Input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Default Slot Duration</label>
                <Input disabled value="60 Minutes (Standard BWF)" />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Cancellation Policy</label>
              <textarea
                rows={2}
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <Button type="submit" size="sm" className="bg-emerald-600 font-bold">
              Save Business Profile
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
