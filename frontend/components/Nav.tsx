"use client";

import Link from "next/link";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function Nav() {
 const { user, orgId, role, clear } = useAuth();
  const router = useRouter();

  // --- Logout function ---
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors during logout
    } finally {
      clear();
      router.replace("/login");
    }
  };

  // --- No user loaded yet ---
  if (!user) return null;

  // --- Render navigation ---
  return (
    <nav className="nav">
      <div className="left">
        {/* Super Admin Section */}
        {user.isSuper ? (
          <>
            <Link href="/super/organizations">Organizations</Link>
            <Link href="/super/admins">Admins</Link>
            <Link href="/super/members">Members</Link>
          </>
        ) : (
           <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/items">Todos</Link>

            {/* Only show Manage Users if ADMIN */}
            {role === "ADMIN" && orgId && (
              <Link href="/admin/users">Manage Users</Link>
            )}
          </>
        )}
      </div>

      <div className="right">
        <span className="muted">
          {user.email}
          {user.isSuper
            ? " · Super Admin"
            : orgId
              ? ` · Org: ${orgId.slice(0, 6)}…`
              : ""}
        </span>
        <button className="btn" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
