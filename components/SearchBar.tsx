"use client";

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Suggestion = {
  id: string;
  officerId?: string;
  text: string;
  profileUrl?: string | null;
};

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

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
    setQuery(item.text);
    setIsOpen(false);

    // Pass the full UUID directly
    const targetOfficerId = item.officerId || item.id;

    if (targetOfficerId) {
      router.push(`/officers/${targetOfficerId}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(item.text)}`);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

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
          placeholder="Search by name, phone, email, cert..."
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

      {/* Suggestion Dropdown */}
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
              {item.profileUrl ? (
                <img
                  src={item.profileUrl}
                  alt={item.text}
                  className="h-7 w-7 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600">
                  {item.text.charAt(0).toUpperCase()}
                </div>
              )}

              <span className="truncate">{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}