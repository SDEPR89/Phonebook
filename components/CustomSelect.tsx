"use client";

import { useState, useRef, useEffect } from "react";

export interface Option {
  value: string;
  label: string;
  color?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  className?: string;
}

export default function CustomSelect({ value, onChange, options, className = "" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none transition hover:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.color && (
            <span className={`h-2 w-2 shrink-0 rounded-full ${selectedOption.color}`}></span>
          )}
          <span className="truncate">{selectedOption?.label}</span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
          <div className="p-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-800 ${
                  value === option.value
                    ? "bg-slate-800 font-medium text-white"
                    : "text-slate-300"
                }`}
              >
                {option.color && (
                  <span className={`h-2 w-2 shrink-0 rounded-full ${option.color}`}></span>
                )}
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
