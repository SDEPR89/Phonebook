import Link from "next/link";
import { db } from "@/db";
import {
  officers,
  phones,
  officerCerts,
  certs,
  officerCertRoles,
  roles,
} from "@/db/schema";
import { and, isNull, or, eq, sql } from "drizzle-orm";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

type CertResultItem = {
  key: string;
  officerId: string;
  name: string;
  email: string;
  profileUrl: string | null;
  certName: string;
  roles: string[];
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const term = q?.trim() || "";

  let results: CertResultItem[] = [];

  if (term) {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regexPattern = `\\y${escapedTerm}`;

    const rows = await db
      .select({
        officerId: officers.id,
        name: officers.name,
        email: officers.email,
        profileUrl: officers.avatarUrl,
        phoneNumber: phones.phoneNumber,
        certId: certs.id,
        certName: certs.name,
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
      .where(
        and(
          isNull(officers.deletedAt),
          or(
            sql`${officers.name} ~* ${regexPattern}`,
            sql`${officers.email} ~* ${regexPattern}`,
            sql`${phones.phoneNumber} ~* ${regexPattern}`,
            sql`${certs.name} ~* ${regexPattern}`,
          ),
        ),
      );

    // Group by (officerId + certId) to create one distinct card per cert
    const certMap = new Map<
      string,
      {
        officerId: string;
        name: string;
        email: string;
        profileUrl: string | null;
        certName: string;
        roles: Set<string>;
      }
    >();

    for (const row of rows) {
      // Create a unique composite key for each officer-cert combination
      const certKey = `${row.officerId}-${row.certId || "no-cert"}`;

      if (!certMap.has(certKey)) {
        certMap.set(certKey, {
          officerId: row.officerId,
          name: row.name,
          email: row.email,
          profileUrl: row.profileUrl,
          certName: row.certName || "No Cert",
          roles: new Set(),
        });
      }

      const entry = certMap.get(certKey)!;
      if (row.roleName) {
        entry.roles.add(row.roleName);
      }
    }

    results = Array.from(certMap.entries()).map(([key, item]) => ({
      key,
      officerId: item.officerId,
      name: item.name,
      email: item.email,
      profileUrl: item.profileUrl,
      certName: item.certName,
      roles: Array.from(item.roles),
    }));
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-slate-100">
          Results for <span className="text-blue-400">&quot;{term}&quot;</span>
        </h1>

        {results.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center text-slate-400">
            No officers found.
          </div>
        ) : (
          <ul className="space-y-3">
            {results.map((r) => (
              <li
                key={r.key}
                className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700 hover:bg-slate-900"
              >
                {r.profileUrl ? (
                  <img
                    src={r.profileUrl}
                    alt={r.name}
                    className="h-12 w-12 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-base font-semibold text-slate-200">
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex flex-col gap-0.5">
                  <Link
                    href={`/officers/${r.officerId}`}
                    className="text-lg font-semibold text-blue-400 transition hover:text-blue-300 hover:underline"
                  >
                    {r.name}
                  </Link>
                  <p className="text-sm text-slate-300">
                    <span className="font-medium text-slate-100">
                      {r.certName}
                    </span>
                    {r.roles.length > 0 ? ` — ${r.roles.join(", ")}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
