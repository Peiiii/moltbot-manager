import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolveConfigDirCandidates } from "../lib/config.js";
import { readPid } from "../lib/pids.js";
import { commandExists, findListeningPids } from "../lib/system.js";
export function stopManager(flags) {
    const messages = [];
    const errors = [];
    let stopped = false;
    if (process.platform !== "win32" && commandExists("systemctl")) {
        const serviceName = "clawdbot-manager";
        const servicePath = `/etc/systemd/system/${serviceName}.service`;
        if (fs.existsSync(servicePath)) {
            const result = spawnSync("systemctl", ["stop", serviceName], { encoding: "utf-8" });
            if (result.status === 0) {
                messages.push("manager: stopped systemd service");
                stopped = true;
            }
        }
    }
    const candidates = resolveConfigDirCandidates(flags);
    for (const configDir of candidates) {
        const pidPath = path.join(configDir, "manager.pid");
        if (!fs.existsSync(pidPath))
            continue;
        const pid = readPid(pidPath);
        if (!pid)
            continue;
        try {
            process.kill(pid, "SIGTERM");
            fs.rmSync(pidPath, { force: true });
            messages.push(`manager: stopped pid ${pid}`);
            stopped = true;
        }
        catch (err) {
            errors.push(`manager: failed to stop pid ${pid}: ${String(err)}`);
        }
    }
    if (!stopped) {
        const port = flags.apiPort ?? Number(process.env.MANAGER_API_PORT ?? 17321);
        const pids = findListeningPids(port);
        if (pids.length) {
            for (const pid of pids) {
                try {
                    process.kill(pid, "SIGTERM");
                }
                catch (err) {
                    errors.push(`manager: failed to stop pid ${pid}: ${String(err)}`);
                }
            }
            messages.push(`manager: stopped port ${port} (pids: ${pids.join(", ")})`);
            stopped = true;
        }
    }
    if (!stopped && !errors.length) {
        messages.push("manager: not running");
    }
    if (errors.length) {
        return { ok: false, messages, error: errors.join("; ") };
    }
    return { ok: true, messages };
}
