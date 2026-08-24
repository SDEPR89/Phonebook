"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);

function IosWheelColumn({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);

  const selectedIndex = Math.max(0, options.indexOf(value));

  useEffect(() => {
    if (containerRef.current && !isUserScrolling.current) {
      containerRef.current.scrollTop = selectedIndex * 32;
    }
  }, [selectedIndex]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    isUserScrolling.current = true;
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / 32);
    if (options[index] && options[index] !== value) {
      onChange(options[index]);
    }
    setTimeout(() => {
      isUserScrolling.current = false;
    }, 150);
  };

  return (
    <div className="relative h-24 w-12 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {/* Center Highlight Bar (iOS Style) */}
      <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-8 -translate-y-1/2 border-y border-blue-500/40 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.15)]" />

      {/* Wheel Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto py-[32px] text-center font-mono select-none scrollbar-none snap-y snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {options.map((opt) => {
          const isSelected = opt === value;
          return (
            <div
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex h-8 snap-center cursor-pointer items-center justify-center text-xs transition-all duration-150 ${
                isSelected
                  ? "text-sm font-bold text-blue-400 scale-110"
                  : "text-slate-500 opacity-40 hover:opacity-80"
              }`}
            >
              {opt}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HistoryDatePopover() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentFrom = searchParams.get("from") || "";
  const currentTo = searchParams.get("to") || "";

  const parseDateTime = (param: string) => {
    if (!param) return { date: "", time: "" };
    if (param.includes("T")) {
      const [d, t] = param.split("T");
      return { date: d, time: t.slice(0, 5) };
    }
    return { date: param, time: "" };
  };

  const initialFrom = parseDateTime(currentFrom);
  const initialTo = parseDateTime(currentTo);

  const [isOpen, setIsOpen] = useState(false);
  const [from, setFrom] = useState(initialFrom.date);
  const [fromTime, setFromTime] = useState(initialFrom.time || "00:00");

  const [to, setTo] = useState(initialTo.date);
  const [toTime, setToTime] = useState(initialTo.time || "23:59");

  // Active target for calendar selection: "from" or "to"
  const [activeTarget, setActiveTarget] = useState<"from" | "to">("from");

  // Calendar month view date
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (initialFrom.date) {
      const d = new Date(initialFrom.date);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const f = parseDateTime(searchParams.get("from") || "");
    const t = parseDateTime(searchParams.get("to") || "");

    setFrom(f.date);
    setFromTime(f.time || "00:00");
    setTo(t.date);
    setToTime(t.time || "23:59");
  }, [searchParams]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const applyDates = (
    newFromDate: string,
    newFromTime: string,
    newToDate: string,
    newToTime: string,
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newFromDate) {
      const fullFrom = newFromTime
        ? `${newFromDate}T${newFromTime}`
        : `${newFromDate}T00:00`;
      params.set("from", fullFrom);
    } else {
      params.delete("from");
    }

    if (newToDate) {
      const fullTo = newToTime
        ? `${newToDate}T${newToTime}`
        : `${newToDate}T23:59`;
      params.set("to", fullTo);
    } else {
      params.delete("to");
    }

    router.push(`/admin/history?${params.toString()}`);
    setIsOpen(false);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    applyDates(from, fromTime, to, toTime);
  };

  const handleClear = () => {
    setFrom("");
    setFromTime("00:00");
    setTo("");
    setToTime("23:59");
    applyDates("", "", "", "");
  };

  const setPreset = (preset: "today" | "7days" | "30days") => {
    const now = new Date();
    let startDate = new Date();

    if (preset === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (preset === "7days") {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (preset === "30days") {
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const fromStr = formatDate(startDate);
    const toStr = formatDate(now);

    setFrom(fromStr);
    setFromTime("00:00");
    setTo(toStr);
    setToTime("23:59");
    applyDates(fromStr, "00:00", toStr, "23:59");
  };

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const formatDateStr = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  };

  const handleSelectDay = (dayNum: number) => {
    const dateStr = formatDateStr(year, month, dayNum);

    if (activeTarget === "from") {
      setFrom(dateStr);
      if (!to || to < dateStr) {
        setTo(dateStr);
      }
      setActiveTarget("to");
    } else {
      if (from && dateStr < from) {
        setFrom(dateStr);
        setTo(from);
      } else {
        setTo(dateStr);
      }
    }
  };

  const fromHour = (fromTime.split(":")[0] || "00").padStart(2, "0");
  const fromMinute = (fromTime.split(":")[1] || "00").padStart(2, "0");
  const toHour = (toTime.split(":")[0] || "23").padStart(2, "0");
  const toMinute = (toTime.split(":")[1] || "59").padStart(2, "0");

  const hasFilter = Boolean(currentFrom || currentTo);

  const getButtonLabel = () => {
    if (!currentFrom && !currentTo) return "Filter by Date & Time";
    const displayFrom = currentFrom ? currentFrom.replace("T", " ") : "";
    const displayTo = currentTo ? currentTo.replace("T", " ") : "";

    if (displayFrom && displayTo) return `${displayFrom} → ${displayTo}`;
    if (displayFrom) return `From ${displayFrom}`;
    return `To ${displayTo}`;
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Popover Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
          hasFilter
            ? "border-blue-500/40 bg-blue-500/20 text-blue-400"
            : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
        }`}
      >
        <svg
          className="h-3.5 w-3.5 text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="font-mono">{getButtonLabel()}</span>
        {hasFilter && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
      </button>

      {/* Choosable Calendar Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-800 bg-[#0D121F] p-4 shadow-2xl backdrop-blur-xl">
          {/* Header Controls */}
          <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              📅 Select Date & Time Range
            </h4>
            {hasFilter && (
              <button
                type="button"
                onClick={handleClear}
                className="cursor-pointer text-[11px] font-medium text-red-400 transition hover:text-red-300"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Date Range Target Tabs */}
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTarget("from")}
              className={`flex-1 cursor-pointer rounded-xl border px-2.5 py-1.5 text-left font-mono text-xs transition ${
                activeTarget === "from"
                  ? "border-blue-500 bg-blue-500/10 font-bold text-blue-400"
                  : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
              }`}
            >
              <span className="block font-sans text-[9px] font-semibold uppercase text-slate-400">
                From Date
              </span>
              <span>{from || "YYYY-MM-DD"}</span>
            </button>

            <span className="text-slate-500">→</span>

            <button
              type="button"
              onClick={() => setActiveTarget("to")}
              className={`flex-1 cursor-pointer rounded-xl border px-2.5 py-1.5 text-left font-mono text-xs transition ${
                activeTarget === "to"
                  ? "border-blue-500 bg-blue-500/10 font-bold text-blue-400"
                  : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
              }`}
            >
              <span className="block font-sans text-[9px] font-semibold uppercase text-slate-400">
                To Date
              </span>
              <span>{to || "YYYY-MM-DD"}</span>
            </button>
          </div>

          {/* Choosable Calendar Month Header */}
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-100">
              {monthNames[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                ›
              </button>
            </div>
          </div>

          {/* Days Header */}
          <div className="mb-1.5 grid grid-cols-7 text-center text-[10px] font-semibold text-slate-500">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="mb-3 grid grid-cols-7 text-center text-xs">
            {/* Offset previous month days */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div
                key={`prev-${i}`}
                className="select-none py-1 text-[11px] text-slate-700"
              >
                {prevMonthDays - firstDayOfMonth + i + 1}
              </div>
            ))}

            {/* Current Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = formatDateStr(year, month, dayNum);

              const isFrom = from === dateStr;
              const isTo = to === dateStr;
              const isInRange = from && to && dateStr > from && dateStr < to;

              let styleClass =
                "hover:bg-slate-800 text-slate-200 cursor-pointer rounded-lg";
              if (isFrom || isTo) {
                styleClass =
                  "bg-blue-600 text-white font-bold rounded-lg shadow-md";
              } else if (isInRange) {
                styleClass =
                  "bg-blue-500/20 text-blue-300 font-medium rounded-none";
              }

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`py-1 text-xs transition ${styleClass}`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* iOS Alarm Style Time Picker Section */}
          <div className="mb-3 border-t border-slate-800/80 pt-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">
                🕒 Time Picker
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-2.5">
              {/* From Time Wheel Column */}
              <div className="flex flex-col items-center">
                <span className="mb-1.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  From Time
                </span>
                <div className="flex items-center gap-1">
                  <IosWheelColumn
                    value={fromHour}
                    options={HOURS}
                    onChange={(h) => setFromTime(`${h}:${fromMinute}`)}
                  />
                  <span className="font-mono text-base font-bold text-slate-500">
                    :
                  </span>
                  <IosWheelColumn
                    value={fromMinute}
                    options={MINUTES}
                    onChange={(m) => setFromTime(`${fromHour}:${m}`)}
                  />
                </div>
              </div>

              {/* To Time Wheel Column */}
              <div className="flex flex-col items-center border-l border-slate-800/60 pl-3">
                <span className="mb-1.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  To Time
                </span>
                <div className="flex items-center gap-1">
                  <IosWheelColumn
                    value={toHour}
                    options={HOURS}
                    onChange={(h) => setToTime(`${h}:${toMinute}`)}
                  />
                  <span className="font-mono text-base font-bold text-slate-500">
                    :
                  </span>
                  <IosWheelColumn
                    value={toMinute}
                    options={MINUTES}
                    onChange={(m) => setToTime(`${toHour}:${m}`)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Select Presets */}
          <div className="mb-3 border-t border-slate-800/80 pt-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreset("today")}
                className="flex-1 cursor-pointer rounded-lg border border-slate-800 bg-slate-950 py-1 text-[11px] font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setPreset("7days")}
                className="flex-1 cursor-pointer rounded-lg border border-slate-800 bg-slate-950 py-1 text-[11px] font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setPreset("30days")}
                className="flex-1 cursor-pointer rounded-lg border border-slate-800 bg-slate-950 py-1 text-[11px] font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                30 Days
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-800/80 pt-2.5">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="cursor-pointer rounded-xl border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="cursor-pointer rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
