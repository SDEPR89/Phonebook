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
  contact247Email: string | null;
  contact247Phone: string | null;
  establishmentStatus: string;
  logoUrl: string | null;
  areaId: string;
  adminId: string | null;
};

export default async function AdminCertsPage() {
  const session = await getSession();

  // Only superadmins can access this page
  if (!session || session.role !== "superadmin") {
    redirect("/admin");
  }

  let certs: AdminCertItem[] = [];
  try {
    const dbCerts = await db.query.certs.findMany({
      orderBy: (certs, { asc }) => [asc(certs.shortName)],
    });
    
    certs = dbCerts.map((cert) => ({
      ...cert,
      sarabanContacts: (cert.sarabanContacts || []) as { type: "phone" | "fax"; number: string }[],
    }));
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
        
        <AdminCertList initialCerts={certs} />
      </div>
    </main>
  );
}
