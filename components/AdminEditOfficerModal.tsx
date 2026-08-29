"use client";

import { useState, useRef, FormEvent, startTransition, useEffect } from "react";
import Dropdown from "./Dropdown";
import { useRouter } from "next/navigation";
import type { AdminOfficerItem } from "@/app/admin/page";

type AdminEditOfficerModalProps = {
  officer: AdminOfficerItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOfficer?: Partial<AdminOfficerItem>) => void;
  viewerRole?: string;
};

const DEFAULT_CERTS = [
  "THAICERT",
  "EnergyCERT",
  "FDA-CERT",
  "TCM-CERT",
  "TA-CERT",
  "Railway CERT",
  "MODCSIRT",
  "THE-CSIRT",
  "Health CERT",
  "NR-CERT",
  "BORA CERT",
  "TB-CERT",
  "DOL-CERT",
  "TCS CERT",
  "HSS-CERT",
  "MOF-CSIRT",
  "CCIB-CERT",
  "TI-CERT",
  "COPCSIRT",
  "DTC CERT",
  "RMUT CERT",
];

export default function AdminEditOfficerModal({
  officer,
  isOpen,
  onClose,
  onSuccess,
  viewerRole = "admin",
}: AdminEditOfficerModalProps) {
  const router = useRouter();

  const [name, setName] = useState(officer.name || "");
  const [email, setEmail] = useState(officer.email || "");
  const [certName, setCertName] = useState(officer.certName || "");
  const [roleName, setRoleName] = useState(officer.roleName || "");
  const [systemRole, setSystemRole] = useState<string>(officer.systemRole || "officer");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    officer.profileUrl || null
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [certOptions, setCertOptions] = useState<{ id: string; name: string }[]>([]);
  const [roleOptions, setRoleOptions] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(officer.name || "");
      setEmail(officer.email || "");
      setCertName(officer.certName || "");
      setRoleName(officer.roleName || "");
      setSystemRole(officer.systemRole || "officer");
      setAvatarFile(null);
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(officer.profileUrl || null);
      setError(null);
      setInfoMessage(null);
      setShowConfirmDelete(false);

      // Populate default options immediately so dropdowns are usable without delay
      const initialCerts = DEFAULT_CERTS.map((c) => ({ id: c, name: c }));
      if (officer.certName && officer.certName.trim()) {
        const current = officer.certName.trim();
        if (!initialCerts.some((c) => c.name.toLowerCase() === current.toLowerCase())) {
          initialCerts.unshift({ id: "curr-" + current, name: current });
        }
      }
      setCertOptions(initialCerts);

      const initialRoles: { id: string; name: string }[] = [];
      if (officer.roleName && officer.roleName.trim()) {
        initialRoles.push({ id: "curr-" + officer.roleName.trim(), name: officer.roleName.trim() });
      }
      setRoleOptions(initialRoles);

      const fetchOptions = async () => {
        try {
          const [certsRes, rolesRes] = await Promise.all([
            fetch("/api/certs"),
            fetch("/api/roles"),
          ]);
          
          if (certsRes.ok) {
            const data = await certsRes.json();
            const certList: any[] = Array.isArray(data) ? data : data.certs || [];
            
            let mappedCerts = certList
              .map((item) => ({
                id: String(item.id || item.shortName || item.short_name || ""),
                name: (item.shortName || item.short_name || item.fullName || item.name || "").trim(),
              }))
              .filter((item) => item.name && item.name !== "Select Cert Name");

            if (mappedCerts.length === 0) {
              mappedCerts = DEFAULT_CERTS.map((c) => ({ id: c, name: c }));
            }

            if (officer.certName && officer.certName.trim()) {
              const current = officer.certName.trim();
              if (!mappedCerts.some((c) => c.name.toLowerCase() === current.toLowerCase())) {
                mappedCerts.unshift({ id: "curr-" + current, name: current });
              }
            }

            setCertOptions(mappedCerts);
          }

          if (rolesRes.ok) {
            const data = await rolesRes.json();
            const roleList: any[] = Array.isArray(data) ? data : data.roles || [];
            
            const uniqueRoles = new Map<string, { id: string; name: string }>();
            roleList.forEach((item) => {
              const rName = (item.name || "").trim();
              if (rName && !uniqueRoles.has(rName.toLowerCase())) {
                uniqueRoles.set(rName.toLowerCase(), {
                  id: String(item.id || rName),
                  name: rName,
                });
              }
            });

            if (officer.roleName && officer.roleName.trim()) {
              const current = officer.roleName.trim();
              if (!uniqueRoles.has(current.toLowerCase())) {
                uniqueRoles.set(current.toLowerCase(), {
                  id: "curr-" + current,
                  name: current,
                });
              }
            }

            setRoleOptions(Array.from(uniqueRoles.values()));
          }
        } catch (err) {
          console.error("Failed to fetch certs/roles", err);
        }
      };
      fetchOptions();
    }
  }, [isOpen, officer]);

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  if (!isOpen) return null;

  const isProtectedTarget =
    officer.systemRole !== "officer" && viewerRole !== "superadmin";

  const handleFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setAvatarFile(file);
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleDelete = async () => {
    if (isProtectedTarget) {
      setError("Only Super Admins can delete Super Admin accounts.");
      return;
    }
    setIsDeleting(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/officers/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerId: officer.officerId }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Response is non-JSON
      }

      if (res.ok) {
        startTransition(() => {
          router.refresh();
        });
        onSuccess();
        onClose();
        return;
      }

      setError(data.error || `ไม่สามารถลบผู้ใช้ได้ (${res.status})`);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    if (isProtectedTarget) {
      setError("Only Super Admins can modify Super Admin accounts.");
      return;
    }

    if (!name.trim() || !email.trim()) {
      setError("Name and Email are required fields.");
      return;
    }

    // Check if any fields changed
    const isUnchanged =
      name.trim() === (officer.name || "").trim() &&
      email.trim() === (officer.email || "").trim() &&
      certName.trim() === (officer.certName || "").trim() &&
      roleName.trim() === (officer.roleName || "").trim() &&
      systemRole === (officer.systemRole || "officer") &&
      !avatarFile;

    if (isUnchanged) {
      setInfoMessage("ไม่มีการเปลี่ยนแปลง");
      return;
    }

    setIsSaving(true);
    setError(null);
    setInfoMessage(null);

    const formData = new FormData();
    formData.append("officerId", officer.officerId);
    formData.append("name", name.trim());
    formData.append("email", email.trim());
    formData.append("certName", certName.trim());
    formData.append("roleName", roleName.trim());
    // Only send systemRole if viewer is superadmin to prevent permission rejection for admins
    if (viewerRole === "superadmin") {
      formData.append("systemRole", systemRole);
    }
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      const res = await fetch("/api/officers/update", {
        method: "POST",
        body: formData,
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Response is non-JSON
      }

      if (res.ok) {
        startTransition(() => {
          router.refresh();
        });

        onSuccess({
          officerId: officer.officerId,
          name: name.trim(),
          email: email.trim(),
          certName: certName.trim(),
          roleName: roleName.trim(),
          systemRole: viewerRole === "superadmin" ? systemRole : officer.systemRole,
          profileUrl: avatarPreview || officer.profileUrl,
        });
        onClose();
        return;
      }

      setError(data.error || `ไม่สามารถอัปเดตผู้ใช้ได้ (${res.status})`);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0B0F17] p-6 shadow-2xl text-slate-100">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving || isDeleting}
          className="absolute top-5 right-5 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✕
        </button>

        <div className="mb-4">
          <h2 className="text-xl font-bold">แก้ไขโปรไฟล์ผู้ใช้</h2>
          <p className="text-xs text-slate-400">
            แก้ไขข้อมูลผู้ใช้ หรือลบโปรไฟล์ผู้ใช้
          </p>
        </div>

        {isProtectedTarget && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-400">
            🔒 Super Admin accounts can only be modified by Super Administrators.
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-400">
            {infoMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              รูปโปรไฟล์
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!isProtectedTarget) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (!isProtectedTarget && e.dataTransfer.files?.[0]) {
                  handleFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => !isProtectedTarget && fileInputRef.current?.click()}
              className={`flex items-center justify-between rounded-xl border-2 border-dashed p-3 transition ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10"
                  : isProtectedTarget
                  ? "border-slate-800 bg-slate-950/60 cursor-not-allowed opacity-60"
                  : "border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                disabled={isProtectedTarget}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFile(file);
                  }
                }}
              />
              <div className="flex items-center gap-3">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={name}
                    className="h-12 w-12 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-300">
                    {name ? name.charAt(0) : "U"}
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    Upload new photo
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Click to replace profile image
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              ชื่อ-นามสกุล
            </label>
            <input
              type="text"
              required
              disabled={isProtectedTarget}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              อีเมล
            </label>
            <input
              type="email"
              required
              disabled={isProtectedTarget}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              ชื่อ CERT
            </label>
            <Dropdown
              options={certOptions}
              value={certName}
              onChange={setCertName}
              placeholder="Select Cert Name"
              disabled={isProtectedTarget || isSaving || isDeleting}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              ตำแหน่ง
            </label>
            <Dropdown
              options={roleOptions}
              value={roleName}
              onChange={setRoleName}
              placeholder="Select Role Name"
              disabled={isProtectedTarget || isSaving || isDeleting}
            />
          </div>

          {/* System Role Selection */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              System Permission Role
            </label>
            {viewerRole === "superadmin" ? (
              <select
                value={systemRole}
                disabled={isProtectedTarget}
                onChange={(e) => setSystemRole(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="officer">User (Officer)</option>
                <option value="admin">Administrator</option>
                <option value="superadmin">Super Administrator</option>
              </select>
            ) : (
              <input
                type="text"
                disabled
                value={
                  systemRole === "superadmin"
                    ? "Super Administrator"
                    : systemRole === "admin"
                    ? "Administrator"
                    : "User (Officer)"
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2 text-sm text-slate-400 cursor-not-allowed"
              />
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
            <div>
              {showConfirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">คุณแน่ใจหรือไม่?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting || isSaving || isProtectedTarget}
                    className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-1.5 text-sm font-semibold text-red-500 transition hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? "..." : "ใช่"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    disabled={isDeleting || isSaving}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                  >
                    ไม่
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  disabled={isDeleting || isSaving || isProtectedTarget}
                  className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ลบ
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting || isSaving}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting || isProtectedTarget}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
