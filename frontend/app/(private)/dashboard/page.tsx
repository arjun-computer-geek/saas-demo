"use client";
import { useAuth } from "@/store/auth";
import Link from "next/link";

export default function Dashboard() {
  const { user, orgId, role } = useAuth();

  if (user?.isSuper) {
    return (
      <section className="card">
        <h1>Super Admin Dashboard</h1>
        <p>Welcome, {user.email}</p>
        <ul>
          <li><a href="/super/organizations" className="link">Manage Organizations</a></li>
          <li><a href="/super/admins" className="link">Manage Admins</a></li>
        </ul>
      </section>
    );
  }

  return (
    <section className="card">
      <h1>{orgId ? "Organization Dashboard" : "User Dashboard"}</h1>
      <p>{user?.email}</p>
      <div className="row gap">
        <a className="btn" href="/items">Go to Todos</a>
         {role === "ADMIN" && orgId && (
              <Link href="/admin/users">Manage Users</Link>
            )}
        
      </div>
    </section>
  );
}
