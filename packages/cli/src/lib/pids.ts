import fs from "node:fs";

export function readPid(pidPath: string): number | null {
  try {
    const raw = fs.readFileSync(pidPath, "utf-8").trim();
    const pid = Number(raw);
    if (!Number.isFinite(pid) || pid <= 0) return null;
    return pid;
  } catch {
    return null;
  }
}

export function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
