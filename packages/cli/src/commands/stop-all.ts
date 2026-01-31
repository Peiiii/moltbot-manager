import fs from "node:fs";
import path from "node:path";
import type { CliFlags } from "../lib/types.js";
import { listGatewayProcesses } from "../lib/system.js";
import { stopManager } from "./stop.js";
import { readPid } from "../lib/pids.js";
import { listSandboxDirs } from "../lib/sandbox.js";

export function stopAll(flags: CliFlags): { ok: boolean; messages: string[]; error?: string } {
  const messages: string[] = [];
  const errors: string[] = [];

  const managerResult = stopManager(flags);
  messages.push(...managerResult.messages);
  if (!managerResult.ok && managerResult.error) errors.push(managerResult.error);

  const sandboxes = listSandboxDirs();
  if (!sandboxes.length) {
    messages.push("sandbox: none");
  } else {
    for (const rootDir of sandboxes) {
      const result = stopSandboxDir(rootDir);
      if (result.ok) {
        messages.push(`sandbox: ${result.message}`);
      } else {
        errors.push(`sandbox: ${result.error ?? "stop failed"}`);
      }
    }
  }

  const gatewayPids = listGatewayProcesses();
  if (!gatewayPids.length) {
    messages.push("gateway: none");
  } else {
    for (const pid of gatewayPids) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // ignore individual failures
      }
    }
    messages.push(`gateway: stopped (${gatewayPids.join(", ")})`);
  }

  if (errors.length) {
    return { ok: false, messages, error: errors.join("; ") };
  }
  return { ok: true, messages };
}

function stopSandboxDir(rootDir: string): { ok: boolean; message?: string; error?: string } {
  const pidFile = path.join(rootDir, "manager-api.pid");
  if (!fs.existsSync(pidFile)) {
    return { ok: true, message: `already stopped (${rootDir})` };
  }
  const pid = readPid(pidFile);
  if (!pid) {
    return { ok: true, message: `pid invalid (${rootDir})` };
  }
  try {
    process.kill(pid, "SIGTERM");
    return { ok: true, message: `stopped pid ${pid}` };
  } catch (err) {
    return { ok: false, error: `failed to stop pid ${pid}: ${String(err)}` };
  }
}
