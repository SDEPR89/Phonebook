// app/profile/page.tsx
export default async function ProfilePage() {
  // TODO: get logged-in user from ThaiID session
  // TODO: if (!session) redirect to login

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold">My Profile</h1>
      <p className="text-gray-500">Editable form coming once auth exists.</p>
    </main>
  );
}
