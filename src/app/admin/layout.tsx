"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  PlusCircle,
  Building2,
  Users,
  FileBarChart,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navigationItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Calendar", href: "/admin/calendar", icon: Calendar },
  { name: "Bookings", href: "/admin/bookings", icon: Ticket },
  { name: "Monthly Passes", href: "/admin/passes", icon: Layers },
  { name: "New Booking", href: "/admin/bookings/new", icon: PlusCircle },
  { name: "Venues & Courts", href: "/admin/venues", icon: Building2 },
  { name: "Holidays", href: "/admin/holidays", icon: Calendar },
  { name: "Customers", href: "/admin/customers", icon: Users },
  { name: "Reports", href: "/admin/reports", icon: FileBarChart },
  { name: "Admin Accounts", href: "/admin/admins", icon: Shield },
  { name: "Settings & Audit", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // If on login page, render without sidebar shell
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const fetchBusiness = async () => {
    try {
      const res = await fetch("/api/v1/admin/business");
      const data = await res.json();
      if (data.success && data.business) {
        setBusiness(data.business);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/v1/auth/me");
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          fetchBusiness();
        } else {
          router.push("/admin/login");
        }
      } catch {
        router.push("/admin/login");
      } finally {
        setIsLoadingAuth(false);
      }
    }
    checkAuth();

    const handleUpdate = (e: any) => {
      if (e?.detail) {
        setBusiness((prev: any) => ({ ...prev, ...e.detail }));
      } else {
        fetchBusiness();
      }
    };
    window.addEventListener("businessSettingsUpdated", handleUpdate);
    return () => window.removeEventListener("businessSettingsUpdated", handleUpdate);
  }, [router]);

  const getInitials = (name?: string) => {
    if (!name) return "BA";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch {
      router.push("/admin/login");
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            {business?.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name || "Logo"}
                className="w-8 h-8 rounded-xl object-contain bg-white p-0.5 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-xs shrink-0 tracking-wider">
                {getInitials(business?.name)}
              </div>
            )}
            <div className="min-w-0">
              <span className="font-semibold text-white tracking-tight text-sm truncate block">
                {business?.name || "Badminton Academy"}
              </span>
              <span className="block text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
                Admin OS
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-slate-800/80 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate max-w-[130px]">
                {user?.name || "Staff"}
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] border-0 capitalize">
                {user?.role?.replace("_", " ") || "Admin"}
              </Badge>
            </div>
            <span className="text-[11px] text-slate-400 truncate block mt-0.5">
              {user?.email}
            </span>
          </div>

          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="w-full text-slate-400 hover:text-rose-400 hover:bg-slate-800 justify-start gap-2 text-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs font-semibold text-slate-500 hidden sm:block">
              Multi-Venue Business Management
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" target="_blank">
              <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5">
                <span>View Customer Site</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
