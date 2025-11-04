"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = window.localStorage.getItem('auth_token');
    const role = window.localStorage.getItem('auth_role');
    if (!token) { router.push('/auth/signin'); return; }
    if (role !== 'admin') { router.push('/dashboard'); return; }
    (async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}`, 'x-org-domain': window.location.host } });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    })();
  }, [router]);

  async function toggleDisable(userId, current) {
    setError('');
    const token = window.localStorage.getItem('auth_token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-org-domain': window.location.host }, body: JSON.stringify({ isDisabled: !current }) });
    if (res.ok) {
      setUsers(users.map(u => u._id === userId ? { ...u, isDisabled: !current } : u));
    } else {
      setError('Failed to update user');
    }
  }

  async function createInvite(e) {
    e.preventDefault();
    setError('');
    const token = window.localStorage.getItem('auth_token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/admin/invites`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-org-domain': window.location.host }, body: JSON.stringify({ email: inviteEmail, role: inviteRole }) });
    const data = await res.json();
    if (!res.ok) { setError(data?.error || 'Failed to create invite'); return; }
    alert(`Invite created. Token: ${data.invite.token}`);
    setInviteEmail('');
    setInviteRole('user');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Panel</h1>
      {error ? <div className="text-red-600 text-sm">{error}</div> : null}
      <div className="border rounded p-4">
        <h2 className="font-medium mb-3">Invite</h2>
        <form className="flex flex-col gap-2 max-w-md" onSubmit={createInvite}>
          <input className="border rounded px-3 py-2" placeholder="Email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} />
          <select className="border rounded px-3 py-2" value={inviteRole} onChange={e=>setInviteRole(e.target.value)}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button className="px-3 py-2 bg-black text-white rounded">Create Invite</button>
        </form>
      </div>

      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Role</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} className="border-t">
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.isDisabled ? 'Disabled' : 'Active'}</td>
                <td className="p-2">
                  <button className="px-2 py-1 border rounded" onClick={() => toggleDisable(u._id, u.isDisabled)}>{u.isDisabled ? 'Enable' : 'Disable'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


