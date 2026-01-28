import { create } from "zustand";

import { useConfigStore } from "./config-store";

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
    ai?: {
      configured: boolean;
      missingProviders: string[];
      error?: string | null;
    };
    probe: { ok: boolean; at: string } | null;
  };
  commands: CommandEntry[];
  processes: ProcessEntry[];
};

type StatusState = {
  status: StatusResponse | null;
  commands: CommandEntry[];
  processes: ProcessEntry[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refresh: () => Promise<void>;
  startProcess: (id: string) => Promise<void>;
  stopProcess: (id: string) => Promise<void>;
  setDiscordToken: (token: string) => Promise<{ ok: boolean; error?: string }>;
};

export const useStatusStore = create<StatusState>((set, get) => ({
  status: null,
  commands: [],
  processes: [],
  loading: false,
  error: null,
  lastUpdated: null,
  refresh: async () => {
    const config = useConfigStore.getState();
    const { apiBase, gatewayHost, gatewayPort, authHeader } = config;
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams({
        gatewayHost: gatewayHost || "127.0.0.1",
        gatewayPort: gatewayPort || "18789"
      });
      const res = await fetch(`${apiBase}/api/status?${params.toString()}`, {
        headers: authHeader ? { authorization: authHeader } : {}
      });
      if (res.status === 401) {
        config.setAuthHeader(null);
        config.setAuthState(true, false);
        set({ loading: false, error: "需要登录" });
        await config.checkAuth();
        return;
      }
      if (!res.ok) throw new Error(`Status failed: ${res.status}`);
      const data = (await res.json()) as StatusResponse;
      set({
        status: data,
        commands: data.commands,
        processes: data.processes,
        lastUpdated: data.now,
        loading: false,
        error: null
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  },
  startProcess: async (id) => {
    const config = useConfigStore.getState();
    await fetch(`${config.apiBase}/api/processes/start`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.authHeader ? { authorization: config.authHeader } : {})
      },
      body: JSON.stringify({ id })
    });
    await get().refresh();
  },
  stopProcess: async (id) => {
    const config = useConfigStore.getState();
    await fetch(`${config.apiBase}/api/processes/stop`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.authHeader ? { authorization: config.authHeader } : {})
      },
      body: JSON.stringify({ id })
    });
    await get().refresh();
  },
  setDiscordToken: async (token) => {
    const config = useConfigStore.getState();
    try {
      const res = await fetch(`${config.apiBase}/api/discord/token`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config.authHeader ? { authorization: config.authHeader } : {})
        },
        body: JSON.stringify({ token })
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      await get().refresh();
      return data;
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}));
