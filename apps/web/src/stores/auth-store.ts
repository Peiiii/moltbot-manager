import { create } from "zustand";

import { useConfigStore } from "@/stores/config-store";

export type AuthState = {
  authHeader: string | null;
  setAuthHeader: (value: string | null) => void;
  clearAuth: () => void;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
};

export const useAuthStore = create<AuthState>((set) => ({
  authHeader: null,
  setAuthHeader: (value) => set({ authHeader: value }),
  clearAuth: () => set({ authHeader: null }),
  login: async (username, password) => {
    const { apiBase } = useConfigStore.getState();
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) return data;
      const authHeader = buildBasicAuth(username, password);
      set({ authHeader });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}));

function buildBasicAuth(username: string, password: string) {
  const raw = `${username}:${password}`;
  const encoded = btoa(raw);
  return `Basic ${encoded}`;
}
