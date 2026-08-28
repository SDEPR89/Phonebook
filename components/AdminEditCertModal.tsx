"use client";

import { useState, useRef, FormEvent, startTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminCertItem } from "@/app/admin/certs/page";
import Image from "next/image";
import CustomSelect from "@/components/CustomSelect";

type AdminEditCertModalProps = {
  cert: AdminCertItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  areas: { id: string; name: string }[];
  units: { id: string; name: string }[];
};

export default function AdminEditCertModal({
  cert,
  isOpen,
  onClose,
  onSuccess,
  areas,
  units,
}: AdminEditCertModalProps) {
  const router = useRouter();

  const [shortName, setShortName] = useState(cert.shortName || "");
  const [fullName, setFullName] = useState(cert.fullName || "");
  const [location, setLocation] = useState(cert.location || "");
  const [sarabanEmail, setSarabanEmail] = useState(cert.sarabanEmail || "");
  const [sarabanContacts, setSarabanContacts] = useState<{ type: "phone" | "fax", number: string }[]>(cert.sarabanContacts || []);
  const [contact247Email, setContact247Email] = useState(cert.contact247Email || "");
  const [contact247Phone, setContact247Phone] = useState(cert.contact247Phone || "");
  const [establishmentStatus, setEstablishmentStatus] = useState(cert.establishmentStatus || "not_started");
  const [areaId, setAreaId] = useState(cert.areaId || (areas[0]?.id || ""));
  const [selectedUnits, setSelectedUnits] = useState<{ id: string }[]>(
    cert.certUnits ? cert.certUnits.map(cu => ({ id: cu.unitId })) : []
  );

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    cert.logoUrl || null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/certs/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certId: cert.id }),
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
      setError(data.error || `Failed to delete CERT (${res.status})`);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    const isUnchanged =
      shortName.trim() === (cert.shortName || "").trim() &&
      fullName.trim() === (cert.fullName || "").trim() &&
      location.trim() === (cert.location || "").trim() &&
      sarabanEmail.trim() === (cert.sarabanEmail || "").trim() &&
      JSON.stringify(sarabanContacts) === JSON.stringify(cert.sarabanContacts || []) &&
      contact247Email.trim() === (cert.contact247Email || "").trim() &&
      contact247Phone.trim() === (cert.contact247Phone || "").trim() &&
      establishmentStatus === (cert.establishmentStatus || "not_started") &&
      areaId === cert.areaId &&
      JSON.stringify(selectedUnits.map(u => u.id).sort()) === JSON.stringify((cert.certUnits || []).map(cu => cu.unitId).sort()) &&
      !logoFile;

    if (isUnchanged) {
      setInfoMessage("Nothing changed.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setInfoMessage(null);

    const formData = new FormData();
    formData.append("certId", cert.id);
    formData.append("shortName", shortName);
    formData.append("fullName", fullName);
    formData.append("location", location);
    formData.append("sarabanEmail", sarabanEmail);
    formData.append("sarabanContacts", JSON.stringify(sarabanContacts));
    formData.append("contact247Email", contact247Email);
    formData.append("contact247Phone", contact247Phone);
    formData.append("establishmentStatus", establishmentStatus);
    formData.append("areaId", areaId);
    formData.append("units", JSON.stringify(selectedUnits.map(u => u.id)));
    if (logoFile) {
      formData.append("logo", logoFile);
    }

    try {
      const res = await fetch("/api/certs/update", {
        method: "POST",
        body: formData,
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
      setError(data.error || `Failed to update CERT (${res.status})`);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const fallbackLogoUrl = `/cert/${cert.shortName.endsWith(".png") ? cert.shortName : `${cert.shortName}.png`}`;

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
          <h2 className="text-xl font-bold">Edit CERT Info</h2>
          <p className="text-xs text-slate-400">
            Update CERT information or remove CERT.
          </p>
        </div>

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
                  {logoPreview || fallbackLogoUrl ? (
                    <Image
                      src={logoPreview || fallbackLogoUrl}
                      alt={shortName}
                      width={48}
                      height={48}
                      className="object-contain"
                      onError={() => {
                        // Fallback handling if needed
                      }}
                    />
                  ) : (
                    <div className="flex h-12 w-16 items-center justify-center bg-slate-800 text-sm font-semibold text-slate-300">
                      {shortName ? shortName.charAt(0) : "C"}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    Upload new logo
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Click to replace CERT image
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                ด้าน (Sector)
              </label>
              <CustomSelect
                value={areaId}
                onChange={setAreaId}
                options={areas.map((a) => ({ value: a.id, label: a.name }))}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-300">หน่วย (Agencies/Units)</label>
                <button
                  type="button"
                  onClick={() => setSelectedUnits([...selectedUnits, { id: units[0]?.id || "" }])}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition"
                >
                  + Add Unit
                </button>
              </div>
              {selectedUnits.length === 0 && (
                <p className="text-xs text-slate-500 italic mb-2">No units selected.</p>
              )}
              {selectedUnits.map((unit, idx) => (
                <div key={idx} className="flex gap-2 mb-2 items-center">
                  <CustomSelect
                    value={unit.id}
                    onChange={(val) => {
                      const newUnits = [...selectedUnits];
                      newUnits[idx].id = val;
                      setSelectedUnits(newUnits);
                    }}
                    options={units.map((u) => ({ value: u.id, label: u.name }))}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedUnits(selectedUnits.filter((_, i) => i !== idx))}
                    className="rounded-xl border border-red-900/40 bg-red-950/20 px-3 py-2 text-red-400 hover:bg-red-900/40 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
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
                onClick={() => setSarabanContacts([...sarabanContacts, { type: 'phone', number: '' }])}
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
                  disabled={isDeleting || isSaving}
                  className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-900/50 disabled:opacity-50"
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
                disabled={isSaving || isDeleting}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
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
