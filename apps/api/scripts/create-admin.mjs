import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const username = readArg("--username");
const password = readArg("--password");
const configPath = readArg("--config") ?? path.join(os.homedir(), ".clawdbot-manager", "config.json");

if (!username || !password) {
  console.error("Usage: node create-admin.mjs --username <user> --password <pass> [--config <path>]");
  process.exit(1);
}

const salt = randomBytes(16).toString("base64");
const hash = scryptSync(password, salt, 64).toString("base64");
const payload = {
  auth: {
    username,
    salt,
    hash
  },
  createdAt: new Date().toISOString()
};

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, JSON.stringify(payload, null, 2));
console.log(`[manager] admin config saved to ${configPath}`);

function readArg(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}
