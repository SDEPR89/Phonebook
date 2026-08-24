"use client";

import { useState, useEffect, useRef, Suspense } from "react";
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
  const [avatarUrl, setAvatarUrl] = useState<string>("/unlogin-avatar.svg");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Fetch current user's profile picture & auth status
  useEffect(() => {
    fetch("/api/user/profile", { cache: "no-store" })
      .then((res) => {
        if (res.ok) {
          setIsLoggedIn(true);
          return res.json();
        } else {
          setIsLoggedIn(false);
          return null;
        }
      })
      .then((data) => {
        if (data) {
          setAvatarUrl(data.avatarUrl || "/unlogin-avatar.svg");
        } else {
          setAvatarUrl("/unlogin-avatar.svg");
        }
      })
      .catch((err) => {
        console.error("Failed to load user avatar:", err);
        setIsLoggedIn(false);
        setAvatarUrl("/unlogin-avatar.svg");
      });
  }, [pathname]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsLoggedIn(false);
    setAvatarUrl("/unlogin-avatar.svg");
    router.push("/login");
  };

  // Hide search bar on the home page and login page
  const isHomePage = pathname === "/";
  const isLoginPage = pathname === "/login";

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
              CERT Community Phonebook
            </span>
          </Link>
        </div>

        {/* Right side: Search Bar & User Profile Avatar */}
        <div className="flex items-center gap-4">
          {(!isHomePage && !isLoginPage) && (
            <Suspense fallback={null}>
              <SearchBar />
            </Suspense>
          )}
          {/* Avatar dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen((v) => !v)}
              className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <Image
                src={avatarUrl}
                alt="User Avatar"
                fill
                unoptimized
                className="object-cover"
              />
            </button>

            {/* Dropdown menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg z-50">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/setting"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-indigo-600 font-medium hover:bg-indigo-50"
                  >
                    <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In
                  </Link>
                )}
              </div>
            )}
          </div>
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