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
  areas,
  certUnits,
  units,
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
  let exactCert: any = null;

  if (term) {
    const certRows = await db
      .select({
        id: certs.id,
        shortName: certs.shortName,
        fullName: certs.fullName,
        logoUrl: certs.logoUrl,
        location: certs.location,
        sarabanEmail: certs.sarabanEmail,
        sarabanContacts: certs.sarabanContacts,
        contact247Email: certs.contact247Email,
        contact247Phone: certs.contact247Phone,
        areaName: areas.name,
      })
      .from(certs)
      .leftJoin(areas, eq(certs.areaId, areas.id))
      .where(ilike(certs.shortName, term))
      .limit(1);

    if (certRows.length > 0) {
      const certObj = certRows[0];
      const unitRows = await db
        .select({ name: units.name })
        .from(certUnits)
        .innerJoin(units, eq(certUnits.unitId, units.id))
        .where(eq(certUnits.certId, certObj.id));

      exactCert = {
        ...certObj,
        units: unitRows.map((u) => u.name),
      };
    }

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
        {exactCert && (
          <div className="mb-10 overflow-hidden rounded-3xl border border-indigo-200/20 bg-white/5 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col md:flex-row p-8 md:p-10 gap-8 items-start">
              {/* Logo Block & Coordinators */}
              <div className="flex-shrink-0 flex flex-col gap-6 w-full md:w-48 lg:w-56 items-center md:items-stretch">
                <div className="flex h-32 w-32 md:h-40 md:w-40 items-center justify-center rounded-full bg-white p-4 shadow-lg border border-white/60 overflow-hidden mx-auto">
                  <div className="relative h-full w-full flex items-center justify-center">
                    <Image
                      src={
                        exactCert.logoUrl ||
                        `/cert/${
                          exactCert.shortName?.endsWith(".png")
                            ? exactCert.shortName
                            : `${exactCert.shortName}.png`
                        }`
                      }
                      alt={exactCert.shortName || "CERT Logo"}
                      fill
                      unoptimized
                      className="object-contain p-2"
                    />
                  </div>
                </div>

                {/* Coordinators Section */}
                {results.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-indigo-300/80 uppercase tracking-widest text-center">
                      ผู้ประสานงาน
                    </h3>
                    <div className="flex flex-col gap-2">
                      {results.map((r) => {
                        const profileHref = `/officers/${r.officerId}${
                          term ? `?q=${encodeURIComponent(term)}` : ""
                        }`;
                        return (
                          <Link
                            key={r.officerId}
                            href={profileHref}
                            className="group block bg-white/5 hover:bg-white/10 transition-all border border-indigo-200/10 hover:border-indigo-300/30 rounded-xl p-3 shadow-sm hover:shadow-md"
                          >
                            <p className="font-semibold text-indigo-50 group-hover:text-white transition-colors truncate text-sm">
                              {r.name}
                            </p>
                            {r.phones.length > 0 && (
                              <p className="text-xs text-indigo-200 mt-1 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {r.phones[0]}
                              </p>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-grow flex flex-col justify-between h-full space-y-6">
                <div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-snug">
                    {exactCert.shortName}
                  </h2>

                  {(() => {
                    const match = exactCert.fullName.match(
                      /^(.*?)(?:\s*\((.*?)\))?$/,
                    );
                    const thaiName = match?.[1]?.trim() || exactCert.fullName;
                    const engName = match?.[2]?.trim() || "";

                    return (
                      <>
                        <p className="text-xl font-semibold text-indigo-200 mt-2">
                          {thaiName}
                        </p>
                        {engName && (
                          <p className="text-lg font-medium text-indigo-300 mt-1">
                            {engName}
                          </p>
                        )}
                      </>
                    );
                  })()}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {exactCert.areaName &&
                      exactCert.areaName
                        .split(",")
                        .map((area: string, idx: number) => (
                          <div
                            key={`area-${idx}`}
                            className="flex items-center gap-2 text-indigo-100"
                          >
                            <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-sm font-semibold border border-indigo-400/30">
                              {area.trim()}
                            </span>
                          </div>
                        ))}
                    {exactCert.units.length > 0 &&
                      exactCert.units
                        .flatMap((u: string) => u.split(","))
                        .map((unitName: string, idx: number) => (
                          <div
                            key={`unit-${idx}`}
                            className="flex flex-wrap items-center gap-2 text-indigo-100"
                          >
                            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-sm font-semibold border border-purple-400/30">
                              {unitName.trim()}
                            </span>
                          </div>
                        ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-950/40 p-5 rounded-2xl border border-indigo-500/10">
                  {/* 24/7 Contact */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">
                      ช่องทางติดต่อ 24/7
                    </h3>
                    <p className="text-sm text-indigo-100 flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-indigo-400 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      {exactCert.contact247Phone || "-"}
                    </p>
                    <p className="text-sm text-indigo-100 flex items-center gap-2 break-all">
                      <svg
                        className="w-4 h-4 text-indigo-400 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      {exactCert.contact247Email || "-"}
                    </p>
                  </div>

                  {/* Saraban Contact */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">
                      ช่องทางติดต่อสารบัญ
                    </h3>
                    {exactCert.sarabanContacts?.length > 0 ? (
                      exactCert.sarabanContacts.map((c: any, i: number) => (
                        <p
                          key={i}
                          className="text-sm text-indigo-100 flex items-center gap-2"
                        >
                          <svg
                            className="w-4 h-4 text-indigo-400 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          {c.number} {c.type}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-indigo-100 flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-indigo-400 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        -
                      </p>
                    )}
                    <p className="text-sm text-indigo-100 flex items-center gap-2 break-all">
                      <svg
                        className="w-4 h-4 text-indigo-400 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      {exactCert.sarabanEmail || "-"}
                    </p>
                  </div>
                </div>

                {/* Location */}
                {exactCert.location && (
                  <div className="flex items-start gap-3 bg-indigo-950/20 p-4 rounded-xl border border-indigo-500/10">
                    <svg
                      className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="text-sm text-indigo-100 leading-relaxed">
                      {exactCert.location}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
            ผลลัพธ์การค้นหา {" "}
            <span className="text-indigo-200">&quot;{term}&quot;</span>
          </h1>
          <span className="rounded-full border border-indigo-200/30 bg-indigo-900/50 px-3.5 py-1 text-xs font-semibold text-indigo-100 shadow-inner backdrop-blur-md">
            {results.length} ผลลัพธ์
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
                      ชื่อ นามสกุล
                    </th>
                    <th scope="col" className="px-6 py-4">
                      อีเมล
                    </th>
                    <th scope="col" className="px-6 py-4">
                      เบอร์ติดต่อ
                    </th>
                    <th scope="col" className="px-6 py-4">
                      ตำแหน่ง
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