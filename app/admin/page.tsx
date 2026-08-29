import AdminUserList from "@/components/AdminUserList";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import { redirect } from "next/navigation";

export type AdminOfficerItem = {
  officerId: string;
  name: string;
  email: string;
  systemRole: string;
  certName?: string;
  roleName?: string;
  profileUrl?: string;
};

// Disable route caching so router.refresh() always fetches updated data
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();

  // Officers cannot access admin page — redirect to home
  if (!session || session.role === "officer") {
    redirect("/");
  }

  const viewerRole = session.role; // "admin" | "superadmin"

  let initialOfficers: AdminOfficerItem[] = [];

  try {
    const viewerCertIds = new Set<string>();

    if (viewerRole === "admin") {
      const userOfficerCerts = await db.query.officerCerts.findMany({
        where: (oc, { eq }) => eq(oc.officerId, session.userId),
      });
      userOfficerCerts.forEach((oc) => viewerCertIds.add(oc.certId));

      const userAdminCerts = await db.query.certs.findMany({
        where: (c, { eq }) => eq(c.adminId, session.userId),
      });
      userAdminCerts.forEach((c) => viewerCertIds.add(c.id));
    }

    const dbOfficers = await db.query.officers.findMany({
      where: (o, { isNull }) => isNull(o.deletedAt),
      with: {
        officerCerts: {
          with: {
            cert: true,
            officerCertRoles: {
              with: {
                role: true,
              },
            },
          },
        },
      },
    });

    initialOfficers = dbOfficers
      .filter((o) => {
        // Hide currently logged-in user from the user list
        if (o.id === session.userId) return false;

        const role = o.systemRole ?? "officer";

        if (viewerRole === "superadmin") {
          return ["officer", "admin", "superadmin"].includes(role);
        }

        // Admin view: see Super Admins or Officers/Accounts in their assigned CERT(s)
        if (role === "superadmin") return true;

        return o.officerCerts.some((oc) => viewerCertIds.has(oc.certId));
      })
      .map((officer) => ({
        officerId: officer.id,
        name: officer.name,
        email: officer.email,
        systemRole: officer.systemRole ?? "officer",
        certName: officer.officerCerts[0]?.cert?.shortName || undefined,
        roleName:
          officer.officerCerts[0]?.officerCertRoles[0]?.role?.name ||
          undefined,
        profileUrl: officer.avatarUrl || "/unlogin-avatar.svg",
      }));
  } catch (err) {
    console.error("Failed to fetch officers:", err);
  }

  return (
    <main className="min-h-screen bg-[#070A12] p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-5xl">
        <AdminUserList
          initialUsers={initialOfficers}
          viewerRole={viewerRole}
        />
      </div>
    </main>
  );
}
