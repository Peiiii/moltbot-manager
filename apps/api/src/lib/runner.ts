import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type CommandRunner = (
  cmd: string,
  args: string[],
  timeoutMs: number,
  env?: NodeJS.ProcessEnv
) => Promise<string>;

export function createCommandRunner(repoRoot: string): CommandRunner {
  return (cmd, args, timeoutMs, env = process.env) =>
    runCommand(cmd, args, timeoutMs, { cwd: repoRoot, env });
}

export function findOnPath(binary: string): string | null {
  const envPath = process.env.PATH ?? "";
  const entries = envPath.split(path.delimiter).filter(Boolean);

  for (const entry of entries) {
    const candidate = path.join(entry, binary);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

type StreamCommandOptions = {
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  onLog: (line: string) => void;
};

export function runCommandWithLogs(
  cmd: string,
  args: string[],
  options: StreamCommandOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: options.env,
      detached: process.platform !== "win32"
    });

    let stdoutBuffer = "";
    let stderrBuffer = "";
    let timedOut = false;

    const flushLines = (buffer: string, prefix?: string) => {
      const lines = buffer.split(/\r?\n/);
      const rest = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trimEnd();
        if (trimmed) {
          options.onLog(prefix ? `${prefix}${trimmed}` : trimmed);
        }
      }
      return rest;
    };

    const timer = setTimeout(() => {
      timedOut = true;
      terminateProcessTree(child);
      reject(new Error("timeout"));
    }, options.timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      stdoutBuffer = flushLines(stdoutBuffer);
    });

    child.stderr?.on("data", (chunk) => {
      stderrBuffer += chunk.toString();
      stderrBuffer = flushLines(stderrBuffer, "stderr: ");
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (stdoutBuffer.trim()) {
        options.onLog(stdoutBuffer.trimEnd());
      }
      if (stderrBuffer.trim()) {
        options.onLog(`stderr: ${stderrBuffer.trimEnd()}`);
      }
      if (code === 0) resolve();
      else {
        if (timedOut) return;
        reject(new Error(`exit ${code ?? "unknown"}`));
      }
    });
  });
}

function runCommand(
  cmd: string,
  args: string[],
  timeoutMs: number,
  options: { cwd: string; env: NodeJS.ProcessEnv }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: options.env,
      detached: process.platform !== "win32"
    });

    let output = "";
    let error = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      terminateProcessTree(child);
      reject(new Error("timeout"));
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      error += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(output);
      else {
        if (timedOut) return;
        reject(new Error(error || output));
      }
    });
  });
}

function terminateProcessTree(child: ChildProcess) {
  const pid = child.pid;
  if (!pid) return;
  if (process.platform !== "win32") {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      // ignore and fall back
    }
  }
  try {
    child.kill("SIGTERM");
  } catch {
    // ignore kill errors
  }
  if (process.platform !== "win32") {
    setTimeout(() => {
      try {
        process.kill(-pid, "SIGKILL");
      } catch {
        // ignore
      }
    }, 2000);
  }
}
