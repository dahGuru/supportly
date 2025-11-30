import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useState } from 'react';
import fetcher from '../../lib/fetcher';

export default function ConversationView() {
  const router = useRouter();
  const { id } = router.query;

  // Uses the API route for single conversation details
  const { data, mutate } = useSWR(id ? `/api/conversations/${id}` : null, fetcher);
  const [text, setText] = useState('');

  async function sendAgentMessage() {
    if (!text.trim()) return;
    
    await fetch(`/api/conversations/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, senderId: 'agent' })
    });
    
    setText('');
    mutate(); // Refresh the chat list
  }

  if (!data) return <div className="p-8">Loading transcript...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b p-4 shadow-sm">
        <h1 className="text-xl font-bold">
          Conversation <span className="text-gray-400">#{id?.slice(0, 8)}</span>
        </h1>
        <div className="text-sm text-gray-500">
          Status: <span className="uppercase font-semibold">{data.conversation?.status}</span>
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {data.messages?.map((m) => {
          const isVisitor = m.sender_type === 'visitor';
          return (
            <div key={m.id} className={`flex ${isVisitor ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-lg p-4 rounded-lg shadow-sm ${
                  isVisitor ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border'
                }`}
              >
                <div className={`text-xs mb-1 opacity-70 ${isVisitor ? 'text-blue-100' : 'text-gray-500'}`}>
                  {m.sender_type.toUpperCase()} • {new Date(m.created_at).toLocaleTimeString()}
                </div>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t">
        <div className="max-w-4xl mx-auto flex gap-4">
          <input
            className="flex-1 border p-3 rounded shadow-inner outline-none focus:ring-2 ring-blue-500"
            placeholder="Type a reply as a human agent..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendAgentMessage()}
          />
          <button 
            onClick={sendAgentMessage}
            className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 shadow"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}