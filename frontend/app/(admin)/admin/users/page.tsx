"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { HintAdminOnly } from "@/components/RoleGates";
import Link from "next/link";

type Member = {
  userId: string;
  role: "ADMIN" | "USER";
  user: { email: string; name: string };
  disabled: boolean;
};

export default function AdminManageUsersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const res = await api("/users/members");
      setMembers(res);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (userId: string, newRole: "ADMIN" | "USER") => {
    try {
      const res = await api(`/users/members/${userId}/role`, {
        method: "POST",
        body: JSON.stringify({ role: newRole }),
      });
      setMessage(res.message);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const toggleDisable = async (userId: string) => {
    try {
      const res = await api(`/users/members/${userId}/disable`, { method: "POST" });
      setMessage(res.message);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <section className="stack">
      <h1>Manage Users</h1>
      <HintAdminOnly/>
      {!!error && <p className="error">{error}</p>}
      {!!message && <p className="muted">{message}</p>}

      <ul className="list">
        {members.map((m) => (
          <li
            key={m.userId}
            className="item row"
            style={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <b>{m.user.name || m.user.email}</b>{" "}
              <span className="muted">
                ({m.user.email}) — {m.role}
                {m.disabled && " [DISABLED]"}
              </span>
            </div>

            <div className="row gap">
              {!m.disabled && (
                <>
                  {m.role === "USER" && (
                    <button className="btn" onClick={() => changeRole(m.userId, "ADMIN")}>
                      Promote to Admin
                    </button>
                  )}
                  {m.role === "ADMIN" && (
                    <button className="btn" onClick={() => changeRole(m.userId, "USER")}>
                      Demote to User
                    </button>
                  )}
                </>
              )}
              <button
                className={`btn ${m.disabled ? "" : "danger"}`}
                onClick={() => toggleDisable(m.userId)}
              >
                {m.disabled ? "Enable" : "Disable"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Link className="btn" href="/admin/invite">Invite User</Link>
    </section>
  );
}
