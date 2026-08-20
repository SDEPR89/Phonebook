"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NotFound() {
  const pathname = usePathname();
  // Check if the current route is within the admin dashboard section
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
      <h1 className="text-3xl font-bold">Not Found</h1>
      <p className="mt-2 text-sm text-slate-400">
        The officer you&apos;re looking for doesn&apos;t exist.
      </p>

      <Link
        href={isAdminRoute ? "/admin" : "/"}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
      >
        {isAdminRoute ? "Back to Admin Page" : "Back to Search"}
      </Link>
    </div>
  );
}
