"use client";

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
  id: string;
  officerId?: string;
  text: string;
  shortName?: string;
  fullName?: string;
  profileUrl?: string | null;
  type?: "officer" | "cert";
};

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce API calls as the user types
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

  // Close dropdown when clicking outside
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

  const handleSelectSuggestion = (item: Suggestion) => {
    setIsOpen(false);

    // If Certificate: prioritize shortName, fallback to text
    if (item.type === "cert") {
      const targetQuery = item.shortName || item.text;
      setQuery(targetQuery);
      router.push(`/search?q=${encodeURIComponent(targetQuery)}`);
      return;
    }

    // If Officer: navigate directly to their profile page
    if (item.officerId) {
      setQuery(item.text);
      router.push(`/officers/${item.officerId}`);
      return;
    }

    // Default search page fallback
    setQuery(item.text);
    router.push(`/search?q=${encodeURIComponent(item.text)}`);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsOpen(false);

    // 1. If an item in dropdown is actively selected via arrow keys
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSelectSuggestion(suggestions[selectedIndex]);
      return;
    }

    // 2. Check if text matches a cert (either shortName or fullName)
    const matchedCert = suggestions.find(
      (s) =>
        s.type === "cert" &&
        (s.text.toLowerCase() === trimmed.toLowerCase() ||
          s.shortName?.toLowerCase() === trimmed.toLowerCase() ||
          s.fullName?.toLowerCase() === trimmed.toLowerCase())
    );

    const finalQuery = matchedCert?.shortName || trimmed;
    router.push(`/search?q=${encodeURIComponent(finalQuery)}`);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full max-w-xs">
      <form
        onSubmit={handleSubmit}
        className="flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm transition-all focus-within:border-indigo-900 focus-within:ring-2 focus-within:ring-indigo-900/20"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() =>
            query.trim() && suggestions.length > 0 && setIsOpen(true)
          }
          onKeyDown={handleKeyDown}
          placeholder="ค้นหาด้วย ชื่อ, เบอร์ติดต่อ, อีเมล, CERT"
          className="w-full bg-transparent px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
          autoFocus
        />
        <button
          type="submit"
          aria-label="Search"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-900 text-white transition hover:bg-indigo-950 active:scale-95 focus:outline-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </form>

      {/* Suggestion Dropdown List */}
      {isOpen && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
          {suggestions.map((item, index) => (
            <li
              key={`${item.id}-${index}`}
              onClick={() => handleSelectSuggestion(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                index === selectedIndex
                  ? "bg-indigo-50 text-indigo-900"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.type === "cert" ? (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                </div>
              ) : item.profileUrl ? (
                <img
                  src={item.profileUrl}
                  alt={item.text}
                  className="h-7 w-7 shrink-0 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600">
                  {item.text.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex flex-col min-w-0">
                <span className="truncate">{item.text}</span>
                {item.type === "cert" && (
                  <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                    {item.shortName ? `CERT: ${item.shortName}` : "CERTIFICATE"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}