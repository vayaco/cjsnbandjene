"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ShieldCheck,
  UserCheck,
  Plus,
  Trash2,
  Key,
  Edit2,
  X,
  AlertCircle,
  CheckCircle,
  Users,
} from "lucide-react";

export default function AdminAccountsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New User Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");

  // Reset Password State
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/admin/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setCurrentUserRole(data.currentUserRole);
        setCurrentUserId(data.currentUserId);
        setIsSuperAdmin(data.isSuperAdmin);
      }
    } catch (e) {
      console.error("Failed to load admin users", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewName("");
        setNewEmail("");
        setNewPassword("");
        setNewRole("admin");
        setSuccessMessage(`Account created successfully for ${data.user.name} (${data.user.role === "super_admin" ? "Super Admin" : "Admin"})`);
        setTimeout(() => setSuccessMessage(null), 4000);
        await loadUsers();
      } else {
        setModalError(data.error || "Failed to create administrator account");
      }
    } catch {
      setModalError("Network error while creating administrator account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    const confirmMsg =
      nextStatus === "inactive"
        ? `Are you sure you want to deactivate ${user.name}? They will not be able to log in.`
        : `Reactivate login access for ${user.name}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        await loadUsers();
      } else {
        alert(data.error || "Failed to update account status");
      }
    } catch {
      alert("Error updating account status");
    }
  };

  const handleToggleRole = async (user: any) => {
    const nextRole = user.role === "super_admin" ? "admin" : "super_admin";
    const roleLabel = nextRole === "super_admin" ? "Super Admin" : "Admin";
    if (!confirm(`Change role of ${user.name} to ${roleLabel}?`)) return;

    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (data.success) {
        await loadUsers();
      } else {
        alert(data.error || "Failed to change role");
      }
    } catch {
      alert("Error changing role");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPasswordModal || !resetPasswordValue) return;

    setModalError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/v1/admin/users/${showPasswordModal}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPasswordValue }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPasswordModal(null);
        setResetPasswordValue("");
        setSuccessMessage("Password reset successfully.");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setModalError(data.error || "Failed to reset password");
      }
    } catch {
      setModalError("Network error while resetting password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Are you sure you want to permanently delete the administrator account for ${user.name} (${user.email})? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Account for ${user.name} deleted.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        await loadUsers();
      } else {
        alert(data.error || "Failed to delete account");
      }
    } catch {
      alert("Error deleting account");
    }
  };

  const superAdminCount = users.filter((u) => u.role === "super_admin").length;
  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-emerald-600" />
            <span>Administrator Accounts</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Two-tier account management: Super Admin and Admin staff roles
          </p>
        </div>

        {isSuperAdmin && (
          <Button
            onClick={() => {
              setModalError(null);
              setShowAddModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Administrator</span>
          </Button>
        )}
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Role Notice for Standard Admin */}
      {!isSuperAdmin && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Viewing as Admin</span>
            <span>
              You are logged in with standard Admin permissions. You can view all bookings, calendar schedules, issue monthly passes, and inspect customers. Account creation and role modifications require Super Admin access.
            </span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Super Admins</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {superAdminCount}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Full system control</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Admins</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {adminCount}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Operational & pass management</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Your Active Role</span>
              <span className="text-lg font-black text-slate-900 mt-1 block capitalize">
                {currentUserRole.replace("_", " ")}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">
                {isSuperAdmin ? "Full Ownership Privileges" : "Standard Operations Privileges"}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Descriptions Card */}
      <Card className="border-slate-200 shadow-xs bg-slate-50/60">
        <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-800 border-0 font-bold text-[10px]">
                SUPER ADMIN
              </Badge>
              <span className="font-bold text-slate-900">Full System Ownership</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Can manage administrator accounts, delete/create venues, configure business profile and branding, audit logs, issue monthly passes, and manage all bookings.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-sky-100 text-sky-800 border-0 font-bold text-[10px]">
                ADMIN
              </Badge>
              <span className="font-bold text-slate-900">Operations & Daily Booking</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Can create manual bookings, issue monthly recurring passes, view operational calendar, inspect customers, and generate reports. Cannot delete other administrators.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold">Configured Administrators</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading accounts...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">Admin Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Account Type</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Created Date</th>
                    {isSuperAdmin && <th className="p-4 text-right pr-6">Management</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {users.map((u) => {
                    const isSelf = u.id === currentUserId;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{u.name}</span>
                            {isSelf && (
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-semibold">
                                You
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-600">{u.email}</td>
                        <td className="p-4">
                          {u.role === "super_admin" ? (
                            <Badge className="bg-purple-100 text-purple-800 border-0 font-bold text-[10px]">
                              Super Admin
                            </Badge>
                          ) : (
                            <Badge className="bg-sky-100 text-sky-800 border-0 font-bold text-[10px]">
                              Admin
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge
                            className={
                              u.status === "active"
                                ? "bg-emerald-100 text-emerald-800 border-0 font-semibold text-[10px]"
                                : "bg-slate-100 text-slate-600 border-0 font-semibold text-[10px]"
                            }
                          >
                            {u.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-500 tabular-nums">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        {isSuperAdmin && (
                          <td className="p-4 text-right pr-6 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Role */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleRole(u)}
                                className="h-8 text-[11px] px-2.5 font-semibold text-slate-700"
                                title="Change role between Super Admin and Admin"
                              >
                                <span>Switch to {u.role === "super_admin" ? "Admin" : "Super Admin"}</span>
                              </Button>

                              {/* Reset Password */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setModalError(null);
                                  setResetPasswordValue("");
                                  setShowPasswordModal(u.id);
                                }}
                                className="h-8 text-[11px] px-2 text-slate-600"
                                title="Reset Password"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </Button>

                              {/* Deactivate / Activate */}
                              {!isSelf && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleStatus(u)}
                                  className={`h-8 text-[11px] px-2.5 font-semibold ${
                                    u.status === "active"
                                      ? "text-amber-700 hover:bg-amber-50"
                                      : "text-emerald-700 hover:bg-emerald-50"
                                  }`}
                                >
                                  {u.status === "active" ? "Deactivate" : "Activate"}
                                </Button>
                              )}

                              {/* Delete */}
                              {!isSelf && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(u)}
                                  className="h-8 text-[11px] px-2 text-rose-600 hover:bg-rose-50"
                                  title="Delete Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Add New Admin */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add New Administrator</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <Input
                  required
                  placeholder="e.g. Ramesh Patil"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="text-xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <Input
                  required
                  type="email"
                  placeholder="e.g. ramesh@academy.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Role *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewRole("admin")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newRole === "admin"
                        ? "border-sky-500 bg-sky-50/70 text-sky-950 font-bold"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-xs">Admin</span>
                    <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                      Bookings, monthly passes & operations
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole("super_admin")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newRole === "super_admin"
                        ? "border-purple-500 bg-purple-50/70 text-purple-950 font-bold"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-xs">Super Admin</span>
                    <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                      Full system access & admin accounts
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Temporary Password *</label>
                <Input
                  required
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                >
                  {isSubmitting ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Reset Password</h3>
              <button
                onClick={() => setShowPasswordModal(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Password *</label>
                <Input
                  required
                  type="password"
                  placeholder="At least 6 characters"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="text-xs font-mono"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordModal(null)}
                  className="flex-1 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !resetPasswordValue}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                >
                  {isSubmitting ? "Updating..." : "Save Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
