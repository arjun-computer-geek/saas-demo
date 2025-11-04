"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default  function SuperAdminHome() {
  const router = useRouter();

  useEffect(() => {
    const token = window.localStorage.getItem('auth_token');
    const role = window.localStorage.getItem('auth_role');
    if (!token) { router.push('/auth/signin'); return; }
    if (role !== 'super_admin') { router.push('/dashboard'); return; }
    
  }, [router]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Super Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a className="block border rounded p-4 hover:bg-gray-50" href="/super-admin/orgs">Manage Organizations</a>
        <a className="block border rounded p-4 hover:bg-gray-50" href="/super-admin/features">Global Feature Flags</a>
      </div>
    </div>
  );
}

