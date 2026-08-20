// app/admin/page.tsx
export default async function AdminPage() {
  // TODO: if (!session || session.systemRole !== "admin") redirect("/")

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold">Admin — Users</h1>
      <p className="text-gray-500">User table coming once db + auth exist.</p>
    </main>
  );
}
