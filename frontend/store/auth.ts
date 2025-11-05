import { create } from "zustand";

type AuthState = {
  user: any | null;
  orgId: string | null;
  role: "ADMIN" | "USER" | null;
  setAuth: (user: any, orgId: string | null, role?: "ADMIN" | "USER" | null) => void;
  clear: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  orgId: null,
  role: null,
  setAuth: (user, orgId, role = null) => set({ user, orgId, role }),
  clear: () => set({ user: null, orgId: null, role: null }),
}));
