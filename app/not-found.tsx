// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Not Found</h1>
      <p className="text-gray-500">
        The officer or user you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="rounded-full bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
      >
        Back to Search
      </Link>
    </main>
  );
}
