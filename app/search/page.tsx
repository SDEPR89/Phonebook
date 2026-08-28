import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import {
  officers,
  phones,
  officerCerts,
  certs,
  officerCertRoles,
  roles,
} from "@/db/schema";
import { and, isNull, or, eq, ilike } from "drizzle-orm";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

type OfficerResultItem = {
  officerId: string;
  name: string;
  email: string;
  profileUrl: string | null;
  phones: string[];
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
    const searchPattern = `%${term}%`;

    const rows = await db
      .select({
        officerId: officers.id,
        name: officers.name,
        email: officers.email,
        profileUrl: officers.avatarUrl,
        phoneNumber: phones.phoneNumber,
        certId: certs.id,
        certName: certs.shortName,
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
            ilike(officers.name, searchPattern),
            ilike(officers.email, searchPattern),
            ilike(phones.phoneNumber, searchPattern),
            ilike(certs.shortName, searchPattern),
            ilike(certs.fullName, searchPattern),
          ),
        ),
      )
      .limit(100);

    const officerMap = new Map<
      string,
      {
        officerId: string;
        name: string;
        email: string;
        profileUrl: string | null;
        phonesSet: Set<string>;
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
          phonesSet: new Set(),
          certsMap: new Map(),
        });
      }

      const officer = officerMap.get(row.officerId)!;

      if (row.phoneNumber) {
        officer.phonesSet.add(row.phoneNumber);
      }

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
      phones: Array.from(officer.phonesSet),
      certs: Array.from(officer.certsMap.values()).map((c) => ({
        certName: c.certName,
        roles: Array.from(c.roles),
      })),
    }));
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1c182e] px-4 py-12 text-slate-100">
      <style>{`
        @keyframes auroraWave {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.2); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes floatGeo1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(25deg); }
        }
        @keyframes floatGeo2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(35px) rotate(-30deg); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }

        .animate-aurora-1 { animation: auroraWave 30s linear infinite; }
        .animate-aurora-2 { animation: auroraWave 40s linear infinite reverse; }
        .animate-geo-1 { animation: floatGeo1 12s ease-in-out infinite; }
        .animate-geo-2 { animation: floatGeo2 15s ease-in-out infinite; }
        .animate-scan { animation: scanline 10s linear infinite; }
      `}</style>

      {/* BACKGROUND LAYER 1: Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-75">
        <div className="animate-aurora-1 absolute -left-1/4 -top-1/4 h-[45rem] w-[45rem] rounded-[40%] bg-gradient-to-tr from-indigo-500/40 via-purple-500/35 to-slate-300/20 blur-[130px]" />
        <div className="animate-aurora-2 absolute -bottom-1/4 -right-1/4 h-[50rem] w-[50rem] rounded-[45%] bg-gradient-to-br from-violet-500/35 via-indigo-600/40 to-blue-400/25 blur-[140px]" />
      </div>

      {/* BACKGROUND LAYER 2: Glass Geometric Accents */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="animate-geo-1 absolute top-20 left-[10%] h-40 w-40 rounded-full border border-indigo-200/25 bg-gradient-to-b from-indigo-200/10 to-transparent shadow-[0_0_30px_rgba(99,102,241,0.12)]" />
        <div className="animate-geo-2 absolute bottom-28 right-[12%] h-56 w-56 rotate-12 rounded-3xl border border-purple-200/25 bg-gradient-to-tr from-purple-200/10 via-transparent to-indigo-300/10 shadow-[0_0_40px_rgba(168,85,247,0.12)] backdrop-blur-[2px]" />
      </div>

      {/* BACKGROUND LAYER 3: Structural Overlay & Grid */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="animate-scan absolute inset-x-0 h-40 bg-gradient-to-b from-transparent via-indigo-200/10 to-transparent pointer-events-none" />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(199, 210, 254, 0.18) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(199, 210, 254, 0.18) 1px, transparent 1px)
            `,
            backgroundSize: "36px 36px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,#1c182e_85%)]" />
      </div>

      {/* FOREGROUND CONTENT CONTAINER */}
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
            Results for{" "}
            <span className="text-indigo-200">&quot;{term}&quot;</span>
          </h1>
          <span className="rounded-full border border-indigo-200/30 bg-indigo-900/50 px-3.5 py-1 text-xs font-semibold text-indigo-100 shadow-inner backdrop-blur-md">
            {results.length} Found
          </span>
        </div>

        {results.length === 0 ? (
          <div className="rounded-3xl border border-indigo-200/30 bg-[#282240]/80 p-10 text-center text-indigo-100/90 shadow-xl backdrop-blur-xl">
            <p className="text-lg font-medium">No officers match your query.</p>
            <p className="mt-1 text-sm text-indigo-200/70">
              Try searching with a different name, phone, or certificate name.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-indigo-200/20 bg-white/95 shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="border-b border-indigo-100 bg-indigo-50/80 text-xs font-bold uppercase tracking-wider text-indigo-900">
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      CERT
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Officer
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Phone
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {results.map((r) => {
                    const profileHref = `/officers/${r.officerId}${
                      term ? `?q=${encodeURIComponent(term)}` : ""
                    }`;

                    return (
                      <tr
                        key={r.officerId}
                        className="group relative transition-colors hover:bg-indigo-50/60"
                      >
                        {/* CERT */}
                        <td className="px-6 py-4 text-slate-800">
                          {r.certs.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {r.certs.map((c, idx) => (
                                <span
                                  key={idx}
                                  className="font-semibold text-indigo-950"
                                >
                                  {c.certName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">
                              No Cert
                            </span>
                          )}
                        </td>
                        {/* Name & Avatar */}
                        <td className="relative px-6 py-4">
                          <Link
                            href={profileHref}
                            className="flex items-center gap-3 font-semibold text-slate-900 group-hover:text-indigo-600 focus:outline-none"
                          >
                            {/* Clickable Overlay Link covering whole row */}
                            <span
                              className="absolute inset-0 z-10"
                              aria-hidden="true"
                            />

                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-indigo-200 bg-indigo-50">
                              {r.profileUrl ? (
                                <Image
                                  src={r.profileUrl}
                                  alt={r.name}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center font-bold text-indigo-700">
                                  {r.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="truncate">{r.name}</span>
                          </Link>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4 text-slate-600">
                          {r.email || "-"}
                        </td>

                        {/* Phone */}
                        <td className="px-6 py-4 text-slate-600">
                          {r.phones.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {r.phones.map((phone, idx) => (
                                <span key={idx}>{phone}</span>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4 text-slate-600">
                          {r.certs.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {r.certs.map((c, idx) => (
                                <span key={idx}>
                                  {c.roles.length > 0
                                    ? c.roles.join(", ")
                                    : "-"}
                                </span>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
