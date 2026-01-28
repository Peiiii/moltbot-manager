import type { CommandDefinition, ProcessSnapshot, StartProcessOptions } from "./lib/commands.js";
import type { CommandRunner } from "./lib/runner.js";
import type { JobEvent, JobRecord } from "./lib/jobs.js";

export type ProcessManager = {
  listProcesses: () => ProcessSnapshot[];
  startProcess: (id: string, options?: StartProcessOptions) => {
    ok: boolean;
    error?: string;
    process?: ProcessSnapshot;
  };
  stopProcess: (id: string) => { ok: boolean; error?: string; process?: ProcessSnapshot };
};

export type JobStore = {
  createJob: (title: string) => JobRecord;
  startJob: (id: string) => void;
  appendLog: (id: string, message: string) => void;
  completeJob: (id: string, result?: Record<string, unknown>) => void;
  failJob: (id: string, error: string) => void;
  getJob: (id: string) => JobRecord | null;
  subscribe: (id: string, listener: (event: JobEvent) => void) => () => void;
};

export type ApiDeps = {
  repoRoot: string;
  runCommand: CommandRunner;
  commandRegistry: CommandDefinition[];
  processManager: ProcessManager;
  jobStore: JobStore;
  auth: {
    disabled: boolean;
    allowUnconfigured: boolean;
  };
};
