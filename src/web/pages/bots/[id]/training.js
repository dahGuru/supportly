import { useRouter } from 'next/router';
import useSWR, { mutate } from 'swr';
import fetcher from '../../../lib/fetcher';
import { useState } from 'react';
import Link from 'next/link';

export default function BotTraining() {
  const router = useRouter();
  const { id } = router.query;
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // 1. Fetch Bot Info (for name)
  const { data: bots } = useSWR('/api/bots', fetcher);
  const bot = bots?.find(b => b.id === id);

  // 2. Fetch Training Sources (We need a new API endpoint for listing sources, 
  //    but for now we'll just implement the "Add" functionality)

  async function handleScrape(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('/api/training/scrape', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ botId: id, url }),
      });

      if (res.ok) {
        setMsg('Success! Scraping job queued. Check back in 1 minute.');
        setUrl('');
      } else {
        setMsg('Error starting scrape.');
      }
    } catch (err) {
      setMsg('Network error.');
    } finally {
      setLoading(false);
    }
  }

  if (!bot) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow">
        
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold">Training: {bot.name}</h1>
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-800">
            &larr; Back
          </Link>
        </div>

        {/* Add Source Form */}
        <div className="bg-blue-50 p-4 rounded border border-blue-100 mb-6">
          <h2 className="font-bold text-blue-900 mb-2">Add Knowledge Source</h2>
          <p className="text-sm text-blue-700 mb-4">
            Enter a website URL. The bot will scrape the text and learn from it.
          </p>
          
          <form onSubmit={handleScrape} className="flex gap-2">
            <input 
              type="url"
              className="flex-1 border p-2 rounded outline-none focus:ring-2 ring-blue-500"
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
            />
            <button 
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Queuing...' : 'Train Bot'}
            </button>
          </form>
          {msg && <div className="mt-2 text-sm font-semibold text-green-700">{msg}</div>}
        </div>

      </div>
    </div>
  );
}