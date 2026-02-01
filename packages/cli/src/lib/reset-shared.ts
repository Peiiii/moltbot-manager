import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type ResetSharedFlags = {
  dryRun?: boolean;
  keepClawdbot?: boolean;
  noStop?: boolean;
  force?: boolean;
  configDir?: string;
  configPath?: string;
  installDir?: string;
  clawdbotDir?: string;
};

export type StopAllResult = { ok: boolean; messages: string[]; error?: string };

export type ResetSharedParams = {
  flags: ResetSharedFlags;
  stopAll?: () => StopAllResult;
  sandboxDirs?: string[];
};

type ResetTarget = { label: string; path: string };

export function resetEnvironmentShared(params: ResetSharedParams): {
  ok: boolean;
  messages: string[];
  error?: string;
} {
  const messages: string[] = [];
  const errors: string[] = [];
  const flags = params.flags ?? {};

  if (!flags.noStop && params.stopAll) {
    const stopResult = params.stopAll();
    messages.push(...stopResult.messages);
    if (!stopResult.ok && stopResult.error) {
      messages.push(`warn: stop-all failed (${stopResult.error})`);
    }
  } else {
    messages.push("manager: skipped");
  }

  const targets = buildResetTargets(flags, params.sandboxDirs);
  const seen = new Set<string>();

  for (const target of targets) {
    const resolved = path.resolve(target.path);
    if (!resolved || seen.has(resolved)) continue;
    seen.add(resolved);

    if (!isSafeResetPath(resolved)) {
      errors.push(`refuse remove unsafe path (${resolved})`);
      continue;
    }
    if (!flags.force && !isExpectedResetPath(resolved)) {
      errors.push(`refuse remove ${resolved} (use --force)`);
      continue;
    }
    if (flags.dryRun) {
      messages.push(`[dry-run] ${target.label}: remove ${resolved}`);
      continue;
    }
    if (!fs.existsSync(resolved)) {
      messages.push(`${target.label}: not found (${resolved})`);
      continue;
    }
    try {
      fs.rmSync(resolved, { recursive: true, force: true });
      messages.push(`${target.label}: removed (${resolved})`);
    } catch (err) {
      errors.push(`${target.label}: failed to remove (${resolved}): ${String(err)}`);
    }
  }

  if (errors.length) {
    return { ok: false, error: errors.join("; "), messages };
  }
  return { ok: true, messages };
}

function buildResetTargets(flags: ResetSharedFlags, sandboxDirs?: string[]): ResetTarget[] {
  const configDirs = resolveConfigDirs(flags);
  const installDirs = resolveInstallDirs(flags);
  const clawdbotDir = flags.keepClawdbot ? "" : resolveClawdbotDir(flags);
  const openclawDir = resolveOpenclawDir();
  const sandboxes = sandboxDirs && sandboxDirs.length ? sandboxDirs : listSandboxDirs();

  const targets: ResetTarget[] = [
    ...configDirs.map((dir) => ({ label: "config", path: dir })),
    ...installDirs.map((dir) => ({ label: "install", path: dir })),
    ...sandboxes.map((dir) => ({ label: "sandbox", path: dir }))
  ];

  if (clawdbotDir) {
    targets.push({ label: "clawdbot", path: clawdbotDir });
  }
  if (openclawDir) {
    targets.push({ label: "openclaw", path: openclawDir });
  }

  return targets.filter((entry) => Boolean(entry.path));
}

function resolveConfigDirs(flags: ResetSharedFlags): string[] {
  const explicitDir = normalizePath(flags.configDir) ?? normalizePath(process.env.MANAGER_CONFIG_DIR);
  const explicitPath = normalizePath(flags.configPath) ?? normalizePath(process.env.MANAGER_CONFIG_PATH);

  if (explicitDir) return [explicitDir];
  if (explicitPath) return [path.dirname(explicitPath)];

  const home = os.homedir();
  if (isRootUser()) {
    return ["/etc/openclaw-manager", "/etc/clawdbot-manager"];
  }
  return [path.join(home, ".openclaw-manager"), path.join(home, ".clawdbot-manager")];
}

function resolveInstallDirs(flags: ResetSharedFlags): string[] {
  const explicit = normalizePath(flags.installDir) ?? normalizePath(process.env.MANAGER_INSTALL_DIR);
  if (explicit) return [explicit];
  const home = os.homedir();
  if (isRootUser()) {
    return ["/opt/openclaw-manager", "/opt/clawdbot-manager"];
  }
  return [path.join(home, "openclaw-manager"), path.join(home, "clawdbot-manager")];
}

function resolveClawdbotDir(flags: ResetSharedFlags): string {
  const explicit = normalizePath(flags.clawdbotDir) ?? normalizePath(process.env.CLAWDBOT_DIR);
  if (explicit) return explicit;
  return path.join(os.homedir(), ".clawdbot");
}

function resolveOpenclawDir(): string {
  const explicit =
    normalizePath(process.env.OPENCLAW_STATE_DIR) ?? normalizePath(process.env.CLAWDBOT_STATE_DIR);
  if (explicit) return explicit;
  return path.join(os.homedir(), ".openclaw");
}

function listSandboxDirs(): string[] {
  const dir = os.tmpdir();
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => {
      return (
        entry.isDirectory() &&
        (entry.name.startsWith("openclaw-manager-sandbox-") ||
          entry.name.startsWith("clawdbot-manager-sandbox-"))
      );
    })
    .map((entry) => path.join(dir, entry.name));
}

function isSafeResetPath(resolved: string): boolean {
  if (!resolved) return false;
  const blocked = new Set([path.resolve("/"), path.resolve(os.homedir()), path.resolve(os.tmpdir())]);
  return !blocked.has(path.resolve(resolved));
}

function isExpectedResetPath(resolved: string): boolean {
  const normalized = resolved.replace(/\\/g, "/");
  return (
    normalized.includes("/openclaw-manager") ||
    normalized.includes("/.openclaw-manager") ||
    normalized.includes("/clawdbot-manager") ||
    normalized.includes("/.clawdbot-manager") ||
    normalized.includes("/.clawdbot") ||
    normalized.includes("/.openclaw")
  );
}

function normalizePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isRootUser(): boolean {
  return typeof process.getuid === "function" && process.getuid() === 0;
}
