"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NavClient() {
  const router = useRouter();
  const [role, setRole] = useState('');

  useEffect(() => {
    setRole(window.localStorage.getItem('auth_role') || '');
  }, []);

  function logout() {
    window.localStorage.removeItem('auth_token');
    window.localStorage.removeItem('auth_role');
    window.localStorage.removeItem('auth_orgId');
    router.push('/auth/signin');
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/" className="text-sm text-gray-600 hover:text-black">Home</Link>
      <Link href="/dashboard" className="text-sm text-gray-600 hover:text-black">Dashboard</Link>
      {role === 'super_admin' ? (
        <>
          <Link href="/super-admin" className="text-sm text-gray-600 hover:text-black">Super Admin</Link>
          <Link href="/super-admin/orgs" className="text-sm text-gray-600 hover:text-black">Orgs</Link>
          <Link href="/super-admin/admins" className="text-sm text-gray-600 hover:text-black">Admins</Link>
          <Link href="/super-admin/features" className="text-sm text-gray-600 hover:text-black">Features</Link>
        </>
      ) : null}
      {role === 'admin' ? (
        <Link href="/admin" className="text-sm text-gray-600 hover:text-black">Admin</Link>
      ) : null}
      <button onClick={logout} className="ml-4 text-sm px-2 py-1 border rounded">Sign out</button>
    </div>
  );
}


