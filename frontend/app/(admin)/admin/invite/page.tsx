"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type UserRecord = {
  _id: string;
  userId: string;
  user:{
    email:string;
    name: string;
  },
  disabled: boolean;
  role: 'USER' | 'ADMIN'
};

type InviteRecord = {
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  inviteUrl:string;
};

export default function AdminInvitePage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [userList, inviteList] = await Promise.all([
        api("/users/members"),
        api("/users/invites"),
      ]);
      setUsers(userList);
      setInvites(inviteList);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const invite = async (e: any) => {
    e.preventDefault();
    try {
      const res = await api("/users/invite", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(res.message || "Invite sent successfully!");
      setEmail("");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <section className="stack">
      <h1>Manage Organization Users</h1>

      {!!error && <p className="error">{error}</p>}
      {!!message && <p className="muted">{message}</p>}

      {/* Invite Form */}
      <form onSubmit={invite} className="row gap">
        <input
          className="input"
          type="email"
          placeholder="Enter user email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="btn">Send Invite</button>
      </form>

      <hr />

      {/* Pending Invites */}
      <h2>Pending Invites</h2>
      {invites.length === 0 ? (
        <p className="muted">No pending invites</p>
      ) : (
        <ul className="list">
  {invites.map((i) => (
    <li
      key={i.email}
      className="item stack"
      style={{ padding: "0.75rem", border: "1px solid #eee", borderRadius: "8px" }}
    >
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <b>{i.email}</b> <span className="muted">({i.role})</span>
        </div>
        <small className="muted">
          Sent: {new Date(i.createdAt).toLocaleDateString()} | Expires:{" "}
          {new Date(i.expiresAt).toLocaleDateString()}
        </small>
      </div>
      <div>
        <span className="muted">Invite Link: </span>
        <a
          href={i.inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0070f3" }}
        >
          {i.inviteUrl}
        </a>
      </div>
    </li>
  ))}
</ul>

      )}

      <hr />

      {/* Active Members */}
      <h2>Current Members</h2>
      {users.length === 0 ? (
        <p className="muted">No users found</p>
      ) : (
        <ul className="list">
          {users.map((u) => (
            <li
              key={u.userId}
              className="item row gap"
              style={{ justifyContent: "space-between" }}
            >
              <div>
                <b>{u?.user?.name  }</b> - {u?.user?.email} <span className="muted">({u.role})</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
