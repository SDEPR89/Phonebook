"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate authentication process
    console.log("Logging in with:", { email, password });

    setTimeout(() => {
      setLoading(false);
      alert("Login request submitted!");
    }, 1000);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#1c182e] px-4 overflow-hidden select-none text-slate-100">
      {/* Shared Keyframes & Animations matching HomePage */}
      <style>{`
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

      {/* 4. Central Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-indigo-200/20 bg-slate-900/40 p-8 shadow-[0_0_50px_rgba(79,70,229,0.15)] backdrop-blur-xl">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <Image
            src="/thaicert-white.png"
            alt="ThaiCERT Logo"
            width={100}
            height={32}
            className="h-auto w-auto object-contain drop-shadow"
            priority
          />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white drop-shadow-md">
            Officer Phonebook
          </h1>
          <p className="mt-1 text-xs text-indigo-200/70">
            Enter your credentials to access the directory
          </p>
        </div>

        {/* Form */}
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-indigo-100/80"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-indigo-300/20 bg-indigo-950/30 px-4 py-2.5 text-sm text-white placeholder-indigo-200/30 backdrop-blur-sm transition-all focus:border-indigo-400 focus:bg-indigo-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="officer@thaicert.or.th"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-indigo-100/80"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-indigo-300 transition-colors hover:text-indigo-200"
                >
                  Forgot?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-indigo-300/20 bg-indigo-950/30 px-4 py-2.5 text-sm text-white placeholder-indigo-200/30 backdrop-blur-sm transition-all focus:border-indigo-400 focus:bg-indigo-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded border-indigo-300/30 bg-indigo-950/40 text-indigo-600 focus:ring-indigo-500/40"
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-xs text-indigo-200/70"
            >
              Remember me on this device
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-400 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-indigo-200/50">
          Authorized personnel only. Need help?{" "}
          <Link
            href="/contact"
            className="font-medium text-indigo-300 underline underline-offset-2 hover:text-indigo-200"
          >
            Contact Admin
          </Link>
        </p>
      </div>
    </main>
  );
}