import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function listSandboxDirs(): string[] {
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

export function removeSandboxDir(rootDir: string): { ok: boolean; message?: string; error?: string } {
  try {
    fs.rmSync(rootDir, { recursive: true, force: true });
    return { ok: true, message: `removed (${rootDir})` };
  } catch (err) {
    return { ok: false, error: `failed to remove ${rootDir}: ${String(err)}` };
  }
}
