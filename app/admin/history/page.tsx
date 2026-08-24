import { db } from "@/db";
import { auditLogs, officers } from "@/db/schema";
import { desc, eq, and, sql, inArray } from "drizzle-orm";
import Link from "next/link";
import { getSession } from "@/app/lib/auth";
import { redirect } from "next/navigation";

type AuditChange = {
  field: string;
  old: string;
  new: string;
};

export const revalidate = 0; // Disable static caching so new updates appear immediately

export default async function AdminHistoryPage({
  searchParams,
}: {
  searchParams?: any;
}) {
  const session = await getSession();

  // Officers cannot access this page
  if (!session || session.role === "officer") {
    redirect("/");
  }

  const viewerRole = session.role; // "admin" | "superadmin"

  // Roles visible to each viewer
  const visibleRoles =
    viewerRole === "superadmin"
      ? ["officer", "admin", "superadmin"]
      : ["officer", "admin"]; // admin cannot see superadmin activity

  const params = await searchParams;
  const filter = params?.filter as string | undefined;
  // Sanitise role param: admin cannot request superadmin even via URL
  const rawRole = params?.role as string | undefined;
  const role =
    rawRole && visibleRoles.includes(rawRole) ? rawRole : undefined;

  const logs = await db
    .select({
      id: auditLogs.id,
      officerId: auditLogs.officerId,
      officerName: auditLogs.officerName,
      action: auditLogs.action,
      changes: auditLogs.changes,
      createdAt: auditLogs.createdAt,
      actorRole: officers.systemRole,
    })
    .from(auditLogs)
    .leftJoin(officers, sql`${auditLogs.officerId}::uuid = ${officers.id}`)
    .where(
      and(
        filter && ["CREATED", "UPDATED", "DELETED"].includes(filter)
          ? eq(auditLogs.action, filter)
          : undefined,
        // Always enforce visible roles restriction
        role
          ? eq(officers.systemRole, role)
          : inArray(officers.systemRole, visibleRoles)
      )
    )
    .orderBy(desc(auditLogs.createdAt));

  const buildUrl = (newFilter?: string | null, newRole?: string | null) => {
    const query = new URLSearchParams();
    const f = newFilter !== undefined ? newFilter : filter;
    const r = newRole !== undefined ? newRole : role;
    if (f) query.set("filter", f);
    if (r) query.set("role", r);
    const str = query.toString();
    return `/admin/history${str ? `?${str}` : ""}`;
  };

  return (
    <main className="relative min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl">
        {/* Navigation & Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              ← Back to Admin
            </Link>
            <h1 className="text-2xl font-bold">Activity History</h1>
          </div>

          <span className="rounded-full border border-blue-800/60 bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-400">
            {logs.length} Logged Events
          </span>
        </div>

        {/* Filter Controls */}
        <div className="mb-6 space-y-3">
          {/* Action Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">Action:</span>
            <Link
              href={buildUrl(null, role)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                !filter
                  ? "bg-slate-700 text-white border-slate-600"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-300"
              }`}
            >
              All Actions
            </Link>
            <Link
              href={buildUrl("CREATED", role)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                filter === "CREATED"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20"
              }`}
            >
              CREATED
            </Link>
            <Link
              href={buildUrl("UPDATED", role)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                filter === "UPDATED"
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20"
              }`}
            >
              UPDATED
            </Link>
            <Link
              href={buildUrl("DELETED", role)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                filter === "DELETED"
                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
              }`}
            >
              DELETED
            </Link>
          </div>

          {/* Performed By Role Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">Occurred By:</span>
            <Link
              href={buildUrl(filter, null)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                !role
                  ? "bg-slate-700 text-white border-slate-600"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-300"
              }`}
            >
              All Roles
            </Link>
            <Link
              href={buildUrl(filter, "officer")}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                role === "officer"
                  ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/20"
              }`}
            >
              Officer
            </Link>
            <Link
              href={buildUrl(filter, "admin")}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                role === "admin"
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/20"
              }`}
            >
              Admin
            </Link>
            {/* Superadmin filter only visible to superadmin */}
            {viewerRole === "superadmin" && (
              <Link
                href={buildUrl(filter, "superadmin")}
                className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                  role === "superadmin"
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20"
                }`}
              >
                Superadmin
              </Link>
            )}
          </div>
        </div>

        {/* Logs Feed */}
        {logs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0D121F] p-8 text-center text-sm text-slate-400">
            No history logs found in the database.
          </div>
        ) : (
          <div className="space-y-3 pb-20">
            {logs.map((log) => {
              // Safely handle jsonb object vs string parsing
              let changes: AuditChange[] = [];

              if (Array.isArray(log.changes)) {
                changes = log.changes as AuditChange[];
              } else if (typeof log.changes === "string") {
                try {
                  changes = JSON.parse(log.changes);
                } catch {
                  changes = [];
                }
              }

              return (
                <div
                  key={log.id}
                  className="rounded-2xl border border-slate-800/80 bg-[#0D121F] p-4 transition"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                          log.action === "CREATED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : log.action === "UPDATED"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="font-semibold text-slate-200 text-sm">
                        {log.officerName}
                      </span>
                      {log.actorRole && (
                        <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 capitalize">
                          {log.actorRole}
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-400">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Just now"}
                    </span>
                  </div>

                  {/* Show Detailed Changes for UPDATED */}
                  {log.action === "UPDATED" && changes.length > 0 && (
                    <div className="space-y-1.5 pl-1">
                      {changes.map((change, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-slate-300 flex items-center gap-2"
                        >
                          <span className="font-medium text-slate-400">
                            {change.field}:
                          </span>
                          <span className="line-through text-red-400/80">
                            {change.old || "None"}
                          </span>
                          <span className="text-slate-500">→</span>
                          <span className="text-emerald-400 font-medium">
                            {change.new}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show Details for CREATED */}
                  {log.action === "CREATED" && (
                    <div className="pl-1 text-xs text-emerald-400/90 font-medium">
                      + Added new officer profile to the database.
                      {changes.length > 0 && (
                        <div className="mt-1 space-y-1 text-slate-300 font-normal">
                          {changes.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5"
                            >
                              <span className="text-slate-400">
                                {item.field}:
                              </span>
                              <span>{item.new}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show Details for DELETED */}
                  {log.action === "DELETED" && (
                    <div className="pl-1 text-xs text-red-400/90 font-medium">
                      ✕ Officer record was removed from the system.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}