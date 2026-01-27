import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CommandEntry = {
  id: string;
  title: string;
  description: string;
  command: string;
  cwd: string;
  allowRun: boolean;
};

export type ProcessEntry = {
  id: string;
  title: string;
  command: string;
  cwd: string;
  running: boolean;
  pid: number | null;
  startedAt: string | null;
  exitCode: number | null;
  lastLines: string[];
};

export type StatusResponse = {
  ok: boolean;
  now: string;
  system: {
    node: {
      current: string;
      required: string;
      ok: boolean;
    };
    platform: string;
    arch: string;
  };
  cli: {
    installed: boolean;
    path: string | null;
    version: string | null;
  };
  gateway: {
    ok: boolean;
    host: string;
    port: number;
    latencyMs: number | null;
    error: string | null;
  };
  onboarding?: {
    discord: {
      tokenConfigured: boolean;
      allowFromConfigured: boolean;
      pendingPairings: number;
    };
    probe: { ok: boolean; at: string } | null;
  };
  commands: CommandEntry[];
  processes: ProcessEntry[];
};

type OnboardingState = {
  apiBase: string;
  gatewayHost: string;
  gatewayPort: string;
  status: StatusResponse | null;
  commands: CommandEntry[];
  processes: ProcessEntry[];
  loading: boolean;
  error: string | null;
  authHeader: string | null;
  authRequired: boolean;
  authConfigured: boolean;
  lastUpdated: string | null;
  setApiBase: (value: string) => void;
  setGatewayHost: (value: string) => void;
  setGatewayPort: (value: string) => void;
  setAuthHeader: (value: string | null) => void;
  clearAuth: () => void;
  checkAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
  startProcess: (id: string) => Promise<void>;
  stopProcess: (id: string) => Promise<void>;
  installCli: () => Promise<{ ok: boolean; error?: string; version?: string | null; alreadyInstalled?: boolean }>;
  setDiscordToken: (token: string) => Promise<{ ok: boolean; error?: string }>;
  approveDiscordPairing: (code: string) => Promise<{ ok: boolean; error?: string }>;
  quickstart: (opts?: { runProbe?: boolean; startGateway?: boolean }) => Promise<{
    ok: boolean;
    error?: string;
    gatewayReady?: boolean;
    probeOk?: boolean;
  }>;
};

const DEFAULT_API_BASE =
  import.meta.env.VITE_MANAGER_API_URL ??
  import.meta.env.VITE_ONBOARDING_API_URL ??
  "http://127.0.0.1:17321";

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      apiBase: normalizeBase(DEFAULT_API_BASE),
      gatewayHost: "127.0.0.1",
      gatewayPort: "18789",
      status: null,
      commands: [],
      processes: [],
      loading: false,
      error: null,
      authHeader: null,
      authRequired: false,
      authConfigured: false,
      lastUpdated: null,
      setApiBase: (value) => set({ apiBase: normalizeBase(value) }),
      setGatewayHost: (value) => set({ gatewayHost: value.trim() }),
      setGatewayPort: (value) => set({ gatewayPort: value.trim() }),
      setAuthHeader: (value) => set({ authHeader: value }),
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
            authConfigured: false,
            error: err instanceof Error ? err.message : String(err)
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
          await get().refresh();
          return { ok: true };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
      refresh: async () => {
        const { apiBase, gatewayHost, gatewayPort, authHeader } = get();
        set({ loading: true, error: null });
        try {
          const params = new URLSearchParams({
            gatewayHost: gatewayHost || "127.0.0.1",
            gatewayPort: gatewayPort || "18789"
          });
          const res = await fetch(`${apiBase}/api/status?${params.toString()}`, {
            headers: authHeaders(authHeader)
          });
          if (res.status === 401) {
            set({ loading: false, authRequired: true, error: "需要登录" });
            await get().checkAuth();
            return;
          }
          if (!res.ok) throw new Error(`Status failed: ${res.status}`);
          const data = (await res.json()) as StatusResponse;
          set({
            status: data,
            commands: data.commands,
            processes: data.processes,
            lastUpdated: data.now,
            authRequired: false,
            loading: false
          });
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      },
      startProcess: async (id) => {
        const { apiBase, authHeader } = get();
        await fetch(`${apiBase}/api/processes/start`, {
          method: "POST",
          headers: { "content-type": "application/json", ...authHeaders(authHeader) },
          body: JSON.stringify({ id })
        });
        await get().refresh();
      },
      stopProcess: async (id) => {
        const { apiBase, authHeader } = get();
        await fetch(`${apiBase}/api/processes/stop`, {
          method: "POST",
          headers: { "content-type": "application/json", ...authHeaders(authHeader) },
          body: JSON.stringify({ id })
        });
        await get().refresh();
      },
      installCli: async () => {
        const { apiBase, authHeader } = get();
        try {
          const res = await fetch(`${apiBase}/api/cli/install`, {
            method: "POST",
            headers: { "content-type": "application/json", ...authHeaders(authHeader) },
            body: JSON.stringify({})
          });
          const data = (await res.json()) as {
            ok: boolean;
            error?: string;
            version?: string | null;
            alreadyInstalled?: boolean;
          };
          await get().refresh();
          return data;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
      setDiscordToken: async (token) => {
        const { apiBase, authHeader } = get();
        try {
          const res = await fetch(`${apiBase}/api/discord/token`, {
            method: "POST",
            headers: { "content-type": "application/json", ...authHeaders(authHeader) },
            body: JSON.stringify({ token })
          });
          const data = (await res.json()) as { ok: boolean; error?: string };
          await get().refresh();
          return data;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
      approveDiscordPairing: async (code) => {
        const { apiBase, authHeader } = get();
        try {
          const res = await fetch(`${apiBase}/api/discord/pairing`, {
            method: "POST",
            headers: { "content-type": "application/json", ...authHeaders(authHeader) },
            body: JSON.stringify({ code })
          });
          const data = (await res.json()) as { ok: boolean; error?: string };
          await get().refresh();
          return data;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
      quickstart: async (opts) => {
        const { apiBase, gatewayHost, gatewayPort, authHeader } = get();
        try {
          const res = await fetch(`${apiBase}/api/quickstart`, {
            method: "POST",
            headers: { "content-type": "application/json", ...authHeaders(authHeader) },
            body: JSON.stringify({
              runProbe: Boolean(opts?.runProbe),
              startGateway: opts?.startGateway !== false,
              gatewayHost,
              gatewayPort
            })
          });
          const data = (await res.json()) as {
            ok: boolean;
            error?: string;
            gatewayReady?: boolean;
            probeOk?: boolean;
          };
          await get().refresh();
          return data;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      }
    }),
    {
      name: "clawdbot-manager-ui"
    }
  )
);

function normalizeBase(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function authHeaders(authHeader: string | null): Record<string, string> {
  return authHeader ? { authorization: authHeader } : {};
}

function buildBasicAuth(username: string, password: string) {
  const raw = `${username}:${password}`;
  const encoded = btoa(raw);
  return `Basic ${encoded}`;
}
