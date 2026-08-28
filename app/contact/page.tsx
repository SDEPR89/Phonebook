"use client";

import Link from "next/link";

export default function ContactPage() {
  const team = [
    {
      name: "Nithiphat Wessatada",
      description: "National Institute of Technology, Tomakomai College",
      link: "#",
    },
    {
      name: "Tharathep Chutimapunya",
      description: "National Institute of Technology, Tsuruoka College",
      link: "#",
    },
    {
      name: "Chacriya Sotthiwanichwong",
      description: "National Institute of Technology, Kagoshima College",
      link: "#",
    },
  ];

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#1c182e] px-4 py-20 text-slate-100 overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-60">
        <div className="absolute -left-1/4 -top-1/4 h-[40rem] w-[40rem] rounded-full bg-gradient-to-tr from-indigo-600/30 via-purple-600/30 to-slate-300/10 blur-[140px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[45rem] w-[45rem] rounded-full bg-gradient-to-br from-violet-600/30 via-indigo-700/30 to-blue-500/10 blur-[150px]" />
      </div>

      {/* Hero Header */}
      <div className="relative z-10 mb-12 text-center max-w-2xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl drop-shadow-md">
          ช่องทางติดต่อ
        </h1>
        <p className="mt-4 text-base text-indigo-200/80 sm:text-lg">
          ติดต่อ CERT Community team
        </p>
      </div>

      {/* Main Content Grid: Information Cards */}
      <div className="relative z-10 grid w-full max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Email Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md transition-all duration-300 hover:border-indigo-400/50 hover:bg-white/15 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">ที่อยู่อีเมล</h3>
              <p className="text-xs text-indigo-200/70">General Inquiry</p>
            </div>
          </div>
          <div className="mt-6">
            <a href="mailto:support@certcommunity.org" className="text-sm font-medium text-indigo-300 hover:text-white transition-colors">
              support@certcommunity.org 
            </a> 
          </div>
        </div>

        {/* Location Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md transition-all duration-300 hover:border-indigo-400/50 hover:bg-white/15 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">ที่ตั้ง</h3>
              <p className="text-xs text-indigo-200/70">Headquarters</p>
            </div>
          </div>
          <div className="mt-6 text-sm text-indigo-300">
            100 Emergency Way, Suite 400<br />San Francisco, CA 94103
          </div>
        </div>

        {/* Operating Hours Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md transition-all duration-300 hover:border-indigo-400/50 hover:bg-white/15 shadow-xl sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">เวลาทำการ</h3>
              <p className="text-xs text-indigo-200/70">PST Timezone</p>
            </div>
          </div>
          <div className="mt-6 text-sm text-indigo-300">
            Mon – Fri: 8:30 AM – 4:30 PM<br />
            <span className="text-xs text-indigo-200/60">Emergency support active 24/7</span>
          </div>
        </div>
      </div>

      {/* Lowkey Credits Section */}
      <footer className="relative z-10 mt-16 w-full max-w-4xl border-t border-white/10 pt-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300/50">
          พัฒนาโดย
        </p>

        {/* 3-Person Team Grid */}
        <div className="mt-6 grid gap-6 text-left sm:grid-cols-3">
          {team.map((member, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-center rounded-xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06]"
            >
              <a
                href={member.link}
                className="text-sm font-semibold text-indigo-100 hover:text-white transition-colors"
              >
                {member.name}
              </a>
              <p className="mt-1 text-xs leading-relaxed text-indigo-200/60">
                {member.description}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[11px] text-indigo-300/30">
          CERT Community Phonebook © {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}