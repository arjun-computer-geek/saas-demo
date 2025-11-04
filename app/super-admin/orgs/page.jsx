"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrgsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState([]);

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

  async function toggleOrg(id, current) {
    const token = window.localStorage.getItem('auth_token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/super/orgs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ isDisabled: !current }) });
    if (res.ok) {
      setOrgs(orgs.map(o => o._id === id ? { ...o, isDisabled: !current } : o));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Organizations</h1>
        <a className="px-3 py-2 bg-black text-white rounded" href="/super-admin/orgs/new">New Organization</a>
      </div>
      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Slug</th>
              <th className="text-left p-2">Domains</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o._id} className="border-t">
                <td className="p-2"><span className="underline">{o.name}</span></td>
                <td className="p-2">{o.slug}</td>
                <td className="p-2">{(o.domains||[]).map(d=>d.domain).join(', ')}</td>
                <td className="p-2">{o.isDisabled ? 'Disabled' : 'Active'}</td>
                <td className="p-2">
                  <button className="px-2 py-1 border rounded" onClick={() => toggleOrg(o._id, o.isDisabled)}>{o.isDisabled ? 'Enable' : 'Disable'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

