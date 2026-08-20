import SearchBar from "@/components/SearchBar"; // Adjust path to match where your SearchBar component is located

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-slate-100">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
        Officer Phonebook
      </h1>

      <SearchBar />
    </main>
  );
}