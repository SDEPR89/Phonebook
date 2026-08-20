"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  certName: string;
  roles: string[];
  avatarUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export default function UserSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Avatar states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI status states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data: ProfileData = await res.json();
          setProfile(data);
          setName(data.name || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setAvatarPreview(data.avatarUrl || null);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setIsSaving(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: "Profile updated successfully!",
        });
      } else {
        const data = await res.json();
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to update profile.",
        });
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setStatusMessage({
        type: "error",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoftDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/profile", { method: "DELETE" });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to delete user.",
        });
      }
    } catch (err) {
      console.error("Soft delete error:", err);
      setStatusMessage({
        type: "error",
        text: "Failed to delete user.",
      });
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading settings...
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
      <Link
        href="/"
        className="fixed top-6 left-6 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-300 shadow-lg backdrop-blur-md transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
      >
        ← Back to Search
      </Link>

      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-100">Edit User Profile</h2>
          <p className="text-xs text-slate-400">
            Update account information or perform administrative deletion.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`mb-4 rounded-xl px-4 py-2.5 text-xs font-semibold ${
              statusMessage.type === "success"
                ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Profile Avatar
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 bg-slate-950/60 hover:border-slate-600"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && handleFile(e.target.files[0])
                }
              />

              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Preview"
                  className="h-16 w-16 rounded-full border border-slate-600 object-cover"
                />
              ) : (
                <div className="text-center">
                  <p className="text-xs text-slate-400">
                    Drag & drop image here, or{" "}
                    <span className="text-blue-400 underline">click to browse</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name *"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email *"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500"
            />
          </div>

          {/* Cert & Role (Fixed/Unchanged) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400">
                Cert (Fixed)
              </label>
              <input
                type="text"
                disabled
                value={profile?.certName || "No Cert"}
                className="w-full cursor-not-allowed rounded-xl border border-slate-800/60 bg-slate-950/40 px-3.5 py-2 text-sm text-slate-500 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400">
                Role (Fixed)
              </label>
              <input
                type="text"
                disabled
                value={profile?.roles?.join(", ") || "No Role"}
                className="w-full cursor-not-allowed rounded-xl border border-slate-800/60 bg-slate-950/40 px-3.5 py-2 text-sm text-slate-500 outline-none"
              />
            </div>
          </div>

          {/* Created At & Updated At Metadata */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800/80 bg-slate-950/30 p-3 text-xs">
            <div>
              <span className="block text-slate-500 font-medium">Created At</span>
              <span className="text-slate-300 font-mono">
                {formatDate(profile?.createdAt)}
              </span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium">Updated At</span>
              <span className="text-slate-300 font-mono">
                {formatDate(profile?.updatedAt)}
              </span>
            </div>
          </div>

          {/* Actions & Delete Confirmation */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-800/80 pt-4">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400 font-semibold">Confirm Delete?</span>
                <button
                  type="button"
                  onClick={handleSoftDelete}
                  disabled={isDeleting}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
              >
                Delete User
              </button>
            )}

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}