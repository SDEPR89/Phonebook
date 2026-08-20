import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  officers,
  phones,
  officerCerts,
  certs,
  officerCertRoles,
  roles,
} from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

type OfficerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OfficerDetailPage({ params }: OfficerPageProps) {
  const { id } = await params;

  // 1. Query selected fields
  const rows = await db
    .select({
      name: officers.name,
      email: officers.email,
      profileUrl: officers.avatarUrl,
      createdAt: officers.createdAt,
      updatedAt: officers.updatedAt,
      phoneNumber: phones.phoneNumber,
      certName: certs.name,
      certIssuedAt: officerCerts.createdAt,
      roleName: roles.name,
    })
    .from(officers)
    .leftJoin(
      phones,
      and(eq(phones.officerId, officers.id), isNull(phones.deletedAt)),
    )
    .leftJoin(officerCerts, eq(officerCerts.officerId, officers.id))
    .leftJoin(certs, eq(certs.id, officerCerts.certId))
    .leftJoin(
      officerCertRoles,
      eq(officerCertRoles.officerCertId, officerCerts.id),
    )
    .leftJoin(roles, eq(roles.id, officerCertRoles.roleId))
    .where(and(eq(officers.id, id), isNull(officers.deletedAt)));

  if (rows.length === 0) {
    notFound();
  }

  // 2. Aggregate phones and map Cert -> Roles
  const firstRow = rows[0];
  const phoneNumbers = new Set<string>();
  const certRolesMap = new Map<string, Set<string>>();

  for (const row of rows) {
    if (row.phoneNumber) {
      phoneNumbers.add(row.phoneNumber);
    }

    if (row.certName) {
      if (!certRolesMap.has(row.certName)) {
        certRolesMap.set(row.certName, new Set<string>());
      }
      if (row.roleName) {
        certRolesMap.get(row.certName)!.add(row.roleName);
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Navigation */}
        <Link
          href="/search"
          className="inline-flex items-center text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
        >
          ← Back to Search
        </Link>

        {/* Header Profile Card */}
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:flex-row sm:items-start">
          {firstRow.profileUrl ? (
            <img
              src={firstRow.profileUrl}
              alt={firstRow.name}
              className="h-24 w-24 rounded-full border-2 border-slate-700 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-700 bg-slate-800 text-3xl font-bold text-slate-200">
              {firstRow.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex flex-col text-center sm:text-left">
            <h1 className="text-2xl font-bold text-slate-100">
              {firstRow.name}
            </h1>
            <p className="text-slate-400">{firstRow.email}</p>
          </div>
        </div>

        {/* Phone Numbers */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-200">
            Phone Number
          </h2>
          {phoneNumbers.size === 0 ? (
            <p className="text-sm text-slate-500">
              No phone numbers available.
            </p>
          ) : (
            <ul className="space-y-2">
              {Array.from(phoneNumbers).map((phone, idx) => (
                <li key={idx} className="font-mono text-sm text-slate-200">
                  {phone}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cert & Corresponding Roles */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">
            Cert & Roles
          </h2>
          {certRolesMap.size === 0 ? (
            <p className="text-sm text-slate-500">No Cert available.</p>
          ) : (
            <div className="space-y-4">
              {Array.from(certRolesMap.entries()).map(
                ([certName, rolesSet]) => {
                  const rolesList = Array.from(rolesSet);
                  return (
                    <div
                      key={certName}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <h3 className="text-base font-semibold text-blue-400">
                        {certName}
                      </h3>

                      <div className="mt-2">
                        <span className="text-xs font-medium text-slate-400">
                          Roles:
                        </span>
                        {rolesList.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            No roles assigned
                          </p>
                        ) : (
                          <ul className="mt-1 list-inside list-disc text-sm text-slate-200">
                            {rolesList.map((role, idx) => (
                              <li key={idx}>{role}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="flex justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500">
          <span>
            Created:{" "}
            {firstRow.createdAt
              ? new Date(firstRow.createdAt).toLocaleString()
              : "N/A"}
          </span>
          <span>
            Updated:{" "}
            {firstRow.updatedAt
              ? new Date(firstRow.updatedAt).toLocaleString()
              : "N/A"}
          </span>
        </div>
      </div>
    </main>
  );
}
