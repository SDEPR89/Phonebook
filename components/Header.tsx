"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import SearchBar from "./SearchBar";
import { usePathname, useRouter } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [certList, setCertList] = useState<string[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);

  // Hide search bar ONLY on the root home page ("/")
  const isHomePage = pathname === "/";

  // Fetch certificates when drawer is first opened
  useEffect(() => {
    if (isDrawerOpen && certList.length === 0) {
      setLoadingCerts(true);
      fetch("/api/certs")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          const certNames = data
            .map((c: any) => (typeof c === "string" ? c : c.name || c.certName))
            .filter(Boolean);
          setCertList(certNames);
        })
        .catch((err) => console.error("Failed to load certs:", err))
        .finally(() => setLoadingCerts(false));
    }
  }, [isDrawerOpen, certList.length]);

  const handleCertClick = (certName: string) => {
    setIsDrawerOpen(false);
    router.push(`/search?q=${encodeURIComponent(certName)}`);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-white px-6 py-3 shadow-sm w-full">
        {/* Left side: Animated Hamburger Icon + Logo & Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open search menu"
            className="group flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg p-2 transition-colors hover:bg-slate-100 focus:outline-none"
          >
            <span className="h-0.5 w-6 rounded-full bg-slate-700 transition-all duration-300 group-hover:w-7 group-hover:bg-indigo-900" />
            <span className="h-0.5 w-6 rounded-full bg-slate-700 transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-indigo-900" />
            <span className="h-0.5 w-6 rounded-full bg-slate-700 transition-all duration-300 group-hover:w-5 group-hover:bg-indigo-900" />
          </button>

          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/thaicert-logo.png"
              alt="ThaiCERT Logo"
              width={120}
              height={40}
              className="h-auto w-auto object-contain"
              priority
            />
            <span className="text-3xl font-semibold text-gray-900 tracking-tight">
              ThaiCERT Phonebook
            </span>
          </Link>
        </div>

        {/* Right side: Search Bar & User Profile Avatar */}
        <div className="flex items-center gap-4">
          {!isHomePage && <SearchBar />}
          <Link
            href="/setting"
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <Image
              src="/avatar.png"
              alt="User Avatar"
              fill
              className="object-cover"
            />
          </Link>
        </div>
      </header>

      {/* Backdrop Dark Overlay */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* Left Drawer Side Column */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                Search by Cert
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a CERT team to view officers
              </p>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close menu"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Cert List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingCerts ? (
              <div className="space-y-2 p-1">
                <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
                <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
                <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
                <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
              </div>
            ) : certList.length > 0 ? (
              <ul className="space-y-1.5">
                {certList.map((cert) => (
                  <li key={cert}>
                    <button
                      onClick={() => handleCertClick(cert)}
                      className="group flex w-full items-center justify-between rounded-xl px-4 py-3 text-left font-medium text-slate-700 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-900 hover:pl-5 active:scale-[0.98]"
                    >
                      <span className="truncate">{cert}</span>
                      <svg
                        className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-indigo-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-center text-sm text-slate-400">
                No certs found.
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}