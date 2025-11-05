"use client";
import { useEnsureAuth } from "@/lib/authClient";
import Nav from "./Nav";

export default function PrivateShell({ children }: { children: React.ReactNode }) {
  const ready = useEnsureAuth();
  if (!ready) return <div className="page"><p>Loading…</p></div>;
  return (
    <div className="page">
      <Nav />
      <main className="container">{children}</main>
    </div>
  );
}
