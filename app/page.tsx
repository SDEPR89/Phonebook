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
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#0d0818] px-4 overflow-hidden select-none">
      {/* CSS Keyframes for infinite idle breathing */}
      <style>{`
        @keyframes idleBreathing {
          0% {
            transform: scale(0.9);
          }
          50% {
            transform: scale(1.25);
          }
          100% {
            transform: scale(0.9);
          }
        }
        .animate-idle-rings {
          animation: idleBreathing 8s ease-in-out infinite;
        }
      `}</style>

      {/* 1. Squeeze Parent Wrapper (Smooth transition from current breathing state) */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center transition-transform duration-700 ease-out"
        style={{
          transform: isNearCenter ? "scale(0.62)" : "scale(1)",
        }}
      >
        {/* Child Breathing Animation Wrapper */}
        <div className="animate-idle-rings flex items-center justify-center">
          <div
            className="h-[1500px] w-[1500px] shrink-0 rounded-full opacity-85"
            style={{
              background: `radial-gradient(
                circle at center,
                #dabafc 0px,
                #bb95e1 45px,
                #b17fe4 45px,
                #a169d4 90px,
                #9b57d3 90px,
                #9150cd 140px,
                #8e42c1 140px,
                #8a47c4 200px,
                #7d38b2 200px,
                #7130a7 270px,
                #5f1f90 270px,
                #5d2688 350px,
                #54257b 350px,
                #47217f 440px,
                #3d1378 440px,
                #3b0764 540px,
                #2e0c52 540px,
                #2e1065 650px,
                #200742 650px,
                #1e1b4b 770px,
                #130f33 770px,
                transparent 900px
              )`,
            }}
          />
        </div>
      </div>

      {/* 2. Airbrush Spotlight Overlay */}
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ease-out ${
          isNearCenter
            ? "h-[260px] w-[260px] opacity-90 blur-md"
            : "h-[220px] w-[220px] opacity-55 blur-2xl"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(216, 180, 254, 0.5) 0%, rgba(168, 85, 247, 0.25) 45%, rgba(109, 40, 217, 0.1) 70%, transparent 90%)",
          mixBlendMode: "screen",
        }}
      />

      {/* 3. Foreground Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-6">
        <h1
          className={`text-3xl font-bold tracking-tight text-white drop-shadow-xl sm:text-4xl transition-transform duration-500 ease-out origin-center ${
            isNearCenter ? "scale-125" : "scale-100"
          }`}
        >
          Officer Phonebook
        </h1>

        <SearchBar />
      </div>
    </main>
  );
}