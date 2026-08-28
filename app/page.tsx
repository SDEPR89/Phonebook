"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";

interface CertItem {
  id?: string | number;
  shortName?: string;
  fullName?: string;
  name?: string;
  certName?: string;
}

export default function HomePage() {
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [isNearCenter, setIsNearCenter] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [certs, setCerts] = useState<string[]>([]);
  const [isLoadingCerts, setIsLoadingCerts] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

// Fetch user profile and authentication status
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
          // DEBUG: Open browser console (F12) to see what your API actually returns
          console.log("Profile Data Payload:", data);

          const extractedRole =
            data.role ||
            data.user?.role ||
            data.roles?.[0] ||
            data.user?.roles?.[0] || // Added check for nested user roles array
            null;

          setUserRole(extractedRole);
        } else {
          setUserRole(null);
        }
      })
      .catch((err) => {
        console.error("Failed to check auth status:", err);
        setIsLoggedIn(false);
        setUserRole(null);
      })
      .finally(() => {
        setIsLoadingAuth(false);
      });
  }, []);

  // Fetch CERT list for logo cards
  useEffect(() => {
    setIsLoadingCerts(true);
    fetch("/api/certs")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: (string | CertItem)[]) => {
        const certNames = data
          .map((c) =>
            typeof c === "string"
              ? c
              : c.shortName || c.fullName || c.name || c.certName
          )
          .filter((name): name is string => Boolean(name));

        setCerts(certNames);
      })
      .catch((err) => console.error("Failed to load certs:", err))
      .finally(() => setIsLoadingCerts(false));
  }, []);

  // Mouse distance detection for ring scaling effect
  useEffect(() => {
    const THRESHOLD = 220;

    const handleMouseMove = (e: MouseEvent) => {
      let centerX = window.innerWidth / 2;
      let centerY = window.innerHeight / 2;

      if (searchContainerRef.current) {
        const rect = searchContainerRef.current.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
      }

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      setIsNearCenter(dist <= THRESHOLD);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleCertClick = (certName: string) => {
    router.push(`/search?q=${encodeURIComponent(certName)}`);
  };

  const handleImageError = (certName: string) => {
    setFailedImages((prev) => ({ ...prev, [certName]: true }));
  };

  const isLoggedOut = !isLoadingAuth && !isLoggedIn;

  // Validate admin status
  const normalizedRole = userRole
    ? String(userRole).toLowerCase().replace(/[\s_-]+/g, "")
    : "";

  const isAdmin =
    normalizedRole === "admin" ||
    normalizedRole === "superadmin";

  return (
    <main
      className={`relative flex min-h-screen flex-col items-center bg-[#1c182e] px-4 pb-16 overflow-x-hidden select-none text-slate-100 transition-all duration-500 ${
        isLoggedOut ? "justify-center pt-0" : "justify-start pt-28"
      }`}
    >
      {/* Keyframes & Animations */}
      <style>{`
        @keyframes idleBreathing {
          0% { transform: scale(0.9); }
          50% { transform: scale(1.25); }
          100% { transform: scale(0.9); }
        }
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

        .animate-idle-rings { animation: idleBreathing 8s ease-in-out infinite; }
        .animate-aurora-1 { animation: auroraWave 30s linear infinite; }
        .animate-aurora-2 { animation: auroraWave 40s linear infinite reverse; }
        .animate-geo-1 { animation: floatGeo1 12s ease-in-out infinite; }
        .animate-geo-2 { animation: floatGeo2 15s ease-in-out infinite; }
      `}</style>

      {/* 1. Aurora Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-75">
        <div className="animate-aurora-1 absolute -left-1/4 -top-1/4 h-[45rem] w-[45rem] rounded-[40%] bg-gradient-to-tr from-indigo-500/40 via-purple-500/35 to-slate-300/20 blur-[130px]" />
        <div className="animate-aurora-2 absolute -bottom-1/4 -right-1/4 h-[50rem] w-[50rem] rounded-[45%] bg-gradient-to-br from-violet-500/35 via-indigo-600/40 to-blue-400/25 blur-[140px]" />
      </div>

      {/* 2. Floating Glass Geometric Accents */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="animate-geo-1 absolute top-20 left-[10%] h-40 w-40 rounded-full border border-indigo-200/25 bg-gradient-to-b from-indigo-200/10 to-transparent shadow-[0_0_30px_rgba(99,102,241,0.12)]" />
        <div className="animate-geo-2 absolute bottom-28 right-[12%] h-56 w-56 rotate-12 rounded-3xl border border-purple-200/25 bg-gradient-to-tr from-purple-200/10 via-transparent to-indigo-300/10 shadow-[0_0_40px_rgba(168,85,247,0.12)] backdrop-blur-[2px]" />
        <div className="animate-geo-1 absolute top-1/2 left-[5%] h-24 w-24 rotate-45 rounded-lg border border-indigo-100/25 bg-indigo-200/10 shadow-[0_0_20px_rgba(199,210,254,0.15)]" />
      </div>

      {/* 3. Subtle Grid Pattern & Vignette */}
      <div className="pointer-events-none absolute inset-0 z-0">
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

      {/* 4. Concentric Breathing Rings */}
      <div
        className={`pointer-events-none absolute left-1/2 z-0 flex items-center justify-center transition-all duration-700 ease-out opacity-65 ${
          isLoggedOut ? "top-1/2" : "top-[215px]"
        }`}
        style={{
          transform: `translate(-50%, -50%) ${isNearCenter ? "scale(0.62)" : "scale(1)"}`,
        }}
      >
        <div className="animate-idle-rings flex items-center justify-center">
          <div
            className="h-[1200px] w-[1200px] shrink-0 rounded-full"
            style={{
              background: `radial-gradient(
                circle at center,
                rgba(255, 255, 255, 0.85) 0px,
                rgba(224, 231, 255, 0.75) 90px,
                rgba(199, 210, 254, 0.65) 90px,
                rgba(165, 180, 252, 0.55) 180px,
                rgba(129, 140, 248, 0.45) 180px,
                rgba(99, 102, 241, 0.35) 280px,
                rgba(79, 70, 229, 0.28) 280px,
                rgba(67, 56, 202, 0.2) 400px,
                rgba(49, 46, 129, 0.15) 400px,
                rgba(40, 34, 64, 0.1) 540px,
                rgba(28, 24, 46, 0.05) 700px,
                transparent 540px
              )`,
            }}
          />
        </div>
      </div>

      {/* 5. Central Airbrush Spotlight Overlay */}
      <div
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ease-out ${
          isLoggedOut ? "top-1/2" : "top-[215px]"
        } ${
          isNearCenter
            ? "h-[280px] w-[280px] opacity-95 blur-md"
            : "h-[220px] w-[220px] opacity-60 blur-2xl"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(199, 210, 254, 0.4) 45%, rgba(129, 140, 248, 0.15) 70%, transparent 90%)",
          mixBlendMode: "screen",
        }}
      />

      {/* 6. Foreground Content */}
      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-10 text-center">
        {/* Header Block */}
        <div className="flex flex-col items-center gap-6" ref={searchContainerRef}>
          <h1
            className={`text-3xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-5xl transition-transform duration-500 ease-out origin-center ${
              isNearCenter ? "scale-105" : "scale-100"
            }`}
          >
            CERT Community Phonebook
          </h1>

          {/* Conditional Search Bar / Loading State */}
          {isLoadingAuth ? (
            <div className="h-12 w-80 max-w-md animate-pulse rounded-full bg-white/20 backdrop-blur-md" />
          ) : isLoggedIn ? (
            <div className="w-full max-w-md flex justify-center">
              <SearchBar />
            </div>
          ) : (
            <p className="max-w-md rounded-2xl border border-white/40 bg-white/90 px-6 py-3 text-sm font-medium text-slate-800 backdrop-blur-md shadow-lg">
              Please sign in to search the community phonebook.
            </p>
          )}
        </div>

        {/* CERT Logos Grid Block */}
        {!isLoadingAuth && isLoggedIn && (
          <div className="w-full mt-4">
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-indigo-100/90">
              Select a CERT Team
            </h2>

            {isLoadingCerts ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-28 rounded-2xl bg-white/80 border border-white/50 animate-pulse"
                  />
                ))}
              </div>
            ) : certs.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {certs.map((cert) => (
                  <button
                    key={cert}
                    onClick={() => handleCertClick(cert)}
                    className="group relative flex flex-col items-center justify-center p-4 rounded-2xl border border-white/60 bg-white/90 backdrop-blur-md shadow-md transition-all duration-300 hover:scale-105 hover:bg-white hover:border-white hover:shadow-xl hover:shadow-indigo-500/10 min-h-[110px]"
                  >
                    <div className="relative h-12 w-full flex items-center justify-center mb-2">
                      {!failedImages[cert] ? (
                        <Image
                          src={`/cert/${cert.endsWith(".png") ? cert : `${cert}.png`}`}
                          alt={cert}
                          width={100}
                          height={48}
                          onError={() => handleImageError(cert)}
                          className="max-h-full max-w-full object-contain filter drop-shadow transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900 font-bold text-sm">
                          {cert.substring(0, 3)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-950 transition-colors truncate w-full">
                      {cert}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-indigo-200/60">No CERTs found.</p>
            )}
          </div>
        )}

        {/* 7. Non-sticky Admin Page Button */}
        {!isLoadingAuth && isAdmin && (
          <div className="mt-6 flex w-full justify-end">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-full border border-indigo-900/60 bg-slate-900/90 px-6 py-3 text-sm font-semibold text-indigo-100 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-indigo-950 hover:text-white hover:border-indigo-700/80 active:scale-95"
            >
              <svg
                className="h-5 w-5 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Admin Page</span>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}