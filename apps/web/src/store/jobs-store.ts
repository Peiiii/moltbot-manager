import { create } from "zustand";

import { streamJobEvents, type JobStreamEvent } from "./job-stream";
import { useConfigStore } from "./config-store";
import { useStatusStore } from "./status-store";

export type JobStatus = "idle" | "running" | "success" | "failed";

export type JobState<T = unknown> = {
  jobId: string | null;
  status: JobStatus;
  logs: string[];
  error: string | null;
  result: T | null;
};

export type QuickstartResult = {
  gatewayReady?: boolean;
  probeOk?: boolean;
};

export type JobsState = {
  cli: JobState<{ version?: string | null }>;
  quickstart: JobState<QuickstartResult>;
  pairing: JobState<{ code?: string }>;
  resource: JobState<{ path?: string }>;
  aiAuth: JobState<{ provider?: string }>;
  startCliInstallJob: () => Promise<{ ok: boolean; error?: string }>;
  startQuickstartJob: (opts: { runProbe?: boolean; startGateway?: boolean }) => Promise<{
    ok: boolean;
    error?: string;
    result?: QuickstartResult | null;
  }>;
  startPairingJob: (code: string) => Promise<{ ok: boolean; error?: string }>;
  startResourceDownloadJob: (opts?: { url?: string; filename?: string }) => Promise<{ ok: boolean; error?: string }>;
  startAiAuthJob: (provider: string, apiKey: string) => Promise<{ ok: boolean; error?: string }>;
};

type JobKey = "cli" | "quickstart" | "pairing" | "resource" | "aiAuth";

const emptyJob = <T,>(): JobState<T> => ({
  jobId: null,
  status: "idle",
  logs: [],
  error: null,
  result: null
});

export const useJobsStore = create<JobsState>((set, get) => ({
  cli: emptyJob(),
  quickstart: emptyJob(),
  pairing: emptyJob(),
  resource: emptyJob(),
  aiAuth: emptyJob(),
  startCliInstallJob: async () => {
    return runJob(set, get, {
      jobKey: "cli",
      endpoint: "/api/jobs/cli-install",
      payload: {},
      withResult: true
    });
  },
  startQuickstartJob: async (opts) => {
    const result = await runJob(set, get, {
      jobKey: "quickstart",
      endpoint: "/api/jobs/quickstart",
      payload: {
        runProbe: Boolean(opts?.runProbe),
        startGateway: opts?.startGateway !== false
      },
      withResult: true
    });
    return {
      ok: result.ok,
      error: result.error,
      result: get().quickstart.result
    };
  },
  startPairingJob: async (code) => {
    return runJob(set, get, {
      jobKey: "pairing",
      endpoint: "/api/jobs/discord/pairing",
      payload: { code },
      withResult: false
    });
  },
  startResourceDownloadJob: async (opts) => {
    return runJob(set, get, {
      jobKey: "resource",
      endpoint: "/api/jobs/resources/download",
      payload: { url: opts?.url, filename: opts?.filename },
      withResult: true
    });
  },
  startAiAuthJob: async (provider, apiKey) => {
    return runJob(set, get, {
      jobKey: "aiAuth",
      endpoint: "/api/jobs/ai/auth",
      payload: { provider, apiKey },
      withResult: true
    });
  }
}));

type RunJobOptions = {
  jobKey: keyof JobsState;
  endpoint: string;
  payload: Record<string, unknown>;
  withResult: boolean;
};

async function runJob(
  set: (partial: Partial<JobsState> | ((state: JobsState) => Partial<JobsState>)) => void,
  get: () => JobsState,
  options: RunJobOptions
): Promise<{ ok: boolean; error?: string }> {
  const config = useConfigStore.getState();
  const statusStore = useStatusStore.getState();
  const jobKey = options.jobKey as JobKey;

  set((state) => ({
    ...state,
    [jobKey]: {
      ...state[jobKey],
      status: "running",
      logs: [],
      error: null,
      result: null,
      jobId: null
    }
  }));

  try {
    const res = await fetch(`${config.apiBase}${options.endpoint}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.authHeader ? { authorization: config.authHeader } : {})
      },
      body: JSON.stringify(options.payload)
    });
    if (!res.ok) throw new Error(`Job create failed: ${res.status}`);
    const data = (await res.json()) as { ok: boolean; jobId?: string; error?: string };
    if (!data.ok || !data.jobId) {
      throw new Error(data.error ?? "Job create failed");
    }

    set((state) => ({
      ...state,
      [jobKey]: {
        ...state[jobKey],
        jobId: data.jobId
      }
    }));

    await streamJobEvents(
      `${config.apiBase}/api/jobs/${data.jobId}/stream`,
      config.authHeader,
      (event: JobStreamEvent) => {
        set((state) => {
          const current = state[jobKey] as JobState<unknown>;
          const updated = reduceJobEvent(current, event, options.withResult);
          return {
            ...state,
            [jobKey]: updated as JobsState[JobKey]
          };
        });
      }
    );

    await statusStore.refresh();

    const resolved = get()[jobKey];
    if (resolved.status === "failed") {
      return { ok: false, error: resolved.error ?? "Job failed" };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    set((state) => ({
      ...state,
      [jobKey]: {
        ...state[jobKey],
        status: "failed",
        error: message
      }
    }));
    return { ok: false, error: message };
  }
}

function reduceJobEvent<T>(current: JobState<T>, event: JobStreamEvent, withResult: boolean): JobState<T> {
  if (event.type === "log") {
    return { ...current, logs: [...current.logs, event.message].slice(-200) };
  }
  if (event.type === "status") {
    if (event.status === "success") {
      return { ...current, status: "success" };
    }
    if (event.status === "failed") {
      return { ...current, status: "failed" };
    }
    return { ...current, status: "running" };
  }
  if (event.type === "done") {
    return {
      ...current,
      status: "success",
      result: (withResult ? (event.result as T) : current.result) ?? null
    };
  }
  if (event.type === "error") {
    return { ...current, status: "failed", error: event.error };
  }
  return current;
}
