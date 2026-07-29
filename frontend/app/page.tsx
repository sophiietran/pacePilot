// Landing page — just a button that sends the user to our backend's OAuth route

export default function Home() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">PacePilot</h1>
      <p className="text-gray-500">
        Connect your Strava account to get started
      </p>

      <a
        href={`${backendUrl}/auth/strava`}
        className="rounded-md bg-orange-500 py-3 p-5 font-semibold text-white hover:bg-orange-600"
      >
        Connect with Strava
      </a>
    </main>
  );
}
