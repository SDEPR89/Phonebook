// app/admin/users/[id]/page.tsx
type Props = { params: Promise<{ id: string }> };

export default async function AdminUserEditPage({ params }: Props) {
  const { id } = await params;
  // TODO: if (!session || session.systemRole !== "admin") redirect("/")
  // TODO: const user = await getOfficerById(id); if (!user) notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold">Edit User #{id}</h1>
      <p className="text-gray-500">Edit form coming once db + auth exist.</p>
    </main>
  );
}
