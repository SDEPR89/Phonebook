"use client";

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // Imported Link component

type Suggestion = {
  id: string;
  text: string;
  profileUrl?: string | null;
};

export default function UserHomePage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch search suggestions with debouncing
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data: Suggestion[] = await res.json();
          setSuggestions(data.slice(0, 5));
          setIsOpen(data.length > 0);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error("Failed to fetch search suggestions:", error);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const executeSearch = (searchText: string) => {
    if (!searchText.trim()) return;
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(searchText.trim())}`);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1,
      );
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[selectedIndex];
      setQuery(selected.text);
      executeSearch(selected.text);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
      {/* Top-Right Settings Button */}
      <Link
        href="/settings"
        className="fixed top-6 right-6 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-300 shadow-lg backdrop-blur-md transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
        title="Account Settings"
      >
        <svg
          className="h-4 w-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span>Settings</span>
      </Link>

      <div className="w-full max-w-xl space-y-8 text-center">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-100 sm:text-5xl">
            Phonebook <span className="text-blue-400">Search</span>
          </h1>
          <p className="text-sm text-slate-400">
            Search officers by name, email, phone, or cert
          </p>
        </div>

        {/* Search Container */}
        <div ref={dropdownRef} className="relative w-full">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                const val = e.target.value;
                setQuery(val);
                if (!val.trim()) {
                  setSuggestions([]);
                  setIsOpen(false);
                }
              }}
              onFocus={() =>
                query.trim() && suggestions.length > 0 && setIsOpen(true)
              }
              onKeyDown={handleKeyDown}
              placeholder="Type to search..."
              className="w-full rounded-full border border-slate-800 bg-slate-900/80 px-6 py-4 pl-12 text-base text-slate-100 shadow-lg backdrop-blur-md outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
            <svg
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </form>

          {/* Suggestions Dropdown */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md">
              <ul className="divide-y divide-slate-800/50">
                {suggestions.map((item, index) => (
                  <li
                    key={`${item.id}-${index}`}
                    onClick={() => {
                      setQuery(item.text);
                      executeSearch(item.text);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex cursor-pointer items-center gap-3 px-5 py-3 text-left text-sm transition ${
                      index === selectedIndex
                        ? "bg-slate-800 text-blue-400"
                        : "text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    {item.profileUrl ? (
                      <img
                        src={item.profileUrl}
                        alt={item.text}
                        className="h-7 w-7 rounded-full border border-slate-700 object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-bold text-slate-300">
                        {item.text.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
