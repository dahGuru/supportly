import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ tenantName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem('token', token);
        router.push('/dashboard'); // Go straight to dashboard
      } else {
        const data = await res.json();
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}
        
        <label className="block text-sm font-bold mb-1">Company Name</label>
        <input 
          className="w-full border p-2 mb-4 rounded" 
          value={form.tenantName}
          onChange={e => setForm({...form, tenantName: e.target.value})}
          required
        />

        <label className="block text-sm font-bold mb-1">Email</label>
        <input 
          className="w-full border p-2 mb-4 rounded" 
          type="email"
          value={form.email}
          onChange={e => setForm({...form, email: e.target.value})}
          required
        />

        <label className="block text-sm font-bold mb-1">Password</label>
        <input 
          className="w-full border p-2 mb-6 rounded" 
          type="password" 
          value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
          required
        />
        
        <button disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Creating...' : 'Sign Up'}
        </button>

        <div className="mt-4 text-center text-sm">
          Already have an account? <Link href="/" className="text-blue-600 hover:underline">Log in</Link>
        </div>
      </form>
    </div>
  );
}