import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import prompts from "prompts";
import { ensureDir, hasAdminConfig, resolveConfigPaths, writeAdminConfig } from "../lib/config.js";
import { isPidRunning, readPid } from "../lib/pids.js";
import { resolvePackageRoot } from "../lib/paths.js";
export async function startManager(flags) {
    const paths = resolveConfigPaths(flags);
    ensureDir(paths.configDir);
    ensureDir(path.dirname(paths.logPath));
    ensureDir(path.dirname(paths.errorLogPath));
    if (fs.existsSync(paths.pidPath)) {
        const pid = readPid(paths.pidPath);
        if (pid && isPidRunning(pid)) {
            console.log(`[manager] Already running (pid: ${pid}).`);
            return;
        }
    }
    const explicitUser = normalizeString(flags.user ??
        process.env.MANAGER_ADMIN_USER ??
        process.env.OPENCLAW_MANAGER_ADMIN_USER);
    const explicitPass = normalizeString(flags.pass ??
        process.env.MANAGER_ADMIN_PASS ??
        process.env.OPENCLAW_MANAGER_ADMIN_PASS);
    if (explicitUser || explicitPass) {
        if (!explicitUser || !explicitPass) {
            throw new Error("[manager] Both --user and --password are required when overriding admin config.");
        }
        writeAdminConfig(paths.configPath, explicitUser, explicitPass);
    }
    else if (!hasAdminConfig(paths.configPath)) {
        if (flags.nonInteractive || !process.stdin.isTTY) {
            throw new Error("[manager] Admin username/password is required. Use --user/--password.");
        }
        const response = await prompts([
            {
                type: "text",
                name: "username",
                message: "Admin username",
                validate: (value) => (value ? true : "Username is required")
            },
            {
                type: "password",
                name: "password",
                message: "Admin password",
                validate: (value) => (value ? true : "Password is required")
            }
        ], {
            onCancel: () => {
                throw new Error("[manager] Prompt cancelled.");
            }
        });
        const username = normalizeString(response.username);
        const password = normalizeString(response.password);
        if (!username || !password) {
            throw new Error("[manager] Admin username/password is required.");
        }
        writeAdminConfig(paths.configPath, username, password);
    }
    const pkgRoot = resolvePackageRoot();
    const apiEntry = path.join(pkgRoot, "dist", "index.js");
    const webDist = path.join(pkgRoot, "web-dist");
    if (!fs.existsSync(apiEntry) || !fs.existsSync(webDist)) {
        throw new Error("[manager] Package is missing build artifacts. Please reinstall or use a release that includes dist assets.");
    }
    const out = fs.openSync(paths.logPath, "a");
    const err = fs.openSync(paths.errorLogPath, "a");
    const child = spawn(process.execPath, [apiEntry], {
        env: {
            ...process.env,
            MANAGER_API_HOST: paths.apiHost,
            MANAGER_API_PORT: String(paths.apiPort),
            MANAGER_WEB_DIST: webDist,
            MANAGER_CONFIG_PATH: paths.configPath
        },
        detached: true,
        stdio: ["ignore", out, err]
    });
    child.unref();
    fs.writeFileSync(paths.pidPath, String(child.pid), "utf-8");
    const lanIp = resolveLanIp();
    console.log(`[manager] Started (pid: ${child.pid}).`);
    console.log(`[manager] Log: ${paths.logPath}`);
    console.log(`[manager] Error log: ${paths.errorLogPath}`);
    console.log(`[manager] Open (local): http://localhost:${paths.apiPort}`);
    console.log(`[manager] Open (local): http://127.0.0.1:${paths.apiPort}`);
    if (lanIp) {
        console.log(`[manager] Open (LAN): http://${lanIp}:${paths.apiPort}`);
    }
}
function resolveLanIp() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] ?? []) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }
    return null;
}
function normalizeString(value) {
    if (typeof value !== "string")
        return "";
    return value.trim();
}
