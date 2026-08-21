"use client";

import { useState, useEffect } from "react";
import SearchBar from "@/components/SearchBar";

export default function HomePage() {
  const [isNearCenter, setIsNearCenter] = useState(false);

  useEffect(() => {
    // Radius threshold in pixels from screen center
    const THRESHOLD = 220;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      setIsNearCenter(dist <= THRESHOLD);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#1c182e] px-4 overflow-hidden select-none text-slate-100">
      {/* Shared Keyframes & Animations */}
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
            backgroundSize: '36px 36px'
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,#1c182e_85%)]" />
      </div>

      {/* 4. Concentric Breathing Rings */}
      <div
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center transition-transform duration-700 ease-out opacity-60"
        style={{
          transform: isNearCenter ? "scale(0.62)" : "scale(1)",
        }}
      >
        <div className="animate-idle-rings flex items-center justify-center">
          <div
            className="h-[1500px] w-[1500px] shrink-0 rounded-full"
            style={{
              background: `radial-gradient(
                circle at center,
                rgba(224, 231, 255, 0.8) 0px,
                rgba(199, 210, 254, 0.7) 90px,
                rgba(165, 180, 252, 0.6) 90px,
                rgba(129, 140, 248, 0.5) 180px,
                rgba(99, 102, 241, 0.4) 180px,
                rgba(79, 70, 229, 0.35) 280px,
                rgba(67, 56, 202, 0.3) 280px,
                rgba(55, 48, 163, 0.25) 400px,
                rgba(49, 46, 129, 0.2) 400px,
                rgba(40, 34, 64, 0.15) 540px,
                rgba(28, 24, 46, 0.1) 700px,
                transparent 540px
              )`,
            }}
          />
        </div>
      </div>

      {/* 5. Central Airbrush Spotlight Overlay */}
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ease-out ${
          isNearCenter
            ? "h-[280px] w-[280px] opacity-95 blur-md"
            : "h-[220px] w-[220px] opacity-60 blur-2xl"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(199, 210, 254, 0.5) 0%, rgba(129, 140, 248, 0.3) 45%, rgba(79, 70, 229, 0.1) 70%, transparent 90%)",
          mixBlendMode: "screen",
        }}
      />

      {/* 6. Foreground Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-6">
        <h1
          className={`text-3xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-4xl transition-transform duration-500 ease-out origin-center ${
            isNearCenter ? "scale-110" : "scale-100"
          }`}
        >
          Officer Phonebook
        </h1>

        <SearchBar />
      </div>
    </main>
  );
}