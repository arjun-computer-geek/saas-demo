"use client";
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AcceptInvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function accept(e) {
    e.preventDefault();
    setError('');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/invites/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, name, password }) });
    const data = await res.json();
    if (!res.ok) { setError(data?.error || 'Failed'); return; }
    router.push('/auth/signin');
  }

  return (
    <div className="max-w-sm">
      <h1 className="text-xl font-semibold mb-3">Accept Invite</h1>
      <form className="space-y-3" onSubmit={accept}>
        <input className="w-full border rounded px-3 py-2" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        <button className="px-3 py-2 bg-black text-white rounded">Create Account</button>
      </form>
    </div>
  );
}

