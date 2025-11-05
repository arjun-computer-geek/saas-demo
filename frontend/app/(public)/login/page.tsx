"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  const [orgId, setOrgId] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";

  const submit = async (e: any) => {
    e.preventDefault();
    try {
      await api('/auth/login', { method:'POST', body: JSON.stringify({ email, password, orgId: orgId || undefined }) });
      router.replace(next);
    } catch (e:any) { setErr(e.message); }
  };

  return (
    <section className="page center">
      <form onSubmit={submit} className="card stack">
        <h1>Sign in</h1>
        {!!err && <p className="error">{err}</p>}
        <input className="input" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <input className="input" placeholder="orgId (optional)" value={orgId} onChange={e=>setOrgId(e.target.value)} />
        <button className="btn">Login</button>
      </form>
    </section>
  );
}
