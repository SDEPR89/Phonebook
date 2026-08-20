"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminEditOfficerModal from "@/components/AdminEditOfficerModal";
import AdminCreateOfficerModal from "@/components/AdminCreateOfficerModal";
import type { AdminOfficerItem } from "@/app/admin/page";

interface AdminUserListProps {
  initialUsers?: AdminOfficerItem[];
}

export default function AdminUserList({
  initialUsers = [],
}: AdminUserListProps) {
  const router = useRouter();

  const [selectedOfficer, setSelectedOfficer] =
    useState<AdminOfficerItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Admin — All Users</h1>
        <span className="rounded-full border border-blue-800/60 bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-400">
          {initialUsers.length} Records
        </span>
      </div>

      {/* Card List UI */}
      <div className="space-y-3 pb-20">
        {initialUsers.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0D121F] p-8 text-center text-slate-400">
            No officer records found.
          </div>
        ) : (
          initialUsers.map((officer) => (
            <div
              key={officer.officerId}
              className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-[#0D121F] p-4 transition hover:border-slate-700"
            >
              <div className="flex items-center gap-3">
                {officer.profileUrl ? (
                  <img
                    src={officer.profileUrl}
                    alt={officer.name}
                    className="h-10 w-10 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-300">
                    {officer.name ? officer.name.charAt(0) : "U"}
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-slate-100">
                    {officer.name}
                  </h3>
                  <p className="text-xs text-slate-400">{officer.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="rounded-xl border border-blue-800/40 bg-blue-950/60 px-3 py-1 text-xs font-medium text-blue-400">
                  {officer.certName || "No Cert"}
                </span>

                <button
                  type="button"
                  onClick={() => handleEdit(officer)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Navigation Link: Activity History */}
      <button
        type="button"
        onClick={() => router.push("/admin/history")}
        className="fixed bottom-8 left-8 z-50 flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-xs font-semibold text-slate-300 shadow-xl backdrop-blur-md transition hover:scale-105 hover:border-slate-700 hover:bg-slate-800 hover:text-white active:scale-95 cursor-pointer"
      >
        <span>📜</span> View Activity History
      </button>

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
        />
      )}

      <AdminCreateOfficerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}
