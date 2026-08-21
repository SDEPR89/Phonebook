"use client";

import { useEffect, useState } from "react";

export default function RingsBackground() {
  const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Function to calculate exact center of any hovered block
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const card = target?.closest<HTMLElement>("[data-ring-target]");

      if (card) {
        const rect = card.getBoundingClientRect();
        setTargetPos({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      } else {
        setTargetPos(null);
      }
    };

    window.addEventListener("mouseover", handleMouseOver);
    return () => window.removeEventListener("mouseover", handleMouseOver);
  }, []);

  const isFocused = targetPos !== null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
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

      {/* 1. Concentric Circles Container */}
      <div
        className="absolute transition-all duration-700 ease-out"
        style={{
          left: isFocused ? `${targetPos.x}px` : "50%",
          top: isFocused ? `${targetPos.y}px` : "50%",
          transform: `translate(-50%, -50%) ${
            isFocused ? "scale(0.55)" : "scale(1)"
          }`,
        }}
      >
        {/* Continuous breathing animation wrapper */}
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

      {/* 2. Spotlight Overlay behind target */}
      <div
        className={`absolute rounded-full transition-all duration-500 ease-out ${
          isFocused
            ? "h-[280px] w-[280px] opacity-90 blur-md"
            : "h-[220px] w-[220px] opacity-40 blur-2xl"
        }`}
        style={{
          left: isFocused ? `${targetPos.x}px` : "50%",
          top: isFocused ? `${targetPos.y}px` : "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(216, 180, 254, 0.5) 0%, rgba(168, 85, 247, 0.25) 45%, rgba(109, 40, 217, 0.1) 70%, transparent 90%)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}