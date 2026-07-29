// app/dashboard/page.tsx -> what the site redirects to after auth success
// This page receives ?user_id=... from our backend's OAuth redirect.
// fetches that user's name from our backend so we can show a welcome message.

type DashboardProps = {
  searchParams: Promise<{ user_id?: string }>;
};

export default async function Dashboard({ searchParams }: DashboardProps) {
  const { user_id } = await searchParams;

  if (!user_id) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">
          No user found. Please connect Strava first.
        </p>
      </main>
    );
  }

  // ask our backend for this user's firstname/lastname
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const res = await fetch(`${backendUrl}/userInfo/${user_id}`, {
    cache: "no-store",
  });

  const user = res.ok ? await res.json() : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      {user ? (
        <p>
          Welcome, {user.firstname} {user.lastname}!
        </p>
      ) : (
        <p>✅ Connected successfully!</p>
      )}
      <p className="text-gray-500">Internal user ID: {user_id}</p>
    </main>
  );
}
