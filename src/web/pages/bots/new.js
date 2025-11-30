import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function NewBot() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [welcome, setWelcome] = useState('Hello! How can I help you today?');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = localStorage.getItem('token');
    if (!token) return router.push('/');

    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, welcomeMessage: welcome }),
      });

      if (res.ok) {
        router.push('/dashboard'); // Go back to dashboard on success
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create bot');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Create New Bot</h1>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Bot Name</label>
            <input 
              className="w-full border p-2 rounded focus:ring-2 ring-blue-500 outline-none" 
              placeholder="e.g. Support Assistant"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Welcome Message</label>
            <textarea 
              className="w-full border p-2 rounded h-24 focus:ring-2 ring-blue-500 outline-none" 
              value={welcome}
              onChange={e => setWelcome(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1 text-center py-2 border rounded hover:bg-gray-100">
              Cancel
            </Link>
            <button 
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Bot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}