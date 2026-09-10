"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Phone, Mail, Award } from "lucide-react";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadCustomers(query = "") {
    try {
      setIsLoading(true);
      const url = query
        ? `/api/v1/admin/customers?search=${encodeURIComponent(query)}`
        : "/api/v1/admin/customers";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers(search);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Database</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Unified player directory linked automatically by phone number
        </p>
      </div>

      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <Input
                placeholder="Search customers by name, phone (+91...) or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 text-xs sm:text-sm h-10"
              />
            </div>
            <Button type="submit" size="sm" className="bg-emerald-600 font-bold text-xs">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No customer records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">Customer Name</th>
                    <th className="p-4">Mobile Number</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Total Bookings</th>
                    <th className="p-4">Lifetime Spend</th>
                    <th className="p-4">Last Played</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 pl-6 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                          {c.name?.slice(0, 1) || "P"}
                        </div>
                        <span>{c.name}</span>
                      </td>
                      <td className="p-4 font-mono font-medium text-slate-700">{c.phone}</td>
                      <td className="p-4 text-slate-500">{c.email || "—"}</td>
                      <td className="p-4 font-bold text-slate-800">
                        {c.totalBookings || c._count?.bookings || 0} slots
                      </td>
                      <td className="p-4 font-black text-emerald-700">
                        {formatCurrency(c.totalSpend || 0)}
                      </td>
                      <td className="p-4 text-slate-500">
                        {c.lastBookingAt
                          ? new Date(c.lastBookingAt).toLocaleDateString()
                          : "Recently"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
