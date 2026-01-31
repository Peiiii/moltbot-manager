import { spawnSync } from "node:child_process";
export function commandExists(cmd) {
    const result = spawnSync("command", ["-v", cmd], { encoding: "utf-8", shell: true });
    return result.status === 0;
}
export function findListeningPids(port) {
    if (process.platform === "win32" || !commandExists("lsof"))
        return [];
    const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
        encoding: "utf-8"
    });
    if (result.error || result.status !== 0)
        return [];
    return String(result.stdout)
        .split(/\s+/)
        .map((value) => Number(value.trim()))
        .filter((pid) => Number.isFinite(pid) && pid > 0);
}
export function listGatewayProcesses() {
    if (process.platform === "win32" || !commandExists("pgrep"))
        return [];
    const result = spawnSync("pgrep", ["-fl", "clawdbot-gateway"], { encoding: "utf-8" });
    if (result.error || result.status !== 0)
        return [];
    return String(result.stdout)
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => Number(line.split(/\s+/)[0]))
        .filter((pid) => Number.isFinite(pid) && pid > 0);
}
