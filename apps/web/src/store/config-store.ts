import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_API_BASE =
  import.meta.env.VITE_MANAGER_API_URL ??
  import.meta.env.VITE_ONBOARDING_API_URL ??
  "http://127.0.0.1:17321";

export type ConfigState = {
  apiBase: string;
  gatewayHost: string;
  gatewayPort: string;
  authHeader: string | null;
  authRequired: boolean;
  authConfigured: boolean;
  setApiBase: (value: string) => void;
  setGatewayHost: (value: string) => void;
  setGatewayPort: (value: string) => void;
  setAuthHeader: (value: string | null) => void;
  setAuthState: (required: boolean, configured: boolean) => void;
  clearAuth: () => void;
  checkAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      apiBase: normalizeBase(DEFAULT_API_BASE),
      gatewayHost: "127.0.0.1",
      gatewayPort: "18789",
      authHeader: null,
      authRequired: false,
      authConfigured: false,
      setApiBase: (value) => set({ apiBase: normalizeBase(value) }),
      setGatewayHost: (value) => set({ gatewayHost: value.trim() }),
      setGatewayPort: (value) => set({ gatewayPort: value.trim() }),
      setAuthHeader: (value) => set({ authHeader: value }),
      setAuthState: (required, configured) =>
        set({ authRequired: required, authConfigured: configured }),
      clearAuth: () => set({ authHeader: null, authRequired: false, authConfigured: false }),
      checkAuth: async () => {
        const { apiBase } = get();
        try {
          const res = await fetch(`${apiBase}/api/auth/status`);
          if (!res.ok) throw new Error(`Auth status failed: ${res.status}`);
          const data = (await res.json()) as { required?: boolean; configured?: boolean };
          set({
            authRequired: Boolean(data.required),
            authConfigured: Boolean(data.configured)
          });
        } catch (err) {
          set({
            authRequired: true,
            authConfigured: false
          });
        }
      },
      login: async (username, password) => {
        const { apiBase } = get();
        try {
          const res = await fetch(`${apiBase}/api/auth/login`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ username, password })
          });
          const data = (await res.json()) as { ok: boolean; error?: string };
          if (!data.ok) return data;
          const authHeader = buildBasicAuth(username, password);
          set({ authHeader, authRequired: true, authConfigured: true });
          await get().checkAuth();
          return { ok: true };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      }
    }),
    {
      name: "clawdbot-manager-ui",
      version: 3,
      partialize: (state) => ({
        apiBase: state.apiBase,
        gatewayHost: state.gatewayHost,
        gatewayPort: state.gatewayPort
      }),
      migrate: (state) => {
        const data = (state ?? {}) as {
          apiBase?: string;
          gatewayHost?: string;
          gatewayPort?: string;
        };
        return {
          apiBase: data.apiBase ?? DEFAULT_API_BASE,
          gatewayHost: data.gatewayHost ?? "127.0.0.1",
          gatewayPort: data.gatewayPort ?? "18789"
        };
      }
    }
  )
);

function normalizeBase(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function buildBasicAuth(username: string, password: string) {
  const raw = `${username}:${password}`;
  const encoded = btoa(raw);
  return `Basic ${encoded}`;
}
