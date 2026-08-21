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

type OfficerResultItem = {
  officerId: string;
  name: string;
  email: string;
  profileUrl: string | null;
  certs: {
    certName: string;
    roles: string[];
  }[];
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const term = q?.trim() || "";

  let results: OfficerResultItem[] = [];

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

    // Group strictly by officerId
    const officerMap = new Map<
      string,
      {
        officerId: string;
        name: string;
        email: string;
        profileUrl: string | null;
        certsMap: Map<string, { certName: string; roles: Set<string> }>;
      }
    >();

    for (const row of rows) {
      if (!officerMap.has(row.officerId)) {
        officerMap.set(row.officerId, {
          officerId: row.officerId,
          name: row.name,
          email: row.email,
          profileUrl: row.profileUrl,
          certsMap: new Map(),
        });
      }

      const officer = officerMap.get(row.officerId)!;

      if (row.certName) {
        const certKey = row.certId || row.certName;
        if (!officer.certsMap.has(certKey)) {
          officer.certsMap.set(certKey, {
            certName: row.certName,
            roles: new Set(),
          });
        }

        if (row.roleName) {
          officer.certsMap.get(certKey)!.roles.add(row.roleName);
        }
      }
    }

    results = Array.from(officerMap.values()).map((officer) => ({
      officerId: officer.officerId,
      name: officer.name,
      email: officer.email,
      profileUrl: officer.profileUrl,
      certs: Array.from(officer.certsMap.values()).map((c) => ({
        certName: c.certName,
        roles: Array.from(c.roles),
      })),
    }));
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold text-slate-100">
          Results for <span className="text-blue-400">&quot;{term}&quot;</span>
        </h1>

        {results.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center text-slate-400">
            No officers found.
          </div>
        ) : (
          <ul className="space-y-4">
            {results.map((r) => (
              <li key={r.officerId}>
                <Link
                  href={`/officers/${r.officerId}${term ? `?q=${encodeURIComponent(term)}` : ""}`}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
                >
                  {r.profileUrl ? (
                    <img
                      src={r.profileUrl}
                      alt={r.name}
                      className="h-12 w-12 shrink-0 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-base font-semibold text-slate-700">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <span className="text-lg font-semibold text-indigo-900 transition-colors group-hover:text-indigo-700 group-hover:underline">
                      {r.name}
                    </span>

                    {r.certs.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {r.certs.map((c, idx) => (
                          <p key={idx} className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-900">
                              {c.certName}
                            </span>
                            {c.roles.length > 0
                              ? ` — ${c.roles.join(", ")}`
                              : ""}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">
                        No Certifications
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}