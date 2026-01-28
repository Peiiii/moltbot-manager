#!/usr/bin/env node
import process from "node:process";

const args = process.argv.slice(2);
const cmd = args[0];
const { flags } = parseArgs(args.slice(1));

if (!cmd || cmd === "help" || flags.help) {
  printHelp();
  process.exit(0);
}

const apiBase = resolveApiBase(flags);
const auth = resolveAuth(flags);

try {
  if (cmd === "status") {
    const query = buildQuery({
      gatewayHost: flags["gateway-host"],
      gatewayPort: flags["gateway-port"]
    });
    const data = await requestJson("GET", `${apiBase}/api/status${query}`, null, auth);
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }

  if (cmd === "login") {
    const user = flags.user ?? flags.username;
    const pass = flags.pass ?? flags.password;
    if (!user || !pass) {
      throw new Error("missing --user/--pass");
    }
    const data = await requestJson("POST", `${apiBase}/api/auth/login`, { username: user, password: pass }, null);
    if (!data.ok) {
      throw new Error(data.error ?? "login failed");
    }
    console.log("login ok");
    if (flags["print-auth"]) {
      console.log(buildBasicAuth(user, pass));
    }
    process.exit(0);
  }

  if (cmd === "quickstart") {
    const payload = {
      startGateway: flags["start-gateway"] !== false,
      runProbe: Boolean(flags["run-probe"])
    };
    await runJob(`${apiBase}/api/jobs/quickstart`, payload, auth);
    process.exit(0);
  }

  if (cmd === "probe") {
    const payload = {
      startGateway: flags["start-gateway"] !== false,
      runProbe: true
    };
    await runJob(`${apiBase}/api/jobs/quickstart`, payload, auth);
    process.exit(0);
  }

  if (cmd === "discord-token") {
    const token = flags.token ?? flags.t;
    if (!token) throw new Error("missing --token");
    const data = await requestJson(
      "POST",
      `${apiBase}/api/discord/token`,
      { token },
      auth
    );
    if (!data.ok) throw new Error(data.error ?? "discord token failed");
    console.log("discord token saved");
    process.exit(0);
  }

  if (cmd === "ai-auth") {
    const provider = flags.provider ?? flags.p;
    const apiKey = flags.key ?? flags.k;
    if (!provider || !apiKey) throw new Error("missing --provider/--key");
    await runJob(`${apiBase}/api/jobs/ai/auth`, { provider, apiKey }, auth);
    process.exit(0);
  }

  if (cmd === "pairing-approve") {
    const code = flags.code ?? flags.c;
    if (!code) throw new Error("missing --code");
    await runJob(`${apiBase}/api/jobs/discord/pairing`, { code }, auth);
    process.exit(0);
  }

  if (cmd === "gateway-start") {
    const data = await requestJson(
      "POST",
      `${apiBase}/api/processes/start`,
      { id: "gateway-run" },
      auth
    );
    if (!data.ok) throw new Error(data.error ?? "gateway start failed");
    console.log("gateway start requested");
    process.exit(0);
  }

  throw new Error(`unknown command: ${cmd}`);
} catch (err) {
  console.error(formatError(err));
  process.exit(1);
}

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const raw = arg.slice(2);
    const [key, inlineValue] = raw.split("=", 2);
    if (key.startsWith("no-")) {
      flags[key.slice(3)] = false;
      continue;
    }
    if (inlineValue !== undefined) {
      flags[key] = inlineValue;
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }
  return { flags };
}

function resolveApiBase(flags) {
  const envBase = process.env.MANAGER_API_URL ?? process.env.MANAGER_API_BASE;
  const port = process.env.MANAGER_API_PORT ?? "17321";
  const base =
    flags.api ?? flags["api-base"] ?? envBase ?? `http://127.0.0.1:${port}`;
  return base.replace(/\/+$/, "");
}

function resolveAuth(flags) {
  const user =
    flags.user ??
    flags.username ??
    process.env.MANAGER_AUTH_USER ??
    process.env.MANAGER_ADMIN_USER ??
    "";
  const pass =
    flags.pass ??
    flags.password ??
    process.env.MANAGER_AUTH_PASS ??
    process.env.MANAGER_ADMIN_PASS ??
    "";
  if (!user || !pass) return null;
  return buildBasicAuth(user, pass);
}

function buildQuery(params) {
  const entries = Object.entries(params).filter(([, value]) => Boolean(value));
  if (!entries.length) return "";
  const search = new URLSearchParams();
  for (const [key, value] of entries) {
    search.set(key, String(value));
  }
  return `?${search.toString()}`;
}

function buildBasicAuth(user, pass) {
  const raw = `${user}:${pass}`;
  const encoded = Buffer.from(raw, "utf-8").toString("base64");
  return `Basic ${encoded}`;
}

async function requestJson(method, url, body, authHeader) {
  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(authHeader ? { authorization: authHeader } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`request failed: ${res.status} ${text}`.trim());
  }
  return res.json();
}

async function runJob(url, payload, authHeader) {
  const res = await requestJson("POST", url, payload, authHeader);
  if (!res.ok || !res.jobId) {
    throw new Error(res.error ?? "job create failed");
  }
  const base = url.replace(/\/api\/jobs\/.+$/, "");
  await streamJob(`${base}/api/jobs/${res.jobId}/stream`, authHeader);
}

async function streamJob(url, authHeader) {
  const res = await fetch(url, {
    headers: authHeader ? { authorization: authHeader } : {}
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`stream failed: ${res.status} ${text}`.trim());
  }
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  let event = { type: null, data: "" };
  let failed = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) {
        if (event.type && event.data) {
          try {
            const parsed = JSON.parse(event.data);
            if (event.type === "log" && parsed?.message) {
              console.log(parsed.message);
            }
            if (event.type === "status") {
              console.log(`status: ${parsed?.status ?? "unknown"}`);
              if (parsed?.status === "failed") failed = true;
            }
            if (event.type === "error") {
              console.error(parsed?.error ?? "job error");
              failed = true;
            }
            if (event.type === "done") {
              console.log("done");
            }
          } catch (err) {
            console.error(`invalid event: ${event.data}`);
          }
        }
        event = { type: null, data: "" };
        continue;
      }
      if (line.startsWith("event:")) {
        event.type = line.slice("event:".length).trim();
        continue;
      }
      if (line.startsWith("data:")) {
        event.data = line.slice("data:".length).trim();
      }
    }
  }
  if (failed) {
    throw new Error("job failed");
  }
}

function formatError(err) {
  if (err instanceof Error) return err.message;
  return String(err);
}

function printHelp() {
  console.log(`clawdbot-manager CLI

Usage:
  node scripts/manager-cli.mjs <command> [--flags]

Commands:
  status                  Show status snapshot
  login                   Verify login (use --user/--pass)
  quickstart              Start gateway (optional --run-probe)
  probe                   Run probe (defaults to start gateway)
  discord-token           Save Discord bot token
  ai-auth                 Save AI provider key
  pairing-approve         Approve pairing code
  gateway-start           Start gateway process

Common flags:
  --api <base>            API base (default: http://127.0.0.1:17321)
  --user <user>           Auth username (or MANAGER_AUTH_USER)
  --pass <pass>           Auth password (or MANAGER_AUTH_PASS)
`);
}
