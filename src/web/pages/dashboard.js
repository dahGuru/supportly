// import useSWR from 'swr';
// import fetcher from '../lib/fetcher';
// import Link from 'next/link';

// export default function Dashboard() {
//   const { data: bots } = useSWR('/api/bots', fetcher);
//   const { data: convs } = useSWR('/api/conversations', fetcher);

//   return (
//     <div className="p-8">
//       <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
//       <div className="grid grid-cols-2 gap-8">
//         <section>
//           <h2 className="text-xl font-semibold mb-4">Your Bots</h2>
//           <ul className="space-y-2">
//             {bots?.map(bot => (
//               <li key={bot.id} className="p-4 border rounded hover:bg-gray-50">
//                 <Link href={`/bots/${bot.id}/settings`} className="text-blue-600 font-bold">
//                   {bot.name}
//                 </Link>
//               </li>
//             ))}
//           </ul>
//         </section>

//         <section>
//           <h2 className="text-xl font-semibold mb-4">Recent Conversations</h2>
//           <ul className="space-y-2">
//             {convs?.map(c => (
//               <li key={c.id} className="p-4 border rounded">
//                 <Link href={`/conversations/${c.id}`}>
//                    Conversation {c.id.slice(0,8)}... 
//                    <span className="text-gray-500 text-sm ml-2">({c.status})</span>
//                 </Link>
//               </li>
//             ))}
//           </ul>
//         </section>
//       </div>
//     </div>
//   );
// }

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/');

    fetch('/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(setData)
    .catch(() => router.push('/'));
  }, []);

  if (!data) return <div className="p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <button 
            onClick={() => { localStorage.removeItem('token'); router.push('/'); }}
            className="text-red-500 hover:underline"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bots Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Your Bots</h2>
            {data.bots.length === 0 ? (
              <p className="text-gray-500">No bots yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.bots.map(bot => (
                  <li key={bot.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                    <span className="font-medium">{bot.name}</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Conversations Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Recent Chats</h2>
            {data.conversations.length === 0 ? (
              <p className="text-gray-500">No conversations yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.conversations.map(c => (
                  <li key={c.id} className="border-l-4 border-blue-500 pl-3 py-1">
                    <div className="text-sm font-bold text-gray-700">
                      Guest (ID: {c.visitor_id || 'Anon'})
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(c.started_at).toLocaleString()} • {c.msg_count} messages
                    </div>
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