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
    <main className="relative min-h-screen overflow-hidden bg-[#1c182e] px-4 py-12 text-slate-100">
      <style>{`
        /* Smooth, subtle ambient drift */
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

      {/* BACKGROUND LAYER 1: Soft Medium Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-75">
        <div className="animate-aurora-1 absolute -left-1/4 -top-1/4 h-[45rem] w-[45rem] rounded-[40%] bg-gradient-to-tr from-indigo-500/40 via-purple-500/35 to-slate-300/20 blur-[130px]" />
        <div className="animate-aurora-2 absolute -bottom-1/4 -right-1/4 h-[50rem] w-[50rem] rounded-[45%] bg-gradient-to-br from-violet-500/35 via-indigo-600/40 to-blue-400/25 blur-[140px]" />
      </div>

      {/* BACKGROUND LAYER 2: Glass Geometric Accents */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Floating Ring 1 */}
        <div className="animate-geo-1 absolute top-20 left-[10%] h-40 w-40 rounded-full border border-indigo-200/25 bg-gradient-to-b from-indigo-200/10 to-transparent shadow-[0_0_30px_rgba(99,102,241,0.12)] [transform-style:preserve-3d]" />

        {/* Floating Hexagon / Cube 2 */}
        <div className="animate-geo-2 absolute bottom-28 right-[12%] h-56 w-56 rotate-12 rounded-3xl border border-purple-200/25 bg-gradient-to-tr from-purple-200/10 via-transparent to-indigo-300/10 shadow-[0_0_40px_rgba(168,85,247,0.12)] backdrop-blur-[2px]" />

        {/* Diamond Accent */}
        <div className="animate-geo-1 absolute top-1/2 left-[5%] h-24 w-24 rotate-45 rounded-lg border border-indigo-100/25 bg-indigo-200/10 shadow-[0_0_20px_rgba(199,210,254,0.15)]" />
      </div>

      {/* BACKGROUND LAYER 3: Soft Structural Overlay & Grid */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {/* Moving Light Overlay */}
        <div className="animate-scan absolute inset-x-0 h-40 bg-gradient-to-b from-transparent via-indigo-200/10 to-transparent pointer-events-none" />

        {/* Subtle Grid Pattern */}
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

        {/* Edge Vignette adjusted for lighter background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,#1c182e_85%)]" />
      </div>

      {/* FOREGROUND CONTENT CONTAINER */}
      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="animate-float-in text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
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
              Try searching with a different term or certificate name.
            </p>
          </div>
        ) : (
          <ul className="space-y-5">
            {results.map((r) => (
              <li key={r.officerId}>
                <Link
                  href={`/officers/${r.officerId}${
                    term ? `?q=${encodeURIComponent(term)}` : ""
                  }`}
                  className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-indigo-100/30 bg-white/95 p-5 shadow-lg backdrop-blur-lg transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300/80 hover:bg-white hover:shadow-[0_12px_28px_-5px_rgba(79,70,229,0.3)]"
                >
                  {/* Hover Bar on Left */}
                  <div className="pointer-events-none absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-indigo-400 to-indigo-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  {/* Profile Avatar */}
                  <div className="relative z-10 flex shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-200 to-indigo-300 p-[2px] shadow-sm transition-transform duration-300 group-hover:scale-105">
                    {r.profileUrl ? (
                      <img
                        src={r.profileUrl}
                        alt={r.name}
                        className="h-13 w-13 rounded-full border border-white object-cover"
                      />
                    ) : (
                      <div className="flex h-13 w-13 items-center justify-center rounded-full border border-white bg-slate-100 text-lg font-bold text-slate-800">
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 flex flex-col gap-1">
                    {/* Name */}
                    <span className="text-lg font-bold text-slate-900 transition-all duration-300 group-hover:text-indigo-600">
                      {r.name}
                    </span>

                    {r.certs.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {r.certs.map((c, idx) => (
                          <p key={idx} className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-900">
                              {c.certName}
                            </span>
                            {c.roles.length > 0 && (
                              <span className="ml-1 text-slate-500">
                                — {c.roles.join(", ")}
                              </span>
                            )}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-slate-400">
                        No Cert
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
