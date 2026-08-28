import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import AdminCertList from "@/components/AdminCertList";
import Link from "next/link";

export const dynamic = "force-dynamic";

export type AdminCertItem = {
  id: string;
  shortName: string;
  fullName: string;
  location: string | null;
  sarabanEmail: string | null;
  sarabanContacts: { type: "phone" | "fax"; number: string }[];
  coordinators: string[];
  officers: { id: string; name: string }[];
  contact247Email: string | null;
  contact247Phone: string | null;
  establishmentStatus: string;
  logoUrl: string | null;
  areaId: string;
  adminId: string | null;
  certUnits?: { unitId: string }[];
};

export default async function AdminCertsPage() {
  const session = await getSession();

  // Only superadmins can access this page
  if (!session || session.role !== "superadmin") {
    redirect("/admin");
  }

  let certs: AdminCertItem[] = [];
  let areas: { id: string; name: string }[] = [];
  let units: { id: string; name: string }[] = [];
  try {
    areas = await db.query.areas.findMany({
      orderBy: (areas, { asc }) => [asc(areas.name)],
    });
    const allUnits = await db.query.units.findMany({
      orderBy: (units, { asc }) => [asc(units.name)],
    });
    units = allUnits.filter(u => !u.name.includes(','));

    // Create a map to look up base unit IDs by name
    const baseUnitMap = new Map(units.map(u => [u.name.trim(), u.id]));

    // Map allUnits ID to a list of base unit IDs
    const unitTranslationMap = new Map<string, string[]>();
    for (const u of allUnits) {
      if (u.name.includes(',')) {
        const parts = u.name.split(',').map(p => p.trim());
        const mappedIds = parts.map(p => baseUnitMap.get(p)).filter(Boolean) as string[];
        unitTranslationMap.set(u.id, mappedIds);
      } else {
        unitTranslationMap.set(u.id, [u.id]);
      }
    }

    const dbCerts = await db.query.certs.findMany({
      orderBy: (certs, { asc }) => [asc(certs.shortName)],
      with: {
        certUnits: true,
        officerCerts: {
          with: {
            officer: true,
          }
        },
      }
    });

    certs = dbCerts.map((cert) => {
      // Translate old combined unit IDs to individual base unit IDs
      const translatedUnitIds = new Set<string>();
      for (const cu of cert.certUnits) {
        const mapped = unitTranslationMap.get(cu.unitId);
        if (mapped && mapped.length > 0) {
          mapped.forEach(id => translatedUnitIds.add(id));
        } else {
          translatedUnitIds.add(cu.unitId);
        }
      }

      return {
        ...cert,
        sarabanContacts: (cert.sarabanContacts || []) as { type: "phone" | "fax"; number: string }[],
        coordinators: (cert.coordinators || []) as string[],
        officers: cert.officerCerts ? cert.officerCerts.map((oc) => ({ id: oc.officer.id, name: oc.officer.name })) : [],
        certUnits: Array.from(translatedUnitIds).map(id => ({ unitId: id })),
      };
    });
  } catch (err) {
    console.error("Failed to fetch certs:", err);
  }

  return (
    <main className="min-h-screen bg-[#070A12] p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-5xl">
        {/* Back Link */}
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <span>←</span> Back to Admin Dashboard
        </Link>

        <AdminCertList initialCerts={certs} areas={areas} units={units} />
      </div>
    </main>
  );
}
