"use client";

import { useState } from "react";
import SearchBar from "@/components/SearchBar"; // Adjust path to match where your SearchBar component is located

export default function HomePage() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 overflow-hidden">
      {/* Default Animated Background Layer (Smooth Glow - Breathing effect) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-700 ease-in-out"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.7) 0%, rgba(139, 92, 246, 0.5) 20%, rgba(109, 40, 217, 0.3) 40%, rgba(76, 29, 149, 0.15) 60%, rgba(10, 10, 20, 0) 80%)",
          filter: "blur(40px)",
          mixBlendMode: "screen",
          animation: "pulseGlow 5s ease-in-out infinite alternate",
          opacity: isHovered ? 0 : 1
        }}
      />

      {/* Hovered Background Layer (Smooth Glow - Spotlight effect) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-700 ease-in-out"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(192, 132, 252, 0.85) 0%, rgba(168, 85, 247, 0.65) 15%, rgba(139, 92, 246, 0.45) 30%, rgba(109, 40, 217, 0.25) 50%, rgba(10, 10, 20, 0) 70%)",
          filter: "blur(40px)",
          mixBlendMode: "screen",
          opacity: isHovered ? 1 : 0
        }}
      />

      {/* Scoped CSS for Keyframes */}
      <style>{`
        @keyframes pulseGlow {
          0% {
            transform: scale(0.95);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.15);
            opacity: 1;
          }
        }
      `}</style>

      {/* Foreground Content */}
      <div
        className="relative z-10 flex flex-col items-center justify-center gap-6"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <h1
          className={`text-3xl font-bold tracking-tight text-slate-100 transition-transform duration-300 ease-in-out ${isHovered ? "scale-110" : "scale-100"
            }`}
        >
          Officer Phonebook
        </h1>

        <SearchBar />
      </div>
    </main>
  );
}