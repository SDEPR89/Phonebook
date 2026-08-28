"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminEditOfficerModal from "@/components/AdminEditOfficerModal";
import AdminCreateOfficerModal from "@/components/AdminCreateOfficerModal";
import type { AdminOfficerItem } from "@/app/admin/page";

interface AdminUserListProps {
  initialUsers?: AdminOfficerItem[];
  viewerRole?: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  officer: {
    label: "Officer",
    color: "bg-indigo-950/60 text-indigo-400 border-indigo-800/40",
  },
  admin: {
    label: "Admin",
    color: "bg-purple-950/60 text-purple-400 border-purple-800/40",
  },
  superadmin: {
    label: "Super Admin",
    color: "bg-amber-950/60 text-amber-400 border-amber-800/40",
  },
};

export default function AdminUserList({
  initialUsers = [],
  viewerRole = "admin",
}: AdminUserListProps) {
  const router = useRouter();

  const [selectedOfficer, setSelectedOfficer] =
    useState<AdminOfficerItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const handleEdit = (officer: AdminOfficerItem) => {
    setSelectedOfficer(officer);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    router.refresh();
  };

  const handleCreateSuccess = () => {
    router.refresh();
  };

  // Available filter tabs for all admin users
  const filterTabs = ["all", "officer", "admin", "superadmin"];

  const filteredUsers =
    roleFilter === "all"
      ? initialUsers
      : initialUsers.filter((u) => u.systemRole === roleFilter);

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">
          Admin — All Users
        </h1>
        <span className="rounded-full border border-blue-800/60 bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-400">
          {filteredUsers.length} Records
        </span>
      </div>

      {/* Role Filter Pills — shown to both admin and superadmin */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setRoleFilter(tab)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition ${
              roleFilter === tab
                ? tab === "all"
                  ? "bg-slate-700 text-white border-slate-600"
                  : tab === "officer"
                  ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                  : tab === "admin"
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                  : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-300"
            }`}
          >
            {tab === "all"
              ? "All Roles"
              : tab === "superadmin"
              ? "Super Admin"
              : tab}
          </button>
        ))}
      </div>

      {/* Card List UI */}
      <div className="space-y-3 pb-20">
        {filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0D121F] p-8 text-center text-slate-400">
            No records found.
          </div>
        ) : (
          filteredUsers.map((officer) => {
            const roleInfo =
              ROLE_LABELS[officer.systemRole] || ROLE_LABELS.officer;
            const isProtected =
              officer.systemRole === "superadmin" && viewerRole !== "superadmin";

            return (
              <div
                key={officer.officerId}
                className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-[#0D121F] p-4 transition hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={officer.profileUrl || "/unlogin-avatar.svg"}
                    alt={officer.name}
                    className="h-10 w-10 rounded-full border border-slate-700 object-cover"
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-100">
                        {officer.name}
                      </h3>
                      {/* systemRole badge */}
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${roleInfo.color}`}
                      >
                        {roleInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{officer.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="rounded-xl border border-blue-800/40 bg-blue-950/60 px-3 py-1 text-xs font-medium text-blue-400">
                    {officer.certName || "No Cert"}
                  </span>

                  {isProtected ? (
                    <span
                      className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-1.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                      title="Super Admin accounts can only be edited by Super Admins"
                    >
                      Protected
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEdit(officer)}
                      className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Navigation Link: Activity History */}
      <div className="fixed bottom-8 left-8 z-50 flex flex-col gap-3">
        <Link
          href="/admin/history"
          className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-xs font-semibold text-slate-300 shadow-xl backdrop-blur-md transition hover:scale-105 hover:border-slate-700 hover:bg-slate-800 hover:text-white active:scale-95 cursor-pointer"
        >
          <span>📜</span> View Activity History
        </Link>
        
        {viewerRole === "superadmin" && (
          <Link
            href="/admin/certs"
            className="flex items-center gap-2 rounded-2xl border border-indigo-900/60 bg-indigo-950/40 px-4 py-3 text-xs font-semibold text-indigo-300 shadow-xl backdrop-blur-md transition hover:scale-105 hover:border-indigo-700 hover:bg-indigo-900 hover:text-white active:scale-95 cursor-pointer"
          >
            <span>🏢</span> Manage CERTs
          </Link>
        )}
      </div>

      {/* Action Button: Add Officer */}
      <button
        type="button"
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-8 right-8 z-50 flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-600/30 transition hover:scale-105 hover:bg-blue-500 active:scale-95 cursor-pointer"
      >
        <span className="text-lg leading-none">+</span> Add Officer
      </button>

      {/* Modals */}
      {selectedOfficer && (
        <AdminEditOfficerModal
          key={selectedOfficer.officerId}
          officer={selectedOfficer}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          viewerRole={viewerRole}
        />
      )}

      <AdminCreateOfficerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        viewerRole={viewerRole}
      />
    </>
  );
}