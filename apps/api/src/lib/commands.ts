import { spawn } from "node:child_process";

export type CommandDefinition = {
  id: string;
  title: string;
  description: string;
  command: string;
  args: string[];
  cwd: string;
  allowRun: boolean;
};

export type ProcessSnapshot = {
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

export type StartProcessOptions = {
  args?: string[];
  env?: NodeJS.ProcessEnv;
  onLog?: (line: string) => void;
};

type ManagedProcess = {
  def: CommandDefinition;
  args: string[];
  child: ReturnType<typeof spawn> | null;
  logs: string[];
  startedAt: Date | null;
  exitCode: number | null;
};

export function buildCommandRegistry(root: string): CommandDefinition[] {
  return [
    {
      id: "install-cli",
      title: "Install Clawdbot CLI",
      description: "Install the latest Clawdbot CLI (may require sudo)",
      command: "npm",
      args: ["i", "-g", "clawdbot@latest"],
      cwd: root,
      allowRun: true
    },
    {
      id: "gateway-run",
      title: "Start gateway",
      description: "Run the local gateway (loopback only)",
      command: "clawdbot",
      args: ["gateway", "run", "--allow-unconfigured", "--bind", "loopback", "--port", "18789", "--force"],
      cwd: root,
      allowRun: true
    },
    {
      id: "channels-probe",
      title: "Probe channels",
      description: "Check channel connectivity",
      command: "clawdbot",
      args: ["channels", "status", "--probe"],
      cwd: root,
      allowRun: true
    }
  ];
}

export function createProcessManager(commandRegistry: CommandDefinition[]) {
  const processRegistry = new Map<string, ManagedProcess>();

  const listProcesses = (): ProcessSnapshot[] => {
    return commandRegistry.map((cmd) => {
      const managed = processRegistry.get(cmd.id);
      return snapshotProcess(cmd, managed ?? null);
    });
  };

  const startProcess = (id: string, options?: StartProcessOptions) => {
    const def = commandRegistry.find((cmd) => cmd.id === id);
    if (!def) return { ok: false, error: "unknown id" } as const;
    if (!def.allowRun) return { ok: false, error: "not allowed" } as const;

    const existing = processRegistry.get(id);
    if (existing?.child && !existing.child.killed) {
      return { ok: true, process: snapshotProcess(def, existing) } as const;
    }

    const args = options?.args ?? def.args;
    const child = spawn(def.command, args, {
      cwd: def.cwd,
      env: options?.env ?? process.env
    });

    const managed: ManagedProcess = {
      def,
      args,
      child,
      logs: [],
      startedAt: new Date(),
      exitCode: null
    };

    processRegistry.set(id, managed);

    const pushLog = (chunk: string) => {
      const lines = chunk.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return;
      const clipped = lines.map((line) => line.slice(0, 1000));
      managed.logs.push(...clipped);
      for (const line of clipped) {
        options?.onLog?.(line);
      }
      if (managed.logs.length > 200) {
        managed.logs.splice(0, managed.logs.length - 200);
      }
    };

    child.stdout?.on("data", (chunk) => pushLog(chunk.toString()));
    child.stderr?.on("data", (chunk) => pushLog(chunk.toString()));

    child.on("close", (code) => {
      managed.exitCode = code ?? null;
    });

    return { ok: true, process: snapshotProcess(def, managed) } as const;
  };

  const stopProcess = (id: string) => {
    const def = commandRegistry.find((cmd) => cmd.id === id);
    if (!def) return { ok: false, error: "unknown id" } as const;

    const managed = processRegistry.get(id);
    if (!managed?.child) {
      return { ok: true, process: snapshotProcess(def, managed ?? null) } as const;
    }

    managed.child.kill("SIGTERM");

    setTimeout(() => {
      if (managed.child && !managed.child.killed) {
        managed.child.kill("SIGKILL");
      }
    }, 2000);

    return { ok: true, process: snapshotProcess(def, managed) } as const;
  };

  return { listProcesses, startProcess, stopProcess };
}

function snapshotProcess(def: CommandDefinition, managed: ManagedProcess | null): ProcessSnapshot {
  const running = Boolean(managed?.child && !managed.child.killed);
  return {
    id: def.id,
    title: def.title,
    command: formatCommand(def, managed?.args),
    cwd: def.cwd,
    running,
    pid: managed?.child?.pid ?? null,
    startedAt: managed?.startedAt?.toISOString() ?? null,
    exitCode: managed?.exitCode ?? null,
    lastLines: managed?.logs.slice(-20) ?? []
  };
}

function formatCommand(cmd: CommandDefinition, argsOverride?: string[]) {
  return [cmd.command, ...(argsOverride ?? cmd.args)].join(" ");
}
