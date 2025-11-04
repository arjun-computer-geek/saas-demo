"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperAdminsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrgId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = window.localStorage.getItem('auth_token');
    const role = window.localStorage.getItem('auth_role');
    if (!token) { router.push('/auth/signin'); return; }
    if (role !== 'super_admin') { router.push('/dashboard'); return; }
    (async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/super/orgs`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setOrgs(data.orgs || []);
      }
    })();
  }, [router]);

  async function createAdmin(e) {
    e.preventDefault();
    setMessage('');
    const token = window.localStorage.getItem('auth_token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/super/admins`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ orgId, email, password, name }) });
    const data = await res.json();
    if (!res.ok) { setMessage(data?.error || 'Failed'); return; }
    setMessage('Admin created');
    setEmail(''); setPassword(''); setName('');
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Super Admin - Create Admin</h1>
      <form className="max-w-md space-y-2" onSubmit={createAdmin}>
        <select className="w-full border rounded px-3 py-2" value={orgId} onChange={e=>setOrgId(e.target.value)}>
          <option value="">Select organization</option>
          {orgs.map(o => <option key={o._id} value={o._id}>{o.name} ({o.slug})</option>)}
        </select>
        <input className="w-full border rounded px-3 py-2" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="px-3 py-2 bg-black text-white rounded" disabled={!orgId || !email || !password}>Create Admin</button>
      </form>
      {message ? <div className="text-sm">{message}</div> : null}
    </div>
  );
}

