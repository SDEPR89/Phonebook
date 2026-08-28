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
    officer.profileUrl || null,
  );
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
      const fetchOptions = async () => {
        setIsLoadingOptions(true);
        try {
          const [certsRes, rolesRes] = await Promise.all([
            fetch("/api/certs"),
            fetch("/api/roles"),
          ]);
          if (certsRes.ok) {
            const data = await certsRes.json();
            setCertOptions(Array.isArray(data) ? data : data.certs || []);
          }
          if (rolesRes.ok) {
            const data = await rolesRes.json();
            setRoleOptions(Array.isArray(data) ? data : data.roles || []);
          }
        } catch (err) {
          console.error("Failed to fetch certs", err);
        } finally {
          setIsLoadingOptions(false);
        }
      };
      fetchOptions();
    }
  }, [isOpen]);

  const isProtectedTarget =
    officer.systemRole === "superadmin" && viewerRole !== "superadmin";

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

      if (res.ok) {
        startTransition(() => {
          router.refresh();
        });
        onSuccess();
        onClose();
        return;
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || `Failed to delete officer (${res.status})`);
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

    // Check if any fields changed
    const isUnchanged =
      name.trim() === (officer.name || "").trim() &&
      email.trim() === (officer.email || "").trim() &&
      certName.trim() === (officer.certName || "").trim() &&
      roleName.trim() === (officer.roleName || "").trim() &&
      systemRole === (officer.systemRole || "officer") &&
      !avatarFile;

    if (isUnchanged) {
      setInfoMessage("Nothing changed.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setInfoMessage(null);

    const formData = new FormData();
    formData.append("officerId", officer.officerId);
    formData.append("name", name);
    formData.append("email", email);
    formData.append("certName", certName);
    formData.append("roleName", roleName);
    formData.append("systemRole", systemRole);
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      const res = await fetch("/api/officers/update", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        startTransition(() => {
          router.refresh();
        });

        onSuccess({
          officerId: officer.officerId,
          name,
          email,
          certName,
          roleName,
          systemRole,
          profileUrl: avatarPreview || officer.profileUrl,
        });
        onClose();
        return;
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || `Failed to update officer (${res.status})`);
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
          className="absolute top-5 right-5 text-slate-400 hover:text-white"
        >
          ✕
        </button>

        <div className="mb-4">
          <h2 className="text-xl font-bold">Edit Officer Profile</h2>
          <p className="text-xs text-slate-400">
            Update user information or remove officer profile.
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
              Profile Avatar
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer items-center justify-between rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/60 p-3 hover:border-slate-700"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAvatarFile(file);
                    setAvatarPreview(URL.createObjectURL(file));
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
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Cert Name
            </label>
            <Dropdown
              options={certOptions}
              value={certName}
              onChange={setCertName}
              placeholder="Select Cert Name"
              disabled={isLoadingOptions}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Role Name
            </label>
            <Dropdown
              options={roleOptions}
              value={roleName}
              onChange={setRoleName}
              placeholder="Select Role Name"
              disabled={isLoadingOptions}
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
                onChange={(e) => setSystemRole(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
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
                  <span className="text-xs font-medium text-slate-400">Are you sure?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting || isSaving}
                    className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-1.5 text-sm font-semibold text-red-500 transition hover:bg-red-900/50 disabled:opacity-50"
                  >
                    {isDeleting ? "..." : "Yes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    disabled={isDeleting || isSaving}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  disabled={isDeleting || isSaving || isProtectedTarget}
                  className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting || isProtectedTarget}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}