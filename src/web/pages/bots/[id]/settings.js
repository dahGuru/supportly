import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useState, useEffect } from 'react';
import fetcher from '../../../lib/fetcher';

export default function BotSettings() {
  const router = useRouter();
  const { id } = router.query;
  
  // We reuse the list endpoint for simplicity in this MVP
  const { data: bots } = useSWR('/api/bots', fetcher);
  const bot = bots?.find(b => b.id === id);

  const [welcome, setWelcome] = useState('');

  useEffect(() => {
    if (bot) setWelcome(bot.welcome_message || '');
  }, [bot]);

  async function save() {
    // Note: You need to implement the PUT /api/bots/[id] endpoint for this to work fully
    alert('Settings saved (Simulation)'); 
  }

  if (!bot) return <div className="p-8">Loading bot configuration...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-6">Settings: {bot.name}</h1>
        
        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-2">Welcome Message</label>
          <p className="text-sm text-gray-500 mb-2">The first thing the bot says to a visitor.</p>
          <textarea 
            className="w-full border p-3 rounded h-32"
            value={welcome}
            onChange={(e) => setWelcome(e.target.value)}
          />
        </div>

        <button 
          onClick={save}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}