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

type JobStatus = "idle" | "running" | "success" | "failed";

type QuickstartResult = {
  gatewayReady?: boolean;
  probeOk?: boolean;
} | null;

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
  cliJobId: string | null;
  cliJobStatus: JobStatus;
  cliLogs: string[];
  cliJobError: string | null;
  quickstartJobId: string | null;
  quickstartJobStatus: JobStatus;
  quickstartLogs: string[];
  quickstartJobError: string | null;
  quickstartResult: QuickstartResult;
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
  startCliInstallJob: () => Promise<{ ok: boolean; error?: string }>;
  startQuickstartJob: (opts: { runProbe?: boolean; startGateway?: boolean }) => Promise<{
    ok: boolean;
    error?: string;
    result?: QuickstartResult;
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
      cliJobId: null,
      cliJobStatus: "idle",
      cliLogs: [],
      cliJobError: null,
      quickstartJobId: null,
      quickstartJobStatus: "idle",
      quickstartLogs: [],
      quickstartJobError: null,
      quickstartResult: null,
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
            set({ loading: false, authRequired: true, authHeader: null, error: "需要登录" });
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
      startCliInstallJob: async () => {
        const { apiBase, authHeader } = get();
        set({ cliJobStatus: "running", cliLogs: [], cliJobError: null, cliJobId: null });
        let finalError: string | null = null;
        try {
          const res = await fetch(`${apiBase}/api/jobs/cli-install`, {
            method: "POST",
            headers: { "content-type": "application/json", ...authHeaders(authHeader) },
            body: JSON.stringify({})
          });
          if (!res.ok) throw new Error(`Job create failed: ${res.status}`);
          const data = (await res.json()) as { ok: boolean; jobId?: string; error?: string };
          if (!data.ok || !data.jobId) {
            throw new Error(data.error ?? "Job create failed");
          }
          set({ cliJobId: data.jobId });
          await streamJobEvents(`${apiBase}/api/jobs/${data.jobId}/stream`, authHeader, (event) => {
            if (event.type === "log") {
              set((state) => ({
                cliLogs: [...state.cliLogs, event.message].slice(-200)
              }));
            } else if (event.type === "status") {
              if (event.status === "success") {
                set({ cliJobStatus: "success" });
              } else if (event.status === "failed") {
                set({ cliJobStatus: "failed" });
              } else {
                set({ cliJobStatus: "running" });
              }
            } else if (event.type === "done") {
              set({ cliJobStatus: "success" });
            } else if (event.type === "error") {
              set({ cliJobStatus: "failed", cliJobError: event.error });
              finalError = event.error;
            }
          });
          await get().refresh();
          const resolvedStatus = get().cliJobStatus;
          if (resolvedStatus === "failed") {
            return { ok: false, error: finalError ?? "Job failed" };
          }
          return { ok: true };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ cliJobStatus: "failed", cliJobError: message });
          return { ok: false, error: message };
        }
      },
      startQuickstartJob: async (opts) => {
        const { apiBase, authHeader } = get();
        set({
          quickstartJobStatus: "running",
          quickstartLogs: [],
          quickstartJobError: null,
          quickstartResult: null,
          quickstartJobId: null
        });
        let finalError: string | null = null;
        let finalResult: QuickstartResult = null;
        try {
          const res = await fetch(`${apiBase}/api/jobs/quickstart`, {
            method: "POST",
            headers: { "content-type": "application/json", ...authHeaders(authHeader) },
            body: JSON.stringify({
              runProbe: Boolean(opts?.runProbe),
              startGateway: opts?.startGateway !== false
            })
          });
          if (!res.ok) throw new Error(`Job create failed: ${res.status}`);
          const data = (await res.json()) as { ok: boolean; jobId?: string; error?: string };
          if (!data.ok || !data.jobId) {
            throw new Error(data.error ?? "Job create failed");
          }
          set({ quickstartJobId: data.jobId });
          await streamJobEvents(`${apiBase}/api/jobs/${data.jobId}/stream`, authHeader, (event) => {
            if (event.type === "log") {
              set((state) => ({
                quickstartLogs: [...state.quickstartLogs, event.message].slice(-200)
              }));
            } else if (event.type === "status") {
              if (event.status === "success") {
                set({ quickstartJobStatus: "success" });
              } else if (event.status === "failed") {
                set({ quickstartJobStatus: "failed" });
              } else {
                set({ quickstartJobStatus: "running" });
              }
            } else if (event.type === "done") {
              const result = (event.result ?? null) as QuickstartResult;
              finalResult = result;
              set({ quickstartJobStatus: "success", quickstartResult: result });
            } else if (event.type === "error") {
              finalError = event.error;
              set({ quickstartJobStatus: "failed", quickstartJobError: event.error });
            }
          });
          await get().refresh();
          const resolvedStatus = get().quickstartJobStatus;
          if (resolvedStatus === "failed") {
            return { ok: false, error: finalError ?? "Job failed" };
          }
          return { ok: true, result: finalResult };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ quickstartJobStatus: "failed", quickstartJobError: message });
          return { ok: false, error: message };
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
      name: "clawdbot-manager-ui",
      version: 2,
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
          gatewayPort: data.gatewayPort ?? "18789",
          authHeader: null
        };
      }
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

type StreamEvent =
  | { type: "log"; message: string }
  | { type: "status"; status: string }
  | { type: "done"; result?: unknown }
  | { type: "error"; error: string };

async function streamJobEvents(
  url: string,
  authHeader: string | null,
  onEvent: (event: StreamEvent) => void
) {
  const res = await fetch(url, { headers: authHeaders(authHeader) });
  if (!res.ok) {
    throw new Error(`Stream failed: ${res.status}`);
  }
  if (!res.body) {
    throw new Error("Stream unavailable");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index = buffer.indexOf("\n\n");
    while (index >= 0) {
      const chunk = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const parsed = parseSseChunk(chunk);
      if (parsed) onEvent(parsed);
      index = buffer.indexOf("\n\n");
    }
  }
}

function parseSseChunk(chunk: string): StreamEvent | null {
  const lines = chunk.split(/\r?\n/);
  let event = "message";
  let data = "";
  for (const line of lines) {
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    }
  }
  if (!data) return null;
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    if (event === "log") {
      return { type: "log", message: String(parsed.message ?? "") };
    }
    if (event === "status") {
      return { type: "status", status: String(parsed.status ?? "") };
    }
    if (event === "done") {
      return { type: "done", result: parsed.result };
    }
    if (event === "error") {
      return { type: "error", error: String(parsed.error ?? "error") };
    }
  } catch {
    return null;
  }
  return null;
}
