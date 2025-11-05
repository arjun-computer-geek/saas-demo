"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Org = {
  _id: string;
  name: string;
  status: "ACTIVE" | "DISABLED" | "DELETED";
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  // 🔁 Load all organizations
  const load = async () => {
    try {
      const list = await api("/orgs");
      setOrgs(list); // show all orgs including deleted
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ➕ Create org
  const create = async (e: any) => {
    e.preventDefault();
    try {
      await api("/orgs", { method: "POST", body: JSON.stringify({ name }) });
      setName("");
      setMessage("Organization created successfully!");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // 🚫 Disable org
  const disable = async (id: string) => {
    if (!confirm("Disable this organization? Users will be logged out.")) return;
    try {
      await api(`/orgs/${id}/disable`, { method: "POST" });
      setMessage("Organization disabled");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ♻️ Enable org
  const enable = async (id: string) => {
    try {
      await api(`/orgs/${id}/enable`, { method: "POST" });
      setMessage("Organization enabled");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ❌ Delete org
  const del = async (id: string) => {
    if (!confirm("Are you sure you want to delete this organization?")) return;
    try {
      await api(`/orgs/${id}`, { method: "DELETE" });
      setMessage("Organization deleted");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // 🔁 Undelete org
  const undelete = async (id: string) => {
    try {
      await api(`/orgs/${id}/undelete`, { method: "POST" });
      setMessage("Organization restored (now DISABLED)");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // 👑 Assign Admin (only for ACTIVE orgs)
  const assignAdmin = async (orgId: string) => {
    try {
      setMessage("");
      setError("");
      const res = await api("/users/super/admins/add", {
        method: "POST",
        body: JSON.stringify({ email, orgId }),
      });
      setMessage(res.message || "Admin assigned successfully!");
      setAssigning(null);
      setEmail("");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <section className="stack">
      <h1>Organizations</h1>
      {!!error && <p className="error">{error}</p>}
      {!!message && <p className="muted">{message}</p>}

      {/* ➕ Create Org */}
      <form onSubmit={create} className="row gap">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New org name"
          required
        />
        <button className="btn">Create</button>
      </form>

      <ul className="list">
        {orgs.map((o) => {
          const isActive = o.status === "ACTIVE";
          const isDisabled = o.status === "DISABLED";
          const isDeleted = o.status === "DELETED";

          return (
            <li
              key={o._id}
              className="item stack"
              style={{
                border:
                  o.status === "DELETED"
                    ? "1px solid #e55"
                    : o.status === "DISABLED"
                    ? "1px solid #e5a50a"
                    : "1px solid #4caf50",
                borderRadius: "8px",
                padding: "1rem",
              }}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <b>{o.name}</b>{" "}
                  <span
                    className={`muted ${
                      isDeleted
                        ? "text-red"
                        : isDisabled
                        ? "text-yellow"
                        : "text-green"
                    }`}
                  >
                    [{o.status}]
                  </span>
                </div>

                <div className="row gap">
                  {isActive && (
                    <>
                      <button className="btn" onClick={() => disable(o._id)}>
                        Disable
                      </button>
                      <button className="btn danger" onClick={() => del(o._id)}>
                        Delete
                      </button>
                    </>
                  )}

                  {isDisabled && (
                    <>
                      <button className="btn" onClick={() => enable(o._id)}>
                        Enable
                      </button>
                      <button className="btn danger" onClick={() => del(o._id)}>
                        Delete
                      </button>
                    </>
                  )}

                  {isDeleted && (
                    <button className="btn" onClick={() => undelete(o._id)}>
                      Undelete
                    </button>
                  )}

                  {/* Show Assign only when ACTIVE */}
                  {isActive && (
                    <button
                      className="btn"
                      onClick={() =>
                        setAssigning(assigning === o._id ? null : o._id)
                      }
                    >
                      {assigning === o._id ? "Cancel" : "Assign Admin"}
                    </button>
                  )}
                </div>
              </div>

              {/* Assign admin form (only ACTIVE) */}
              {isActive && assigning === o._id && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    assignAdmin(o._id);
                  }}
                  className="row gap"
                  style={{ marginTop: "10px" }}
                >
                  <input
                    className="input"
                    type="email"
                    placeholder="Admin email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button className="btn" type="submit">
                    Add Admin
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
