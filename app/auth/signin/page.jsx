"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Login failed');
      window.localStorage.setItem('auth_token', data.token);
      window.localStorage.setItem('auth_role', data.role);
      window.localStorage.setItem('auth_orgId', data.orgId || '');
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-xl font-semibold mb-4">Sign in</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        <button className="w-full bg-black text-white rounded px-3 py-2">Sign in</button>
      </form>
    </div>
  );
}

