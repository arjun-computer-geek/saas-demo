"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type AdminRecord = {
  userId: string;
  email: string;
  name: string;
  orgId: string;
  orgName: string;
};

export default function SuperAdminsPage() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [email, setEmail] = useState("");
  const [orgId, setOrgId] = useState("");
  const [orgs, setOrgs] = useState<{ _id: string; name: string }[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const list = await api("/users/super/admins");
      setAdmins(list);
      const allOrgs = await api("/orgs");
      setOrgs(allOrgs);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const promote = async (e: any) => {
    e.preventDefault();
    try {
      const res = await api("/users/super/admins/add", {
        method: "POST",
        body: JSON.stringify({ email, orgId }),
      });
      setMessage(res.message);
      setEmail("");
      setOrgId("");
      setError("");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const demote = async (email: string, orgId: string) => {
    try {
      const res = await api("/users/super/admins/remove", {
        method: "POST",
        body: JSON.stringify({ email, orgId }),
      });
      setMessage(res.message);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <section className="stack">
      <h1>Manage Admins</h1>

      {!!error && <p className="error">{error}</p>}
      {!!message && <p className="muted">{message}</p>}

      <form onSubmit={promote} className="row gap">
        <input
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="User email"
          required
        />
        <select
          className="input"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          required
        >
          <option value="">Select organization</option>
          {orgs.map((o) => (
            <option key={o._id} value={o._id}>
              {o.name}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          Add / Promote Admin
        </button>
      </form>

      <hr />

      <h2>Existing Admins</h2>
      <ul className="list">
        {admins.map((a) => (
          <li key={a.userId + a.orgId} className="item">
            <div>
              <b>{a.name || a.email}</b> — {a.email}
              <div className="muted">{a.orgName}</div>
            </div>
            <button
              className="btn danger"
              onClick={() => demote(a.email, a.orgId)}
            >
              Remove Admin
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
