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
  systemRole?: string;
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
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Avatar states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI status states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const isAdmin =
    profile?.systemRole === "admin" || profile?.systemRole === "superadmin";
  const backDestination = isAdmin ? "/admin" : "/";

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
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

    // Check if any fields actually changed
    const isUnchanged =
      name.trim() === (profile?.name || "").trim() &&
      email.trim() === (profile?.email || "").trim() &&
      phone.trim() === (profile?.phone || "").trim() &&
      !avatarFile &&
      !newPassword.trim();

    if (isUnchanged) {
      setStatusMessage({
        type: "info",
        text: "ไม่มีการเปลี่ยนแปลง",
      });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    if (newPassword.trim()) {
      formData.append("newPassword", newPassword.trim());
    }
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.unchanged) {
          setStatusMessage({
            type: "info",
            text: "ไม่มีการเปลี่ยนแปลง",
          });
          return;
        }

        setStatusMessage({
          type: "success",
          text: "อัปเดตโปรไฟล์สำเร็จ! กำลังเปลี่ยนหน้า...",
        });
        router.refresh();
        setTimeout(() => {
          router.push(backDestination);
        }, 800);
      } else {
        const data = await res.json();
        setStatusMessage({
          type: "error",
          text: data.error || "ไม่สามารถอัปเดตโปรไฟล์ได้",
        });
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setStatusMessage({
        type: "error",
        text: "เกิดข้อผิดพลาด โปรดลองอีกครั้ง",
      });
    } finally {
      setIsSaving(false);
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
        กำลังโหลดการตั้งค่า...
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
      <button
        type="button"
        onClick={() => router.push(backDestination)}
        className="fixed top-6 left-6 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-300 shadow-lg backdrop-blur-md transition hover:border-slate-700 hover:bg-slate-800 hover:text-white cursor-pointer"
      >
        {isAdmin ? "← กลับไปยังหน้าผู้ดูแลระบบ" : "← กลับไปยังหน้าค้นหา"}
      </button>

      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-100">แก้ไขโปรไฟล์ผู้ใช้</h2>
          <p className="text-xs text-slate-400">
            อัปเดตข้อมูลบัญชี
          </p>
        </div>

        {statusMessage && (
          <div
            className={`mb-4 rounded-xl px-4 py-2.5 text-xs font-semibold ${
              statusMessage.type === "success"
                ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : statusMessage.type === "info"
                ? "border border-amber-500/20 bg-amber-500/10 text-amber-400"
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
                    ลากและวางรูปภาพที่นี่ หรือ{" "}
                    <span className="text-blue-400 underline">คลิกเพื่อเลือกไฟล์</span>
                  </p>
                </div>
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
                placeholder="ชื่อ-นามสกุล *"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500"
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
                placeholder="เบอร์โทรศัพท์"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500"
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
              placeholder="อีเมล *"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500"
            />
          </div>

          {/* New Password */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              รหัสผ่านใหม่ (ไม่บังคับ)
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-3.5 pr-10 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.573 16.49 16.638 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Cert & Role (Fixed/Unchanged) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400">
                CERT (ไม่สามารถแก้ไขได้)
              </label>
              <input
                type="text"
                disabled
                value={profile?.certName || "ไม่มี CERT"}
                className="w-full cursor-not-allowed rounded-xl border border-slate-800/60 bg-slate-950/40 px-3.5 py-2 text-sm text-slate-500 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400">
                ตำแหน่ง (ไม่สามารถแก้ไขได้)
              </label>
              <input
                type="text"
                disabled
                value={profile?.roles?.join(", ") || "ไม่มีตำแหน่ง"}
                className="w-full cursor-not-allowed rounded-xl border border-slate-800/60 bg-slate-950/40 px-3.5 py-2 text-sm text-slate-500 outline-none"
              />
            </div>
          </div>

          {/* Created At & Updated At Metadata */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800/80 bg-slate-950/30 p-3 text-xs">
            <div>
              <span className="block text-slate-500 font-medium">วันที่สร้าง</span>
              <span className="text-slate-300 font-mono">
                {formatDate(profile?.createdAt)}
              </span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium">อัปเดตล่าสุด</span>
              <span className="text-slate-300 font-mono">
                {formatDate(profile?.updatedAt)}
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end border-t border-slate-800/80 pt-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(backDestination)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}