"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperFeaturesPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [flags, setFlags] = useState({});
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('true');
  const token = useMemo(() => (typeof window !== 'undefined' ? window.localStorage.getItem('auth_token') : ''), []);

  useEffect(() => {
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
  }, [router, token]);

  useEffect(() => {
    const current = orgs.find(o => o._id === selectedOrgId);
    const obj = {};
    if (current?.featureFlags) {
      for (const [k, v] of Object.entries(current.featureFlags)) obj[k] = v;
    }
    setFlags(obj);
  }, [selectedOrgId, orgs]);

  async function saveFlag(k, v) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/super/orgs/${selectedOrgId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ featureFlags: { [k]: v } }) });
    if (res.ok) {
      setFlags({ ...flags, [k]: v });
    }
  }

  async function removeFlag(k) {
    const newObj = { ...flags };
    delete newObj[k];
    // send false to effectively disable; or send entire set in real app
    await saveFlag(k, false);
    setFlags(newObj);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Super Admin - Feature Flags</h1>
      <div className="max-w-md flex gap-2 items-center">
        <label className="text-sm text-gray-600">Organization</label>
        <select className="border rounded px-3 py-2 flex-1" value={selectedOrgId} onChange={e=>setSelectedOrgId(e.target.value)}>
          <option value="">Select organization</option>
          {orgs.map(o => (
            <option key={o._id} value={o._id}>{o.name} ({o.slug})</option>
          ))}
        </select>
      </div>

      {selectedOrgId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded p-4">
            <h2 className="font-medium mb-3">Current Flags</h2>
            <ul className="text-sm space-y-2">
              {Object.keys(flags).length === 0 ? <li className="text-gray-500">No flags</li> : null}
              {Object.entries(flags).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between">
                  <span>{k}: <span className="font-mono">{String(v)}</span></span>
                  <div className="flex gap-2">
                    <button className="px-2 py-1 border rounded" onClick={() => saveFlag(k, !v)}>{v ? 'Disable' : 'Enable'}</button>
                    <button className="px-2 py-1 border rounded" onClick={() => removeFlag(k)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="border rounded p-4">
            <h2 className="font-medium mb-3">Add / Update Flag</h2>
            <div className="flex flex-col gap-2 max-w-sm">
              <input className="border rounded px-3 py-2" placeholder="flag_name" value={newKey} onChange={e=>setNewKey(e.target.value)} />
              <select className="border rounded px-3 py-2" value={newVal} onChange={e=>setNewVal(e.target.value)}>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
              <button className="px-3 py-2 bg-black text-white rounded" disabled={!newKey} onClick={() => saveFlag(newKey, newVal === 'true')}>Save Flag</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


