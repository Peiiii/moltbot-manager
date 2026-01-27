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
  lastUpdated: string | null;
  setApiBase: (value: string) => void;
  setGatewayHost: (value: string) => void;
  setGatewayPort: (value: string) => void;
  refresh: () => Promise<void>;
  startProcess: (id: string) => Promise<void>;
  stopProcess: (id: string) => Promise<void>;
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
      lastUpdated: null,
      setApiBase: (value) => set({ apiBase: normalizeBase(value) }),
      setGatewayHost: (value) => set({ gatewayHost: value.trim() }),
      setGatewayPort: (value) => set({ gatewayPort: value.trim() }),
      refresh: async () => {
        const { apiBase, gatewayHost, gatewayPort } = get();
        set({ loading: true, error: null });
        try {
          const params = new URLSearchParams({
            gatewayHost: gatewayHost || "127.0.0.1",
            gatewayPort: gatewayPort || "18789"
          });
          const res = await fetch(`${apiBase}/api/status?${params.toString()}`);
          if (!res.ok) throw new Error(`Status failed: ${res.status}`);
          const data = (await res.json()) as StatusResponse;
          set({
            status: data,
            commands: data.commands,
            processes: data.processes,
            lastUpdated: data.now,
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
        const { apiBase } = get();
        await fetch(`${apiBase}/api/processes/start`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id })
        });
        await get().refresh();
      },
      stopProcess: async (id) => {
        const { apiBase } = get();
        await fetch(`${apiBase}/api/processes/stop`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id })
        });
        await get().refresh();
      },
      setDiscordToken: async (token) => {
        const { apiBase } = get();
        try {
          const res = await fetch(`${apiBase}/api/discord/token`, {
            method: "POST",
            headers: { "content-type": "application/json" },
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
        const { apiBase } = get();
        try {
          const res = await fetch(`${apiBase}/api/discord/pairing`, {
            method: "POST",
            headers: { "content-type": "application/json" },
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
        const { apiBase, gatewayHost, gatewayPort } = get();
        try {
          const res = await fetch(`${apiBase}/api/quickstart`, {
            method: "POST",
            headers: { "content-type": "application/json" },
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
