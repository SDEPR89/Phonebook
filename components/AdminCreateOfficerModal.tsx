"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import Dropdown from "./Dropdown";

type CreateOfficerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AdminCreateOfficerModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateOfficerModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cert, setCert] = useState("");
  const [role, setRole] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            setCertOptions(data.certs || []);
          }
          if (rolesRes.ok) {
            const data = await rolesRes.json();
            setRoleOptions(data.roles || []);
          }
        } catch (err) {
          console.error("Failed to fetch options", err);
        } finally {
          setIsLoadingOptions(false);
        }
      };
      fetchOptions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("cert", cert);
    formData.append("role", role);
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      const res = await fetch("/api/officers/create", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        // Reset form
        setName("");
        setEmail("");
        setPhone("");
        setCert("");
        setRole("");
        setAvatarFile(null);
        setAvatarPreview(null);
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create officer.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0B0F17] p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white"
        >
          ✕
        </button>

        <div className="mb-4">
          <h2 className="text-xl font-bold">Add New Officer</h2>
          <p className="text-xs text-slate-400">
            Create a new officer profile and assign certifications.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
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
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 transition ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
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
                  alt="Avatar Preview"
                  className="h-14 w-14 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <p className="text-xs text-slate-400">
                  Drag & drop image here, or{" "}
                  <span className="text-blue-400 underline">
                    click to browse
                  </span>
                </p>
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
                placeholder="Full Name"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
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
                placeholder="Phone number"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
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
              placeholder="officer@cert.or.th"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* Cert & Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Cert Name
              </label>
              <Dropdown
                options={certOptions}
                value={cert}
                onChange={setCert}
                placeholder="e.g. ThaiCERT"
                disabled={isLoadingOptions}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Role Name
              </label>
              <Dropdown
                options={roleOptions}
                value={role}
                onChange={setRole}
                placeholder="e.g. Analyst"
                disabled={isLoadingOptions}
              />
            </div>
          </div>

          {/* Actions */}
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
              {isSaving ? "Creating..." : "+ Add Officer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}