import AdminUserList from "@/components/AdminUserList";
import { db } from "@/db"; // Adjust path to your database setup
import { officers } from "@/db/schema"; // Adjust path to your Drizzle schema

export type AdminOfficerItem = {
  officerId: string;
  name: string;
  email: string;
  certName?: string;
  profileUrl?: string;
};

// Disable route caching so router.refresh() always fetches updated data
export const dynamic = "force-dynamic";

export default async function AdminPage() {

    let initialOfficers: AdminOfficerItem[] = [];

  try {
    // Direct DB query removes HTTP fetch issues while keeping your exact layout
    const dbOfficers = await db.query.officers.findMany({
      with: {
        officerCerts: {
          with: {
            cert: true,
          },
        },
      },
    });

    initialOfficers = dbOfficers.map((officer) => ({
      officerId: officer.id,
      name: officer.name,
      email: officer.email,
      certName: officer.officerCerts[0]?.cert?.name || undefined,
      profileUrl: officer.avatarUrl || undefined,
    }));
  } catch (err) {
    console.error("Failed to fetch officers:", err);
  }

  return (
    <main className="min-h-screen bg-[#070A12] p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-5xl">
        <AdminUserList initialUsers={initialOfficers} />
      </div>
    </main>
  );
}
