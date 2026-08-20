"use client";

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
  id: string;
  text: string;
  profileUrl?: string | null;
};

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
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

  const handleSearchSubmit = (e: FormEvent) => {
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
      const selected = suggestions[selectedIndex];
      setQuery(selected.text);
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(selected.text)}`);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-slate-100">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
        Officer Phonebook
      </h1>

      <div ref={dropdownRef} className="relative w-full max-w-md">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
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
            placeholder="Search by name, phone, email, or cert..."
            className="w-full rounded-full border border-slate-800 bg-slate-900/90 px-5 py-3 text-slate-100 placeholder-slate-400 shadow-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
            autoFocus
          />
          <button
            type="submit"
            className="rounded-full bg-blue-600 px-6 py-3 font-medium text-white shadow-lg transition hover:bg-blue-500 active:scale-95"
          >
            Search
          </button>
        </form>

        {isOpen && (
          <ul className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-md">
            {suggestions.map((item, index) => (
              <li
                key={`${item.id}-${index}`}
                onClick={() => {
                  setQuery(item.text);
                  setIsOpen(false);
                  router.push(`/search?q=${encodeURIComponent(item.text)}`);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 font-medium transition ${
                  index === selectedIndex
                    ? "bg-slate-800 text-blue-400"
                    : "text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {/* Profile Image or Avatar Fallback */}
                {item.profileUrl ? (
                  <img
                    src={item.profileUrl}
                    alt={item.text}
                    className="h-8 w-8 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-bold text-slate-300">
                    {item.text.charAt(0).toUpperCase()}
                  </div>
                )}

                <span className="truncate">{item.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
