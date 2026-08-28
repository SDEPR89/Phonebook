"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import SearchBar from "./SearchBar";
import { usePathname, useRouter } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [certList, setCertList] = useState<string[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [isCertDropdownOpen, setIsCertDropdownOpen] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string>("/unlogin-avatar.svg");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const certDropdownRef = useRef<HTMLDivElement>(null);

  // Hide search bar & CERT dropdown ONLY on the login page
  const isLoginPage = pathname === "/login";
  const isHomePage = pathname === "/";

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
      if (certDropdownRef.current && !certDropdownRef.current.contains(target)) {
        setIsCertDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch cert list on initial render if logged in and not on login page
  useEffect(() => {
    if (!isLoginPage && isLoggedIn && certList.length === 0) {
      setLoadingCerts(true);
      fetch("/api/certs")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          const certNames = data
            .map((c: any) => (typeof c === "string" ? c : c.shortName || c.name || c.certName))
            .filter(Boolean);
          setCertList(certNames);
        })
        .catch((err) => console.error("Failed to load certs:", err))
        .finally(() => setLoadingCerts(false));
    }
  }, [isLoginPage, isLoggedIn, certList.length]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsLoggedIn(false);
    setAvatarUrl("/unlogin-avatar.svg");
    router.push("/login");
  };

  const handleCertClick = (certName: string) => {
    setIsCertDropdownOpen(false);
    router.push(`/search?q=${encodeURIComponent(certName)}`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-white px-6 py-3 shadow-sm w-full">
      {/* Left side: Logo & Title */}
      <div className="flex items-center gap-4">
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

      {/* Right side: CERT Filter Dropdown + Search Bar + User Profile Avatar */}
      <div className="flex items-center gap-4">
        {!isLoginPage && (
          <div className="flex items-center gap-2">
            {/* CERT Category Dropdown - Only renders when logged in */}
            {isLoggedIn && (
              <div className="relative" ref={certDropdownRef}>
                <button
                  onClick={() => setIsCertDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <span>CERT</span>
                  <svg
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                      isCertDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* CERT Dropdown Menu */}
                {isCertDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl z-50">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        เลือก CERT
                      </p>
                    </div>
                    {loadingCerts ? (
                      <div className="space-y-2 p-2">
                        <div className="h-8 rounded-lg bg-slate-100 animate-pulse" />
                        <div className="h-8 rounded-lg bg-slate-100 animate-pulse" />
                        <div className="h-8 rounded-lg bg-slate-100 animate-pulse" />
                      </div>
                    ) : certList.length > 0 ? (
                      <ul className="py-1">
                        {certList.map((cert) => (
                          <li key={cert}>
                            <button
                              onClick={() => handleCertClick(cert)}
                              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-900"
                            >
                              <span className="truncate">{cert}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="p-4 text-center text-xs text-slate-400">
                        ไม่พบข้อมูล CERT
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Search Bar */}
            {!isHomePage && (
              <Suspense fallback={null}>
                <SearchBar />
              </Suspense>
            )}
          </div>
        )}

        {/* Avatar Dropdown */}
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

          {/* Profile Dropdown Menu */}
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
                    ตั้งค่าบัญชี
                  </Link>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    ออกจากระบบ
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
                  เข้าสู่ระบบ
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}