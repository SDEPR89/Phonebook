"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import Dropdown from "./Dropdown";

type CreateOfficerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

export default function AdminCreateOfficerModal({
  isOpen,
  onClose,
  onSuccess,
  viewerRole = "admin",
}: CreateOfficerModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cert, setCert] = useState("");
  const [role, setRole] = useState("");
  const [systemRole, setSystemRole] = useState<
    "officer" | "admin" | "superadmin"
  >("officer");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);

  const generatePassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let newPass = "";
    for (let i = 0; i < 12; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPass);
  };

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [certOptions, setCertOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [roleOptions, setRoleOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setPhone("");
      setCert("");
      setRole("");
      setSystemRole("officer");
      setPassword("");
      setShowPassword(true);
      setError(null);
      setAvatarFile(null);
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(null);

      const fetchOptions = async () => {
        setIsLoadingOptions(true);
        try {
          const [certsRes, rolesRes] = await Promise.all([
            fetch("/api/certs"),
            fetch("/api/roles"),
          ]);
          let mappedCerts: { id: string; name: string }[] = [];
          if (certsRes.ok) {
            const data = await certsRes.json();
            const certList: any[] = Array.isArray(data) ? data : data.certs || [];
            
            mappedCerts = certList
              .map((item) => ({
                id: String(item.id || item.shortName || item.short_name || ""),
                name: (item.shortName || item.short_name || item.fullName || item.name || "").trim(),
              }))
              .filter((item) => item.name && item.name !== "Select Cert Name");
          }

          if (mappedCerts.length === 0) {
            mappedCerts = DEFAULT_CERTS.map((c) => ({ id: c, name: c }));
          }

          setCertOptions(mappedCerts);

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

            setRoleOptions(Array.from(uniqueRoles.values()));
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

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setAvatarFile(file);
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Name, Email, and Password are required fields.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("email", email.trim());
    formData.append("phone", phone.trim());
    formData.append("cert", cert.trim());
    formData.append("role", role.trim());
    formData.append("systemRole", systemRole);
    formData.append("password", password.trim());
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      const res = await fetch("/api/officers/create", {
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
        // Reset form
        setName("");
        setEmail("");
        setPhone("");
        setCert("");
        setRole("");
        setSystemRole("officer");
        setPassword("");
        setAvatarFile(null);
        if (avatarPreview && avatarPreview.startsWith("blob:")) {
          URL.revokeObjectURL(avatarPreview);
        }
        setAvatarPreview(null);
        onSuccess();
        onClose();
      } else {
        setError(data.error || `ไม่สามารถสร้างผู้ใช้ได้ (${res.status}).`);
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
          disabled={isSaving}
          className="absolute top-5 right-5 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✕
        </button>

        <div className="mb-4">
          <h2 className="text-xl font-bold">เพิ่มผู้ใช้ใหม่</h2>
          <p className="text-xs text-slate-400">
            สร้างโปรไฟล์ผู้ใช้ใหม่และกำหนด CERT
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
              รูปโปรไฟล์
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
                ชื่อ-นามสกุล *
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
                เบอร์โทรศัพท์
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
              อีเมล *
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

          {/* Password Field with Generator Button */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                รหัสผ่าน *
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                ⚡ Generate Secure Password
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Initial account password"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-3.5 pr-10 py-2 text-sm font-mono text-slate-100 outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.573 16.49 16.638 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Cert & Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                ชื่อ CERT
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
                ตำแหน่ง
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

          {/* System Role Selection */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              System Permission Role *
            </label>
            {viewerRole === "superadmin" ? (
              <select
                value={systemRole}
                onChange={(e) => setSystemRole(e.target.value as any)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              >
                <option value="officer">Officer</option>
                <option value="admin">Administrator</option>
                <option value="superadmin">Super Administrator</option>
              </select>
            ) : (
              <input
                type="text"
                disabled
                value="Officer"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2 text-sm text-slate-400 cursor-not-allowed"
              />
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {isSaving ? "กำลังสร้าง..." : "+ เพิ่มผู้ใช้"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
