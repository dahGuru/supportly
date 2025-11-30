import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';

export default function TryBot() {
  const router = useRouter();
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/');

    // 1. Fetch your bots
    fetch('/api/bots', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(bots => {
      if (bots && bots.length > 0) {
        // 2. Pick the newest bot
        setBot(bots[0]);
      }
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10">Loading test environment...</div>;
  if (!bot) return <div className="p-10">No bots found! Create one in the dashboard first.</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg text-center">
        <h1 className="text-3xl font-bold mb-4">🤖 Admin Playground</h1>
        <div className="text-left bg-gray-50 p-4 rounded border text-sm space-y-2 mb-6">
          <p><strong>Bot Name:</strong> {bot.name}</p>
          <p><strong>Bot ID:</strong> <span className="font-mono text-xs">{bot.id}</span></p>
          <p><strong>Tenant ID:</strong> <span className="font-mono text-xs">{bot.tenant_id}</span></p>
        </div>
        
        <p className="text-blue-600 font-semibold animate-pulse">
          ↘️ Click the blue chat bubble to test ↘️
        </p>
        
        <div className="mt-8 text-xs text-gray-400">
          This page is only visible to logged-in admins.
        </div>
      </div>

      {/* Auto-Inject the Widget for this specific bot */}
      <Script 
        id="supportly-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window._CS = {
              tenant: '${bot.tenant_id}',
              botId: '${bot.id}'
            };
          `
        }} 
      />
      <Script src="/widget.js" strategy="afterInteractive" />
    </div>
  );
}