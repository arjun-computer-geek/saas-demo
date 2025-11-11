"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

type OrgRecord = {
  _id: string;
  name: string;
  status: "ACTIVE" | "DISABLED" | "DELETED";
};

type AdminRecord = {
  userId: string;
  email: string;
  name: string;
  orgId: string;
  orgName: string;
};

type MemberRecord = {
  userId: string;
  email: string;
  name: string;
  role: string;
  orgName: string;
};

type ToastKind = "info" | "error";
type ToastState = { type: ToastKind; message: string } | null;

const SECTIONS = [
  { id: "organizations", label: "Organizations" },
  { id: "admins", label: "Admins" },
  { id: "members", label: "Members" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

function normalizeSectionId(value: string | null): SectionId {
  if (!value) return "organizations";
  return (
    SECTIONS.find((section) => section.id === value)?.id ?? "organizations"
  ) as SectionId;
}

function SuperControlCenterContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [activeSection, setActiveSection] = useState<SectionId>(
    normalizeSectionId(params.get("tab")),
  );
  const [orgs, setOrgs] = useState<OrgRecord[]>([]);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [assignOrgId, setAssignOrgId] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const showToast = useCallback((type: ToastKind, message: string) => {
    setToast({ type, message });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const loadOrgs = useCallback(async () => {
    const list = await api("/orgs");
    setOrgs(list);
  }, []);

  const loadAdmins = useCallback(async () => {
    const list = await api("/users/super/admins");
    setAdmins(list);
  }, []);

  const loadMembers = useCallback(
    async (orgId: string) => {
      if (!orgId) {
        setMembers([]);
        return;
      }
      setLoadingMembers(true);
      try {
        const res = await api(`/users/super/members/${orgId}`);
        setMembers(res);
      } finally {
        setLoadingMembers(false);
      }
    },
    [],
  );

  useEffect(() => {
    // Preload organizations for all sections.
    loadOrgs().catch((err: any) => showToast("error", err.message));
  }, [loadOrgs, showToast]);

  useEffect(() => {
    const section = normalizeSectionId(params.get("tab"));
    setActiveSection(section);
    if (section === "admins") {
      loadAdmins().catch((err: any) => showToast("error", err.message));
    }
    if (section === "members") {
      const orgIdFromQuery = params.get("org") ?? "";
      if (orgIdFromQuery !== selectedOrg) {
        setSelectedOrg(orgIdFromQuery);
        if (orgIdFromQuery) {
          loadMembers(orgIdFromQuery).catch((err: any) => showToast("error", err.message));
        } else {
          setMembers([]);
        }
      }
    }
  }, [loadAdmins, loadMembers, params, selectedOrg, showToast]);

  const summary = useMemo(() => {
    const totals = {
      active: orgs.filter((o) => o.status === "ACTIVE").length,
      disabled: orgs.filter((o) => o.status === "DISABLED").length,
      deleted: orgs.filter((o) => o.status === "DELETED").length,
    };
    return totals;
  }, [orgs]);

  // Organization actions -----------------------------------------------------

  const createOrg = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = form.get("name");
    if (!name) return;
    try {
      await api("/orgs", { method: "POST", body: JSON.stringify({ name }) });
      formElement.reset();
      showToast("info", "Organization created");
      await loadOrgs();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const disableOrg = async (id: string) => {
    if (!confirm("Disable this organization?")) return;
    try {
      await api(`/orgs/${id}/disable`, { method: "POST" });
      showToast("info", "Organization disabled");
      await loadOrgs();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const enableOrg = async (id: string) => {
    try {
      await api(`/orgs/${id}/enable`, { method: "POST" });
      showToast("info", "Organization enabled");
      await loadOrgs();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const deleteOrg = async (id: string) => {
    if (!confirm("Delete this organization? This cannot be easily undone.")) return;
    try {
      await api(`/orgs/${id}`, { method: "DELETE" });
      showToast("info", "Organization deleted");
      await loadOrgs();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const undeleteOrg = async (id: string) => {
    try {
      await api(`/orgs/${id}/undelete`, { method: "POST" });
      showToast("info", "Organization restored (disabled)");
      await loadOrgs();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const assignAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api("/users/super/admins/add", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, orgId: assignOrgId }),
      });
      setInviteEmail("");
      showToast("info", "Admin added");
      await Promise.all([loadAdmins(), loadOrgs()]);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const changeSection = (section: SectionId) => {
    setActiveSection(section);
    const queryParts = new URLSearchParams();
    if (section !== "organizations") {
      queryParts.set("tab", section);
    }
    router.replace(`/super${queryParts.toString() ? `?${queryParts.toString()}` : ""}`, {
      scroll: false,
    });
  };

  const selectOrg = (orgId: string) => {
    setSelectedOrg(orgId);
    const query = new URLSearchParams();
    query.set("tab", "members");
    if (orgId) {
      query.set("org", orgId);
    }
    router.replace(`/super?${query.toString()}`, { scroll: false });
    if (orgId) {
      loadMembers(orgId).catch((err: any) => showToast("error", err.message));
    } else {
      setMembers([]);
    }
  };

  const removeAdmin = async (email: string, orgId: string) => {
    if (!confirm(`Remove ${email} as admin?`)) return;
    try {
      await api("/users/super/admins/remove", {
        method: "POST",
        body: JSON.stringify({ email, orgId }),
      });
      showToast("info", "Admin removed");
      await loadAdmins();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const updatePassword = async (userId: string, password: string) => {
    try {
      await api(`/users/super/members/${userId}/password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      showToast("info", "Password updated");
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  // Render helpers -----------------------------------------------------------

  const renderToast =
    toast && (
      <div
        className={`banner ${toast?.type === "error" ? "error" : "muted"}`}
        role="status"
      >
        <span>{toast?.message}</span>
        <button className="btn link" onClick={dismissToast}>
          Dismiss
        </button>
      </div>
    );

  return (
    <section className="stack">
      <header className="stack">
        <h1>Super Admin Control Center</h1>
        <p className="muted">
          Manage organizations, delegate admins, and assist members from a single screen.
        </p>
        {renderToast}
        <nav className="row gap">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              className={`btn secondary ${activeSection === section.id ? "active" : ""}`}
              onClick={() => changeSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </header>

      {activeSection === "organizations" && (
        <section className="stack">
          <h2>Organizations</h2>

          <form onSubmit={createOrg} className="row gap" aria-label="Create organization">
            <input
              className="input"
              name="name"
              placeholder="New org name"
              required
            />
            <button className="btn">Create</button>
          </form>

          <div className="row gap">
            <OverviewCard label="Active" value={summary.active} />
            <OverviewCard label="Disabled" value={summary.disabled} />
            <OverviewCard label="Deleted" value={summary.deleted} />
          </div>

          <ul className="list">
            {orgs.map((org) => (
              <li key={org._id} className="item stack">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <b>{org.name}</b>{" "}
                    <span className="muted">[{org.status}]</span>
                  </div>
                  <div className="row gap">
                    {org.status === "ACTIVE" && (
                      <>
                        <button className="btn" onClick={() => disableOrg(org._id)}>
                          Disable
                        </button>
                        <button className="btn danger" onClick={() => deleteOrg(org._id)}>
                          Delete
                        </button>
                      </>
                    )}
                    {org.status === "DISABLED" && (
                      <>
                        <button className="btn" onClick={() => enableOrg(org._id)}>
                          Enable
                        </button>
                        <button className="btn danger" onClick={() => deleteOrg(org._id)}>
                          Delete
                        </button>
                      </>
                    )}
                    {org.status === "DELETED" && (
                      <button className="btn" onClick={() => undeleteOrg(org._id)}>
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeSection === "admins" && (
        <section className="stack">
          <h2>Admins</h2>
          <form className="row wrap gap" onSubmit={assignAdmin}>
            <input
              className="input"
              type="email"
              placeholder="user@example.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              required
            />
            <select
              className="input"
              value={assignOrgId}
              onChange={(event) => setAssignOrgId(event.target.value)}
              required
            >
              <option value="">Select organization</option>
              {orgs
                .filter((org) => org.status === "ACTIVE")
                .map((org) => (
                  <option key={org._id} value={org._id}>
                    {org.name}
                  </option>
                ))}
            </select>
            <button className="btn">Add / Promote Admin</button>
          </form>

          <ul className="list">
            {admins.map((admin) => (
              <li key={`${admin.userId}-${admin.orgId}`} className="item row">
                <div>
                  <b>{admin.name || admin.email}</b> — {admin.email}
                  <div className="muted">{admin.orgName}</div>
                </div>
                <button
                  className="btn danger"
                  onClick={() => removeAdmin(admin.email, admin.orgId)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeSection === "members" && (
        <section className="stack">
          <h2>Members</h2>
          <div className="row gap">
            <select
              className="input"
              value={selectedOrg}
              onChange={(event) => selectOrg(event.target.value)}
            >
              <option value="">Select organization</option>
              {orgs.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {loadingMembers ? (
            <p className="muted">Loading members...</p>
          ) : selectedOrg ? (
            <ul className="list">
              {members.map((member) => (
                <li key={member.userId} className="item stack">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div>
                      <b>{member.name || member.email}</b> ({member.email}){" "}
                      <span className="muted">[{member.role}]</span>
                    </div>
                  </div>
                  <PasswordResetForm
                    onSubmit={(password) => updatePassword(member.userId, password)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Select an organization to view members.</p>
          )}
        </section>
      )}
    </section>
  );
}

function OverviewCard({ label, value }: { label: string; value: number }) {
  return (
    <article
      className="stack"
      style={{
        border: "1px solid var(--border-color, #e5e7eb)",
        borderRadius: "0.75rem",
        padding: "1.25rem",
        minWidth: "150px",
      }}
    >
      <span className="muted">{label}</span>
      <strong style={{ fontSize: "1.5rem" }}>{value}</strong>
    </article>
  );
}

function PasswordResetForm({
  onSubmit,
}: {
  onSubmit: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password) return;
    setBusy(true);
    try {
      await onSubmit(password);
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="row gap" onSubmit={submit}>
      <input
        className="input"
        type="password"
        placeholder="New password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        minLength={6}
        required
      />
      <button className="btn" disabled={busy}>
        {busy ? "Saving..." : "Update Password"}
      </button>
    </form>
  );
}

export default function SuperControlCenterPage() {
  return (
    <Suspense fallback={<section className="page center"><p>Loading...</p></section>}>
      <SuperControlCenterContent />
    </Suspense>
  );
}

