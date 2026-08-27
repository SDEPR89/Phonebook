import Link from "next/link";
import Image from "next/image";
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
  searchParams: Promise<{ q?: string }>;
};

export default async function OfficerDetailPage({
  params,
  searchParams,
}: OfficerPageProps) {
  const { id } = await params;
  const { q } = await searchParams;

  // 1. Query selected fields
  const rows = await db
    .select({
      name: officers.name,
      email: officers.email,
      profileUrl: officers.avatarUrl,
      createdAt: officers.createdAt,
      updatedAt: officers.updatedAt,
      phoneNumber: phones.phoneNumber,
      certName: certs.shortName,
      certIssuedAt: officerCerts.createdAt,
      roleName: roles.name,
    })
    .from(officers)
    .leftJoin(
      phones,
      and(eq(phones.officerId, officers.id), isNull(phones.deletedAt))
    )
    .leftJoin(officerCerts, eq(officerCerts.officerId, officers.id))
    .leftJoin(certs, eq(certs.id, officerCerts.certId))
    .leftJoin(
      officerCertRoles,
      eq(officerCertRoles.officerCertId, officerCerts.id)
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
      <div className="relative z-10 mx-auto max-w-3xl space-y-6">
        {/* Navigation */}
        <div>
          <Link
            href={q ? `/search?q=${encodeURIComponent(q)}` : "/"}
            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/30 bg-indigo-950/60 px-4 py-1.5 text-xs font-semibold text-indigo-200 shadow-inner backdrop-blur-md transition-all hover:border-indigo-200/60 hover:bg-indigo-900/80 hover:text-white"
          >
            ← Back to Search
          </Link>
        </div>

        {/* Header Profile Card (Updated to Light Glass Window) */}
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-indigo-200/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-start">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-indigo-200 bg-indigo-50 shadow-inner">
            {firstRow.profileUrl ? (
              <Image
                src={firstRow.profileUrl}
                alt={firstRow.name}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-indigo-700">
                {firstRow.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex flex-col text-center sm:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
              {firstRow.name}
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              {firstRow.email || "No email available"}
            </p>
          </div>
        </div>

        {/* Phone Numbers */}
        <div className="rounded-3xl border border-indigo-200/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl text-slate-700">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-indigo-900">
            Phone Number
          </h2>
          {phoneNumbers.size === 0 ? (
            <p className="text-sm font-medium text-slate-400">
              No phone numbers available.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Array.from(phoneNumbers).map((phone, idx) => (
                <span
                  key={idx}
                  className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-1.5 font-mono text-sm font-medium text-indigo-950"
                >
                  {phone}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Cert & Corresponding Roles */}
        <div className="rounded-3xl border border-indigo-200/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl text-slate-700">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-indigo-900">
            Certifications & Roles
          </h2>
          {certRolesMap.size === 0 ? (
            <p className="text-sm font-medium text-slate-400">No Cert available.</p>
          ) : (
            <div className="space-y-3">
              {Array.from(certRolesMap.entries()).map(
                ([certName, rolesSet]) => {
                  const rolesList = Array.from(rolesSet);
                  return (
                    <div
                      key={certName}
                      className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 transition-colors hover:bg-indigo-50/80"
                    >
                      <h3 className="text-base font-semibold text-indigo-950">
                        {certName}
                      </h3>

                      <div className="mt-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-indigo-900/70">
                          Roles
                        </span>
                        {rolesList.length === 0 ? (
                          <p className="mt-0.5 text-sm font-medium text-slate-400">
                            No roles assigned
                          </p>
                        ) : (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {rolesList.map((role, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-md border border-purple-200/60 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-900"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="flex flex-col gap-2 rounded-2xl border border-indigo-200/30 bg-[#282240]/60 p-4 text-xs font-medium text-indigo-200/70 backdrop-blur-md sm:flex-row sm:justify-between">
          <span>
            Created:{" "}
            <strong className="text-indigo-100 font-semibold">
              {firstRow.createdAt
                ? new Date(firstRow.createdAt).toLocaleString()
                : "N/A"}
            </strong>
          </span>
          <span>
            Updated:{" "}
            <strong className="text-indigo-100 font-semibold">
              {firstRow.updatedAt
                ? new Date(firstRow.updatedAt).toLocaleString()
                : "N/A"}
            </strong>
          </span>
        </div>
      </div>
    </main>
  );
}