// app/dashboard/page.tsx -> what the site redirects to after auth success
// This page receives ?user_id=... from our backend's OAuth redirect.
// fetches that user's name from our backend so we can show a welcome message.
import WeeklyMileageChart from "./WeeklyMileageChart";
import MileageHistoryChart from "./MileageHistoryChart";
import Header from "./Header"

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
  const res = await fetch(`${backendUrl}/data/${user_id}`, {
    cache: "no-store",
  });

  const user = res.ok ? await res.json() : null;

  return (
    <>
      {/* header */}
      <Header 
        firstname = {user.firstname}
        lastname = {user.lastname}
        profilepic = {user.profilepic}
        userId = {user_id} />

      <main className="">
        {user ? (
          <div className="w-full max-w-2xl">
            <p className="font-bold text-4xl">
              Welcome, {user.firstname} {user.lastname}!
            </p>

            

            {/* bar chart of weekly miles */}
            {user.weeklyMiles && (
              <div className="w-full max-w-xl">
                <WeeklyMileageChart weeklyMiles={user.weeklyMiles} />

                <MileageHistoryChart userId={user_id} />
              </div>
            )}
          </div>
        ) : (
          <p>✅ Connected successfully!</p>
        )}
      </main>
    </>
  );
}
