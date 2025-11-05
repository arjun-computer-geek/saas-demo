"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Org = { _id: string; name: string };
type Member = { userId: string; email: string; name: string; role: string; orgName: string };

export default function SuperMembersPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const orgList = await api("/orgs");
        setOrgs(orgList);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, []);

  const loadMembers = async (orgId: string) => {
    try {
      setLoading(true);
      const res = await api(`/users/super/members/${orgId}`);
      setMembers(res);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (userId: string) => {
    try {
      const newPass = passwords[userId];
      if (!newPass) return;
      await api(`/users/super/members/${userId}/password`, {
        method: "POST",
        body: JSON.stringify({ password: newPass }),
      });
      setMessage(`Password updated for ${userId}`);
      setPasswords((prev) => ({ ...prev, [userId]: "" }));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <section className="stack">
      <h1>Manage Organization Members</h1>
      {!!error && <p className="error">{error}</p>}
      {!!message && <p className="muted">{message}</p>}

      <div className="row gap">
        <select
          className="input"
          value={selectedOrg}
          onChange={(e) => {
            const orgId = e.target.value;
            setSelectedOrg(orgId);
            if (orgId) loadMembers(orgId);
          }}
        >
          <option value="">Select organization</option>
          {orgs.map((o) => (
            <option key={o._id} value={o._id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading members...</p>
      ) : (
        selectedOrg && (
          <ul className="list">
            {members.map((m) => (
              <li key={m.userId} className="item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <b>{m.name || m.email}</b> ({m.email}){" "}
                    <span className="muted">[{m.role}]</span>
                  </div>
                </div>
                <div className="row gap" style={{ marginTop: "10px" }}>
                  <input
                    className="input"
                    type="password"
                    placeholder="New password"
                    value={passwords[m.userId] || ""}
                    onChange={(e) =>
                      setPasswords((prev) => ({
                        ...prev,
                        [m.userId]: e.target.value,
                      }))
                    }
                  />
                  <button
                    className="btn"
                    onClick={() => changePassword(m.userId)}
                    disabled={!passwords[m.userId]}
                  >
                    Update Password
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}
