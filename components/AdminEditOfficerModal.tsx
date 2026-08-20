"use client";

import { useState, useRef, FormEvent, startTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminOfficerItem } from "@/app/admin/page";

type AdminEditOfficerModalProps = {
  officer: AdminOfficerItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOfficer?: Partial<AdminOfficerItem>) => void;
};

export default function AdminEditOfficerModal({
  officer,
  isOpen,
  onClose,
  onSuccess,
}: AdminEditOfficerModalProps) {
  const router = useRouter();

  const [name, setName] = useState(officer.name || "");
  const [email, setEmail] = useState(officer.email || "");
  const [certName, setCertName] = useState(officer.certName || "");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    officer.profileUrl || null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append("officerId", officer.officerId);
    formData.append("name", name);
    formData.append("email", email);
    formData.append("certName", certName);
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
            <input
              type="text"
              value={certName}
              onChange={(e) => setCertName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}