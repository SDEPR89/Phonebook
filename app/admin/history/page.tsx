import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

type AuditChange = {
  field: string;
  old: string;
  new: string;
};

export const revalidate = 0; // Disable static caching so new updates appear immediately

export default async function AdminHistoryPage() {
  const logs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt));

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
