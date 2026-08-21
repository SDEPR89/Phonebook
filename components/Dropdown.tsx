"use client";

import React, { useState, useRef, useEffect } from "react";

type Option = {
  id: string;
  name: string;
};

type DropdownProps = {
  options: Option[];
  value: string; // We will use the 'name' as the value to match existing DB schema for simplicity, or id if you prefer. Based on the previous input type="text", they passed 'name'.
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (optionName: string) => {
    onChange(optionName);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-left outline-none transition ${
          isOpen ? "border-blue-500" : "focus:border-blue-500"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${
          value ? "text-slate-100" : "text-slate-400"
        }`}
      >
        <span className="truncate">{value || placeholder}</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-800 bg-slate-950 shadow-lg p-1">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400 text-center">
              No options available
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.name)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  value === option.name
                    ? "bg-blue-600/20 text-blue-400 font-medium"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                {option.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
