import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null); // New Error State
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/");

    fetch("/api/dashboard/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text()); // Handle non-200 responses
        return res.json();
      })
      .then(setData)
      .catch((err) => {
        console.error("Dashboard Fetch Error:", err);
        setError("Could not load dashboard data.");
      });
  }, []);

  // 1. Loading State
  if (!data && !error) return <div className="p-10">Loading dashboard...</div>;

  // 2. Error State (Prevents Crash)
  if (error)
    return (
      <div className="p-10 text-red-600">
        <h2 className="font-bold text-xl">Error Loading Dashboard</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 underline"
        >
          Try Again
        </button>
      </div>
    );

  // 3. Success State
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/");
            }}
            className="text-red-500 hover:underline"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bots Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              Your Bots
            </h2>

            {/* SAFE CHECK: Ensure data.bots exists before mapping */}
            {!data.bots || data.bots.length === 0 ? (
              <p className="text-gray-500">No bots yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.bots.map((bot) => (
                  <li
                    key={bot.id}
                    className="flex justify-between items-center bg-gray-50 p-4 rounded border"
                  >
                    <div>
                      <div className="font-bold">{bot.name}</div>
                      <div className="text-xs text-gray-400 font-mono select-all">
                        Bot ID: {bot.id}
                      </div>
                      <div className="text-xs text-gray-400 font-mono select-all">
                        Tenant ID: {bot.tenant_id}
                      </div>
                    </div>
                    {/* <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Active
                    </span> */}
                    <div className="flex gap-2">
                      <Link
                        href={`/bots/${bot.id}/training`}
                        className="text-sm bg-green-100 text-green-800 border border-green-200 px-3 py-1 rounded hover:bg-green-200"
                      >
                        Train
                      </Link>

                      <Link
                        href={`/bots/${bot.id}/settings`}
                        className="text-sm border border-gray-300 px-3 py-1 rounded hover:bg-white"
                      >
                        Settings
                      </Link>

                      <Link
                        href={`/bots/${bot.id}/install`}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 shadow-sm"
                      >
                        Install
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Create Bot Button (Mock) */}
            <div className="mt-4 pt-4 border-t">
              <Link
                href="/bots/new"
                className="text-blue-600 text-sm font-bold hover:underline"
              >
                + Create New Bot
              </Link>
            </div>
          </div>

          {/* Conversations Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              Recent Chats
            </h2>

            {!data.conversations || data.conversations.length === 0 ? (
              <p className="text-gray-500">No conversations yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.conversations.map((c) => (
                  <li
                    key={c.id}
                    className="border-l-4 border-blue-500 pl-3 py-1"
                  >
                    <Link
                      href={`/conversations/${c.id}`}
                      className="hover:bg-gray-50 block p-1 rounded"
                    >
                      <div className="text-sm font-bold text-gray-700">
                        Guest (ID: {c.visitor_id || "Anon"})
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(c.started_at).toLocaleString()} •{" "}
                        {c.msg_count} messages
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
