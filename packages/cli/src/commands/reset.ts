import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { CliFlags } from "../lib/types.js";
import { resolveConfigPaths } from "../lib/config.js";
import { stopAll } from "./stop-all.js";
import { listSandboxDirs, removeSandboxDir } from "../lib/sandbox.js";

export function resetManager(flags: CliFlags): { ok: boolean; messages: string[]; error?: string } {
  const messages: string[] = [];
  const errors: string[] = [];

  const stopResult = stopAll(flags);
  messages.push(...stopResult.messages);
  if (!stopResult.ok && stopResult.error) {
    messages.push(`warn: stop-all failed (${stopResult.error})`);
  }

  const configPath = resolveConfigPaths(flags);
  if (isSafeConfigDir(configPath.configDir)) {
    try {
      if (fs.existsSync(configPath.configDir)) {
        fs.rmSync(configPath.configDir, { recursive: true, force: true });
        messages.push(`config: removed (${configPath.configDir})`);
      } else {
        messages.push(`config: not found (${configPath.configDir})`);
      }
    } catch (err) {
      errors.push(`config: failed to remove (${configPath.configDir}): ${String(err)}`);
    }
  } else {
    errors.push(`config: refuse remove unsafe path (${configPath.configDir})`);
  }

  const sandboxes = listSandboxDirs();
  if (!sandboxes.length) {
    messages.push("sandbox: none");
  } else {
    for (const dir of sandboxes) {
      const result = removeSandboxDir(dir);
      if (result.ok) {
        messages.push(`sandbox: ${result.message}`);
      } else {
        errors.push(`sandbox: ${result.error ?? "remove failed"}`);
      }
    }
  }

  if (errors.length) {
    return { ok: false, messages, error: errors.join("; ") };
  }
  return { ok: true, messages };
}

function isSafeConfigDir(target: string): boolean {
  const resolved = path.resolve(target);
  const home = os.homedir();
  if (!resolved.startsWith(home)) return false;
  const base = path.basename(resolved);
  if (base.includes("openclaw-manager") || base.includes("clawdbot-manager")) {
    return true;
  }
  return (
    resolved.endsWith(".openclaw-manager") ||
    resolved.endsWith(".clawdbot-manager") ||
    resolved.includes(`${path.sep}.openclaw-manager${path.sep}`) ||
    resolved.includes(`${path.sep}.clawdbot-manager${path.sep}`)
  );
}
