"use client";

import { useState, useRef, FormEvent, startTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CustomSelect from "@/components/CustomSelect";

type AdminCreateCertModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AdminCreateCertModal({
  isOpen,
  onClose,
  onSuccess,
}: AdminCreateCertModalProps) {
  const router = useRouter();

  const [shortName, setShortName] = useState("");
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [sarabanEmail, setSarabanEmail] = useState("");
  const [sarabanContacts, setSarabanContacts] = useState<{type: "phone"|"fax", number: string}[]>([]);
  const [contact247Email, setContact247Email] = useState("");
  const [contact247Phone, setContact247Phone] = useState("");
  const [establishmentStatus, setEstablishmentStatus] = useState("not_started");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append("shortName", shortName);
    formData.append("fullName", fullName);
    formData.append("location", location);
    formData.append("sarabanEmail", sarabanEmail);
    formData.append("sarabanContacts", JSON.stringify(sarabanContacts));
    formData.append("contact247Email", contact247Email);
    formData.append("contact247Phone", contact247Phone);
    formData.append("establishmentStatus", establishmentStatus);
    if (logoFile) {
      formData.append("logo", logoFile);
    }

    try {
      const res = await fetch("/api/certs/create", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        startTransition(() => {
          router.refresh();
        });
        
        // Reset states
        setShortName("");
        setFullName("");
        setLocation("");
        setSarabanEmail("");
        setSarabanContacts([]);
        setContact247Email("");
        setContact247Phone("");
        setEstablishmentStatus("not_started");
        setLogoFile(null);
        setLogoPreview(null);
        
        onSuccess();
        onClose();
        return;
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || `Failed to create CERT (${res.status})`);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0B0F17] p-6 shadow-2xl text-slate-100 my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white"
        >
          ✕
        </button>

        <div className="mb-4">
          <h2 className="text-xl font-bold">Add New CERT</h2>
          <p className="text-xs text-slate-400">
            Create a new CERT entity in the system.
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
              CERT Logo
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-between rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/60 p-3 cursor-pointer hover:border-slate-700"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                    setLogoPreview(URL.createObjectURL(file));
                  }
                }}
              />
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-white/5 overflow-hidden p-1">
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt={shortName}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-12 w-16 items-center justify-center bg-slate-800 text-sm font-semibold text-slate-300">
                      C
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    Upload new logo
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Click to add a CERT image
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Short Name
              </label>
              <input
                type="text"
                required
                value={shortName}
                onChange={(e) => setShortName(e.target.value.toUpperCase())}
                placeholder="e.g. THAICERT"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Establishment Status
              </label>
              <CustomSelect
                value={establishmentStatus}
                onChange={setEstablishmentStatus}
                options={[
                  { value: "not_started", label: "ยังไม่เริ่ม", color: "bg-slate-500" },
                  { value: "in_progress", label: "อยู่ระหว่างการจัดตั้ง", color: "bg-blue-500" },
                  { value: "blocked", label: "ถูกบล็อก", color: "bg-red-500" },
                  { value: "completed", label: "เสร็จสมบูรณ์", color: "bg-emerald-500" },
                  { value: "establishment_completed", label: "จัดตั้งเสร็จสมบูรณ์", color: "bg-indigo-500" },
                  { value: "pending_verification", label: "รอยืนยันข้อมูล", color: "bg-amber-500" },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Saraban Email
            </label>
            <input
              type="email"
              value={sarabanEmail}
              onChange={(e) => setSarabanEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300">Saraban Contacts (Phone/Fax)</label>
              <button 
                type="button" 
                onClick={() => setSarabanContacts([...sarabanContacts, {type: 'phone', number: ''}])} 
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition"
              >
                + Add Contact
              </button>
            </div>
            {sarabanContacts.length === 0 && (
              <p className="text-xs text-slate-500 italic">No contacts added.</p>
            )}
            {sarabanContacts.map((contact, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                <CustomSelect
                  value={contact.type}
                  onChange={(val) => {
                    const newContacts = [...sarabanContacts];
                    newContacts[idx].type = val as "phone" | "fax";
                    setSarabanContacts(newContacts);
                  }}
                  options={[
                    { value: "phone", label: "โทรศัพท์" },
                    { value: "fax", label: "แฟกซ์" },
                  ]}
                  className="w-1/3"
                />
                <input 
                  type="text" 
                  value={contact.number} 
                  placeholder="Number..."
                  onChange={(e) => {
                    const newContacts = [...sarabanContacts];
                    newContacts[idx].number = e.target.value;
                    setSarabanContacts(newContacts);
                  }} 
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" 
                />
                <button 
                  type="button" 
                  onClick={() => setSarabanContacts(sarabanContacts.filter((_, i) => i !== idx))} 
                  className="rounded-xl border border-red-900/40 bg-red-950/20 px-3 text-red-400 hover:bg-red-900/40 transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                24/7 Contact Email
              </label>
              <input
                type="email"
                value={contact247Email}
                onChange={(e) => setContact247Email(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                24/7 Contact Phone
              </label>
              <input
                type="text"
                value={contact247Phone}
                onChange={(e) => setContact247Phone(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end border-t border-slate-800 pt-4 gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {isSaving ? "Creating..." : "Create CERT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
