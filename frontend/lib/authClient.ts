"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "@/store/auth";
import { useRouter } from "next/navigation";

export function useEnsureAuth() {
  const setAuth = useAuth(s => s.setAuth);
  const clear = useAuth(s => s.clear);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const me = await api('/auth/me');
        const { user, orgId, role } = me;
        setAuth(user, orgId ?? null, role ?? null);

        // 🔀 Redirect logic by role
        const path = window.location.pathname;

        if (user.isSuper) {
          // Super admin should never see /items, /dashboard, /admin/*
          if (!path.startsWith("/super")) {
            router.replace("/super/organizations");
          }
        } else {
          // Normal users/admins should never see /super/*
          if (path.startsWith("/super")) {
            router.replace("/dashboard");
          }
        }

      } catch (err) {
        clear();
        router.replace('/login');
      } finally {
        setReady(true);
      }
    })();
  }, [setAuth, clear, router]);

  return ready;
}
