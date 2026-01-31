import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
export function resolveConfigPaths(flags) {
    const apiPort = flags.apiPort ?? Number(process.env.MANAGER_API_PORT ?? 17321);
    const apiHost = flags.apiHost ?? process.env.MANAGER_API_HOST ?? "0.0.0.0";
    const envConfigDir = process.env.MANAGER_CONFIG_DIR ?? "";
    const envConfigPath = process.env.MANAGER_CONFIG_PATH ?? "";
    let configDir = flags.configDir ?? envConfigDir;
    let configPath = flags.configPath ?? envConfigPath;
    if (!configDir && configPath) {
        configDir = path.dirname(configPath);
    }
    if (!configDir) {
        configDir = path.join(os.homedir(), ".openclaw-manager");
    }
    if (!configPath) {
        configPath = path.join(configDir, "config.json");
    }
    const logPath = flags.logPath ?? process.env.MANAGER_LOG_PATH ?? path.join(configDir, "openclaw-manager.log");
    const errorLogPath = flags.errorLogPath ??
        process.env.MANAGER_ERROR_LOG_PATH ??
        path.join(configDir, "openclaw-manager.error.log");
    return {
        apiPort,
        apiHost,
        configDir,
        configPath,
        logPath,
        errorLogPath,
        pidPath: path.join(configDir, "manager.pid")
    };
}
export function ensureDir(dir) {
    if (!dir)
        return;
    fs.mkdirSync(dir, { recursive: true });
}
export function hasAdminConfig(configPath) {
    if (!fs.existsSync(configPath))
        return false;
    try {
        const raw = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(raw);
        return Boolean(parsed?.auth?.username &&
            typeof parsed.auth.username === "string" &&
            typeof parsed.auth.salt === "string" &&
            typeof parsed.auth.hash === "string");
    }
    catch {
        return false;
    }
}
export function writeAdminConfig(configPath, username, password) {
    const salt = randomBytes(16).toString("base64");
    const hash = scryptSync(password, salt, 64).toString("base64");
    const payload = {
        auth: { username, salt, hash },
        createdAt: new Date().toISOString()
    };
    ensureDir(path.dirname(configPath));
    fs.writeFileSync(configPath, JSON.stringify(payload, null, 2));
    console.log(`[manager] Admin config saved to ${configPath}`);
}
export function resolveConfigDirCandidates(flags) {
    const explicit = flags.configDir ?? process.env.MANAGER_CONFIG_DIR;
    if (explicit)
        return [explicit];
    return [
        path.join(os.homedir(), ".openclaw-manager"),
        path.join(os.homedir(), ".clawdbot-manager")
    ];
}
