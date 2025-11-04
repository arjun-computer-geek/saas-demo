"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewOrgPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    const token = window.localStorage.getItem('auth_token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/super/orgs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }, body: JSON.stringify({ name, slug, domain }) });
    if (res.ok) router.push('/super-admin/orgs');
    else setError('Failed to create org');
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold mb-4">New Organization</h1>
      <form className="space-y-3" onSubmit={handleCreate}>
        <input className="w-full border rounded px-3 py-2" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Slug" value={slug} onChange={e=>setSlug(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Primary domain (e.g. acme.localhost:3000)" value={domain} onChange={e=>setDomain(e.target.value)} />
        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        <button className="px-3 py-2 bg-black text-white rounded">Create</button>
      </form>
    </div>
  );
}

