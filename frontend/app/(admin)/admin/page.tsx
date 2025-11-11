"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { HintAdminOnly } from "@/components/RoleGates";

type MemberRecord = {
  userId: string;
  role: "ADMIN" | "USER";
  user: { email: string; name: string };
  disabled: boolean;
};

type InviteRecord = {
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  inviteUrl: string;
};

type ToastKind = "info" | "error";
type ToastState = { type: ToastKind; message: string } | null;

const SECTIONS = [
  { id: "members", label: "Members" },
  { id: "invites", label: "Invites" },
  { id: "overview", label: "Overview" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function normalizeSectionId(value: string | null): SectionId {
  if (!value) return "overview";
  return (SECTIONS.find((section) => section.id === value)?.id ?? "overview") as SectionId;
}

/**
 * Unified admin management surface that consolidates the previous Users + Invite screens.
 *  - Members: promote/demote and toggle enablement.
 *  - Invites: send and track invites, plus quick copy URL.
 *  - Overview: lightweight summary.
 */
export default function AdminManagementPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialSection = normalizeSectionId(params.get("tab"));

  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(false);

  const dismissToast = useCallback(() => setToast(null), []);

  const showToast = useCallback((type: ToastKind, message: string) => {
    setToast({ type, message });
  }, []);

  const loadMembers = useCallback(async () => {
    const res = await api("/users/members");
    setMembers(res);
  }, []);

  const loadInvites = useCallback(async () => {
    const res = await api("/users/invites");
    setInvites(res);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadMembers(), loadInvites()]);
    } catch (err: any) {
      showToast("error", err.message ?? "Failed to load management data");
    } finally {
      setLoading(false);
    }
  }, [loadInvites, loadMembers, showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const changeRole = async (userId: string, newRole: "ADMIN" | "USER") => {
    try {
      const res = await api(`/users/members/${userId}/role`, {
        method: "POST",
        body: JSON.stringify({ role: newRole }),
      });
      showToast("info", res.message);
      await loadMembers();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const toggleDisable = async (userId: string) => {
    try {
      const res = await api(`/users/members/${userId}/disable`, { method: "POST" });
      showToast("info", res.message);
      await loadMembers();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const sendInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const res = await api("/users/invite", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      showToast("info", res.message || "Invite sent");
      setEmail("");
      await loadInvites();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const metrics = useMemo(() => {
    const total = members.length;
    const admins = members.filter((m) => m.role === "ADMIN").length;
    const disabled = members.filter((m) => m.disabled).length;
    return { total, admins, disabled, pendingInvites: invites.length };
  }, [invites.length, members]);

  useEffect(() => {
    const next = normalizeSectionId(params.get("tab"));
    setActiveSection(next);
  }, [params]);

  const handleSectionChange = (section: SectionId) => {
    setActiveSection(section);
    const search = section === "overview" ? "" : `?tab=${section}`;
    router.replace(`/admin${search}`, { scroll: false });
  };

  const renderHeader = (
    <header className="stack">
      <h1>Organization Management</h1>
      <HintAdminOnly />
      {toast && (
        <div
          className={`banner ${toast?.type === "error" ? "error" : "muted"}`}
          role="status"
        >
          <span>{toast?.message}</span>
          <button className="btn link" onClick={dismissToast}>
            Dismiss
          </button>
        </div>
      )}
      <nav className="row gap" aria-label="Management sections">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            className={`btn secondary ${activeSection === section.id ? "active" : ""}`}
            onClick={() => handleSectionChange(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </header>
  );

  const renderOverview = (
    <section className="stack">
      <h2>Snapshot</h2>
      {loading ? (
        <p className="muted">Loading organizational data…</p>
      ) : (
        <div className="row wrap gap">
          <OverviewCard title="Total Members" value={metrics.total} />
          <OverviewCard title="Admins" value={metrics.admins} />
          <OverviewCard title="Disabled" value={metrics.disabled} />
          <OverviewCard title="Pending Invites" value={metrics.pendingInvites} />
        </div>
      )}
    </section>
  );

  const renderMembers = (
    <section className="stack">
      <h2>Members</h2>
      {members.length === 0 ? (
        <p className="muted">No members found for this organization.</p>
      ) : (
        <ul className="list">
          {members.map((member) => (
            <li key={member.userId} className="item row">
              <div>
                <b>{member.user.name || member.user.email}</b>{" "}
                <span className="muted">
                  ({member.user.email}) — {member.role}
                  {member.disabled && " [DISABLED]"}
                </span>
              </div>
              <div className="row gap">
                {!member.disabled && (
                  <>
                    {member.role === "USER" && (
                      <button
                        className="btn"
                        onClick={() => changeRole(member.userId, "ADMIN")}
                      >
                        Promote to Admin
                      </button>
                    )}
                    {member.role === "ADMIN" && (
                      <button
                        className="btn"
                        onClick={() => changeRole(member.userId, "USER")}
                      >
                        Demote to User
                      </button>
                    )}
                  </>
                )}
                <button
                  className={`btn ${member.disabled ? "" : "danger"}`}
                  onClick={() => toggleDisable(member.userId)}
                >
                  {member.disabled ? "Enable" : "Disable"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const renderInvites = (
    <section className="stack">
      <h2>Invites</h2>

      <form onSubmit={sendInvite} className="row gap" aria-label="Invite new user">
        <input
          className="input"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button className="btn">Send Invite</button>
      </form>

      {invites.length === 0 ? (
        <p className="muted">No pending invites right now.</p>
      ) : (
        <ul className="list">
          {invites.map((invite) => (
            <li key={invite.email} className="item stack">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <b>{invite.email}</b>{" "}
                  <span className="muted">({invite.role})</span>
                </div>
                <small className="muted">
                  Sent {new Date(invite.createdAt).toLocaleDateString()} • Expires{" "}
                  {new Date(invite.expiresAt).toLocaleDateString()}
                </small>
              </div>
              <div>
                <span className="muted">Invite Link:&nbsp;</span>
                <a href={invite.inviteUrl} target="_blank" rel="noopener noreferrer">
                  {invite.inviteUrl}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <section className="stack">
      {renderHeader}
      {activeSection === "overview" && renderOverview}
      {activeSection === "members" && renderMembers}
      {activeSection === "invites" && renderInvites}
    </section>
  );
}

function OverviewCard({ title, value }: { title: string; value: number }) {
  return (
    <article
      className="stack"
      style={{
        border: "1px solid var(--border-color, #e5e7eb)",
        borderRadius: "0.75rem",
        padding: "1.25rem",
      }}
    >
      <span className="muted">{title}</span>
      <strong style={{ fontSize: "1.75rem" }}>{value}</strong>
    </article>
  );
}

