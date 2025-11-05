"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams(); // ✅ get dynamic route params
  const token = params?.token as string;

  const [invite, setInvite] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await api(`/users/invite/${token}`);
        setInvite(res);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [token]);

  const accept = async (e: any) => {
    e.preventDefault();
    try {
      const res = await api(`/users/invite/${token}/accept`, {
        method: "POST",
        body: JSON.stringify({ name, password }),
      });
      setMessage(res.message);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (error) return <p className="error">{error}</p>;
  if (!invite) return <p>Loading...</p>;

  return (
    <section className="stack center">
      <h1>Join {invite.orgName}</h1>
      <p>You've been invited as a {invite.role} ({invite.email})</p>

      <form onSubmit={accept} className="stack">
        <input
          className="input"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Set a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn">Accept Invite</button>
      </form>

      {!!message && <p className="muted">{message}</p>}
    </section>
  );
}
