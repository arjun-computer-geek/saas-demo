"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [flags, setFlags] = useState({});

  useEffect(() => {
    const token = window.localStorage.getItem('auth_token');
    const storedRole = window.localStorage.getItem('auth_role');
    if (!token) {
      router.push('/auth/signin');
      return;
    }
    setRole(storedRole || '');
    (async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/me/features`, { headers: { 'Authorization': `Bearer ${token}`, 'x-org-domain': window.location.host } });
      if (res.ok) {
        const data = await res.json();
        setFlags(data.features || {});
      }
    })();
  }, [router]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="text-sm text-gray-600">Role: {role || 'unknown'}</div>
      {role === 'super_admin' ? (
        <a className="inline-block px-3 py-2 bg-black text-white rounded" href="/super-admin">Open Super Admin</a>
      ) : null}
      {role === 'admin' ? (
        <a className="inline-block px-3 py-2 bg-black text-white rounded" href="/admin">Open Admin Panel</a>
      ) : null}

      <div className="mt-6">
        <h2 className="font-medium mb-2">Available Features</h2>
        <ul className="list-disc pl-6 text-sm">
          {Object.keys(flags).length === 0 ? <li>No feature flags enabled</li> : null}
          {Object.entries(flags).map(([k, v]) => (
            <li key={k}>{k}: {String(v)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

