"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminEditCertModal from "@/components/AdminEditCertModal";
import AdminCreateCertModal from "@/components/AdminCreateCertModal";
import type { AdminCertItem } from "@/app/admin/certs/page";
import Image from "next/image";

interface AdminCertListProps {
  initialCerts?: AdminCertItem[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: {
    label: "ยังไม่เริ่ม",
    color: "bg-slate-950/60 text-slate-400 border-slate-800/40",
  },
  in_progress: {
    label: "อยู่ระหว่างการจัดตั้ง",
    color: "bg-blue-950/60 text-blue-400 border-blue-800/40",
  },
  blocked: {
    label: "ถูกบล็อก",
    color: "bg-red-950/60 text-red-400 border-red-800/40",
  },
  completed: {
    label: "เสร็จสมบูรณ์",
    color: "bg-emerald-950/60 text-emerald-400 border-emerald-800/40",
  },
  establishment_completed: {
    label: "จัดตั้งเสร็จสมบูรณ์",
    color: "bg-indigo-950/60 text-indigo-400 border-indigo-800/40",
  },
  pending_verification: {
    label: "รอยืนยันข้อมูล",
    color: "bg-amber-950/60 text-amber-400 border-amber-800/40",
  },
};

export default function AdminCertList({ initialCerts = [] }: AdminCertListProps) {
  const router = useRouter();

  const [selectedCert, setSelectedCert] = useState<AdminCertItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  
  const handleEdit = (cert: AdminCertItem) => {
    setSelectedCert(cert);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    router.refresh();
  };

  const handleImageError = (certId: string) => {
    setFailedImages((prev) => ({ ...prev, [certId]: true }));
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">
          Admin — Manage CERTs
        </h1>
        <span className="rounded-full border border-blue-800/60 bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-400">
          {initialCerts.length} CERTs
        </span>
      </div>

      <div className="space-y-3 pb-20">
        {initialCerts.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0D121F] p-8 text-center text-slate-400">
            No CERTs found.
          </div>
        ) : (
          initialCerts.map((cert) => {
            const statusInfo = STATUS_LABELS[cert.establishmentStatus] || STATUS_LABELS.not_started;
            const logoSrc = cert.logoUrl || `/cert/${cert.shortName.endsWith(".png") ? cert.shortName : `${cert.shortName}.png`}`;
            
            return (
              <div
                key={cert.id}
                className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-[#0D121F] p-4 transition hover:border-slate-700"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-white/5 overflow-hidden p-1">
                    {!failedImages[cert.id] ? (
                       <Image
                         src={logoSrc}
                         alt={cert.shortName}
                         width={48}
                         height={48}
                         className="object-contain"
                         onError={() => handleImageError(cert.id)}
                       />
                    ) : (
                      <span className="text-xs font-bold text-slate-500">IMG</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-100">
                        {cert.shortName}
                      </h3>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm truncate">{cert.fullName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleEdit(cert)}
                    className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-8 right-8 z-50 flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-600/30 transition hover:scale-105 hover:bg-blue-500 active:scale-95 cursor-pointer"
      >
        <span className="text-lg leading-none">+</span> Add CERT
      </button>

      {selectedCert && (
        <AdminEditCertModal
          key={selectedCert.id}
          cert={selectedCert}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      <AdminCreateCertModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
