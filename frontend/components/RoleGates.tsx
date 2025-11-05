"use client";
import { ReactNode } from "react";
import { useAuth } from "@/store/auth";

export function RequireSuper({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  console.log(user, 'user...')
  if (!user?.isSuper) return <p className="muted">Super admin only.</p>;
  return <>{children}</>;
}
export function HintAdminOnly() {
  return <p className="muted">Admin-only action. Backend enforces the role.</p>;
}
