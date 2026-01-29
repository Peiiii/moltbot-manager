#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const cmd = args[0];
const { flags } = parseArgs(args.slice(1));
const configPath = resolveConfigPath(flags);
const config = await loadTomlConfigOptional(configPath);

if (!cmd || cmd === "help" || flags.help) {
  printHelp();
  process.exit(0);
}

const nonInteractive = isNonInteractive(flags);
const apiBase = resolveApiBase(flags, config);

try {
  if (cmd === "status") {
    const auth = await resolveAuthHeader({ flags, config, nonInteractive });
    const gateway = resolveGatewayOverrides(flags, config);
    const query = buildQuery({
      gatewayHost: gateway.host,
      gatewayPort: gateway.port
    });
    const data = await requestJson("GET", `${apiBase}/api/status${query}`, null, auth);
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }

  if (cmd === "ps") {
    const snapshot = buildProcessSnapshot({ flags, config });
    printProcessSnapshot(snapshot);
    process.exit(0);
  }

  if (cmd === "stop-all") {
    const result = stopAll({ flags, config });
    for (const line of result.messages) {
      console.log(line);
    }
    if (!result.ok) throw new Error(result.error ?? "stop-all failed");
    process.exit(0);
  }

  if (cmd === "reset") {
    const result = resetEnvironment({ flags, config });
    for (const line of result.messages) {
      console.log(line);
    }
    if (!result.ok) throw new Error(result.error ?? "reset failed");
    process.exit(0);
  }

  if (cmd === "sandbox") {
    const result = await createSandbox({ flags, nonInteractive });
    printSandboxSummary(result, { printEnv: Boolean(flags["print-env"]) });
    process.exit(0);
  }

  if (cmd === "verify") {
    const result = await runSandboxVerify({ flags, config, nonInteractive });
    printSandboxSummary(result, { printEnv: Boolean(flags["print-env"]) });
    process.exit(0);
  }

  if (cmd === "sandbox-stop") {
    const result = stopSandbox({ flags });
    if (!result.ok) throw new Error(result.error ?? "sandbox stop failed");
    console.log(result.message);
    process.exit(0);
  }

  if (cmd === "apply") {
    const loaded = await loadTomlConfigRequired(configPath);
    const auth = await resolveAuthHeader({ flags, config: loaded, nonInteractive });
    const targetApi = resolveApiBase(flags, loaded);
    await applyConfig(loaded, targetApi, auth, { nonInteractive });
    process.exit(0);
  }

  if (cmd === "login") {
    const credentials = await resolveAdminCredentialsInteractive({
      flags,
      config,
      nonInteractive
    });
    const user = credentials.user;
    const pass = credentials.pass;
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
    const auth = await resolveAuthHeader({ flags, config, nonInteractive });
    const gateway = resolveGatewayOverrides(flags, config);
    const payload = {
      startGateway: flags["start-gateway"] !== false,
      runProbe: Boolean(flags["run-probe"]),
      ...(gateway.host ? { gatewayHost: gateway.host } : {}),
      ...(gateway.port ? { gatewayPort: gateway.port } : {})
    };
    await runJob(`${apiBase}/api/jobs/quickstart`, payload, auth);
    process.exit(0);
  }

  if (cmd === "probe") {
    const auth = await resolveAuthHeader({ flags, config, nonInteractive });
    const gateway = resolveGatewayOverrides(flags, config);
    const payload = {
      startGateway: flags["start-gateway"] !== false,
      runProbe: true,
      ...(gateway.host ? { gatewayHost: gateway.host } : {}),
      ...(gateway.port ? { gatewayPort: gateway.port } : {})
    };
    await runJob(`${apiBase}/api/jobs/quickstart`, payload, auth);
    process.exit(0);
  }

  if (cmd === "discord-token") {
    const auth = await resolveAuthHeader({ flags, config, nonInteractive });
    const token = await resolveRequiredString({
      value: flags.token ?? flags.t ?? config?.discord?.token,
      message: "Discord bot token",
      nonInteractive
    });
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
    const auth = await resolveAuthHeader({ flags, config, nonInteractive });
    const provider = await resolveRequiredString({
      value: flags.provider ?? flags.p ?? config?.ai?.provider,
      message: "AI provider",
      nonInteractive
    });
    const apiKey = await resolveRequiredString({
      value: flags.key ?? flags.k ?? config?.ai?.key,
      message: "AI API key",
      nonInteractive
    });
    await runJob(`${apiBase}/api/jobs/ai/auth`, { provider, apiKey }, auth);
    process.exit(0);
  }

  if (cmd === "pairing-approve") {
    const auth = await resolveAuthHeader({ flags, config, nonInteractive });
    const code = await resolvePairingCode({
      flags,
      config,
      nonInteractive
    });
    const continueAfter = Boolean(flags.continue || flags["run-probe"]);
    await runJob(`${apiBase}/api/jobs/discord/pairing`, { code }, auth);
    if (continueAfter) {
      const gateway = resolveGatewayOverrides(flags, config);
      await runProbeJob(apiBase, auth, {
        gatewayHost: gateway.host,
        gatewayPort: gateway.port
      });
    }
    process.exit(0);
  }

  if (cmd === "pairing-prompt") {
    ensureInteractive(nonInteractive);
    const auth = await resolveAuthHeader({ flags, config, nonInteractive });
    const continueAfter = Boolean(flags.continue || flags["run-probe"]);
    const code = await promptForValue({
      message: "请输入配对码并回车确认（留空取消）：",
      normalize: (value) => value.toUpperCase()
    });
    if (!code) throw new Error("missing pairing code");
    await runJob(`${apiBase}/api/jobs/discord/pairing`, { code }, auth);
    if (continueAfter) {
      const gateway = resolveGatewayOverrides(flags, config);
      await runProbeJob(apiBase, auth, {
        gatewayHost: gateway.host,
        gatewayPort: gateway.port
      });
    }
    process.exit(0);
  }

  if (cmd === "pairing-wait") {
    const auth = await resolveAuthHeader({ flags, config, nonInteractive });
    const timeoutMs = parseNumberFlag(
      flags.timeout ?? flags["timeout-ms"] ?? config?.pairing?.timeoutMs ?? config?.pairing?.timeout
    );
    const pollMs = parseNumberFlag(
      flags.poll ?? flags["poll-ms"] ?? config?.pairing?.pollMs ?? config?.pairing?.poll
    );
    const notify = Boolean(flags.notify ?? config?.pairing?.notify);
    const payload = {};
    if (timeoutMs) payload.timeoutMs = timeoutMs;
    if (pollMs) payload.pollMs = pollMs;
    if (notify) payload.notify = true;
    await runJob(`${apiBase}/api/jobs/discord/pairing/wait`, payload, auth);
    process.exit(0);
  }

  if (cmd === "gateway-start") {
    const auth = await resolveAuthHeader({ flags, config, nonInteractive });
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

  if (cmd === "gateway-stop") {
    const auth = await resolveAuthHeader({ flags, config, nonInteractive });
    const id = typeof flags.id === "string" && flags.id.trim() ? flags.id.trim() : "gateway-run";
    const data = await requestJson(
      "POST",
      `${apiBase}/api/processes/stop`,
      { id },
      auth
    );
    if (!data.ok) throw new Error(data.error ?? "gateway stop failed");
    console.log(`gateway stop requested (${id})`);
    process.exit(0);
  }

  if (cmd === "server-stop") {
    const result = stopManagerService({ flags });
    if (!result.ok) throw new Error(result.error ?? "server stop failed");
    console.log(result.message);
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
    if (!arg.startsWith("-")) continue;
    const isLong = arg.startsWith("--");
    const raw = arg.slice(isLong ? 2 : 1);
    if (!raw) continue;
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

function resolveConfigPath(flags) {
  const candidate =
    flags.config ??
    flags.c ??
    process.env.MANAGER_CONFIG ??
    process.env.MANAGER_CONFIG_PATH ??
    "manager.toml";
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : "manager.toml";
}

function resolveApiBase(flags, config) {
  const envBase = process.env.MANAGER_API_URL ?? process.env.MANAGER_API_BASE;
  const port = process.env.MANAGER_API_PORT ?? "17321";
  const configBase = resolveApiBaseFromConfig(config);
  const base =
    flags.api ?? flags["api-base"] ?? configBase ?? envBase ?? `http://127.0.0.1:${port}`;
  return base.replace(/\/+$/, "");
}

function resolveApiBaseFromConfig(config) {
  const api = config?.api ?? {};
  const base = api.base ?? api.url;
  if (!base || typeof base !== "string") return null;
  return base.replace(/\/+$/, "");
}

function resolveAdminCredentials(params) {
  const user =
    params.flags.user ??
    params.flags.username ??
    params.config?.admin?.user ??
    process.env.MANAGER_AUTH_USER ??
    process.env.MANAGER_ADMIN_USER ??
    "";
  const pass =
    params.flags.pass ??
    params.flags.password ??
    params.config?.admin?.pass ??
    process.env.MANAGER_AUTH_PASS ??
    process.env.MANAGER_ADMIN_PASS ??
    "";
  return {
    user: typeof user === "string" ? user.trim() : "",
    pass: typeof pass === "string" ? pass : ""
  };
}

async function resolveAuthHeader(params) {
  const base = resolveAdminCredentials(params);
  const user = base.user
    ? base.user
    : await resolveRequiredString({
        value: "",
        message: "管理员用户名",
        nonInteractive: params.nonInteractive
      });
  const pass = base.pass
    ? base.pass
    : await resolveRequiredString({
        value: "",
        message: "管理员密码",
        nonInteractive: params.nonInteractive
      });
  return buildBasicAuth(user, pass);
}

async function resolveAdminCredentialsInteractive(params) {
  const base = resolveAdminCredentials(params);
  const user = base.user
    ? base.user
    : await resolveRequiredString({
        value: "",
        message: "管理员用户名",
        nonInteractive: params.nonInteractive
      });
  const pass = base.pass
    ? base.pass
    : await resolveRequiredString({
        value: "",
        message: "管理员密码",
        nonInteractive: params.nonInteractive
      });
  return { user, pass };
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
  const streamUrl = `${base}/api/jobs/${res.jobId}/stream`;
  const statusUrl = `${base}/api/jobs/${res.jobId}`;
  await streamJobWithFallback(streamUrl, statusUrl, authHeader);
}

function resolveGatewayOverrides(flags, config) {
  const host = flags["gateway-host"] ?? config?.gateway?.host ?? null;
  const portValue = flags["gateway-port"] ?? config?.gateway?.port ?? null;
  return {
    host: typeof host === "string" ? host.trim() : null,
    port: parseNumberFlag(portValue)
  };
}

async function resolveRequiredString(params) {
  const trimmed = typeof params.value === "string" ? params.value.trim() : "";
  if (trimmed) return trimmed;
  if (params.nonInteractive) {
    throw new Error(`missing ${params.message}`);
  }
  const input = await promptForValue({
    message: `${params.message}：`,
    normalize: (value) => value
  });
  const normalized = input.trim();
  if (!normalized) {
    throw new Error(`missing ${params.message}`);
  }
  return normalized;
}

async function resolvePairingCode(params) {
  const raw =
    params.flags.code ??
    params.flags.c ??
    (Array.isArray(params.config?.pairing?.codes) && params.config.pairing.codes.length === 1
      ? params.config.pairing.codes[0]
      : null);
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().toUpperCase();
  }
  if (params.nonInteractive) {
    throw new Error("missing --code (or pairing.codes in config)");
  }
  const hint = Array.isArray(params.config?.pairing?.codes)
    ? `候选：${params.config.pairing.codes.join(", ")}`
    : "";
  const code = await promptForValue({
    message: `请输入配对码并回车确认（留空取消）${hint ? `（${hint}）` : ""}：`,
    normalize: (value) => value.toUpperCase()
  });
  if (!code) throw new Error("missing pairing code");
  return code;
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

async function streamJobWithFallback(streamUrl, statusUrl, authHeader) {
  try {
    await streamJob(streamUrl, authHeader);
    return;
  } catch (err) {
    const message = formatError(err);
    if (!message.includes("stream failed: 404")) throw err;
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await sleep(300);
    try {
      await streamJob(streamUrl, authHeader);
      return;
    } catch (err) {
      const message = formatError(err);
      if (!message.includes("stream failed: 404")) throw err;
    }
  }

  await pollJobStatus(statusUrl, authHeader, { timeoutMs: 60_000, intervalMs: 1000 });
}

async function pollJobStatus(statusUrl, authHeader, options) {
  const deadline = Date.now() + options.timeoutMs;
  let offset = 0;
  while (Date.now() < deadline) {
    const data = await requestJson("GET", statusUrl, null, authHeader);
    if (!data.ok || !data.job) {
      throw new Error(data.error ?? "job status failed");
    }
    const job = data.job;
    const logs = Array.isArray(job.logs) ? job.logs : [];
    for (let i = offset; i < logs.length; i += 1) {
      console.log(logs[i]);
    }
    offset = logs.length;
    if (job.status === "failed") {
      throw new Error(job.error ?? "job failed");
    }
    if (job.status === "success") {
      console.log("done");
      return;
    }
    await sleep(options.intervalMs);
  }
  throw new Error("job poll timeout");
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
  ps                      Show running manager/gateway instances
  stop-all                Stop manager, sandboxes, and gateway processes
  reset                   Stop services and clear local data for re-validation
  sandbox                 Prepare an isolated sandbox for quick validation
  verify                  One-shot sandbox + apply for quick validation
  sandbox-stop            Stop sandbox API process
  apply                   Run steps from a TOML config
  login                   Verify login (use --user/--pass)
  quickstart              Start gateway (optional --run-probe)
  probe                   Run probe (defaults to start gateway)
  discord-token           Save Discord bot token
  ai-auth                 Save AI provider key
  pairing-approve         Approve pairing code
  pairing-prompt          Prompt for pairing code in CLI
  pairing-wait            Wait for a pairing request and approve
  gateway-start           Start gateway process
  gateway-stop            Stop gateway process
  server-stop             Stop manager API service

Flags:
  --api <base>            API base (default: http://127.0.0.1:17321)
  --config <path>         TOML config path (default: manager.toml)
  --user <user>           Auth username (or MANAGER_AUTH_USER)
  --pass <pass>           Auth password (or MANAGER_AUTH_PASS)
  --non-interactive       Disable prompts (or MANAGER_NON_INTERACTIVE=1)
  --api-port <port>       API port override (sandbox/ps/server-stop)
  --dry-run               Print stop-all targets without stopping (stop-all only)
  --no-manager            Skip stopping manager (stop-all only)
  --no-sandboxes          Skip stopping sandboxes (stop-all only)
  --no-gateway            Skip stopping gateway processes (stop-all only)
  --keep-clawdbot         Keep ~/.clawdbot data (reset only)
  --no-stop               Skip stopping services (reset only)
  --force                 Allow removing non-default paths (reset only)
  --dir <path>            Sandbox directory (sandbox only)
  --gateway-port <port>   Sandbox gateway port (sandbox only)
  --no-start              Do not start API server (sandbox only)
  --print-env             Print export statements (sandbox only)
  --no-apply              Skip apply in verify (verify only)
  --api-entry <path>      API entry path (sandbox/verify only)
  --no-build              Skip building API when entry missing (sandbox/verify only)
  --config-dir <path>     Service config directory (server-stop only)
  --install-dir <path>    Service install directory (server-stop only)
  --pid-file <path>       PID file path (server-stop only)
`);
}

async function applyConfig(config, apiBaseUrl, authHeader, options) {
  console.log("apply: status");
  await requestJson("GET", `${apiBaseUrl}/api/status`, null, authHeader);

  const install = config?.install ?? {};
  const gateway = config?.gateway ?? {};
  const discord = config?.discord ?? {};
  const ai = config?.ai ?? {};
  const pairing = config?.pairing ?? {};

  const installCli = install.cli !== false;
  const startGateway = gateway.start !== false;
  const runProbe = Boolean(gateway.probe);

  if (installCli) {
    console.log("apply: install cli");
    await runJob(`${apiBaseUrl}/api/jobs/cli-install`, {}, authHeader);
  }

  if (typeof discord.token === "string" && discord.token.trim()) {
    console.log("apply: discord token");
    const data = await requestJson(
      "POST",
      `${apiBaseUrl}/api/discord/token`,
      { token: discord.token.trim() },
      authHeader
    );
    if (!data.ok) throw new Error(data.error ?? "discord token failed");
  }

  if (typeof ai.provider === "string" && typeof ai.key === "string") {
    const provider = ai.provider.trim();
    const key = ai.key.trim();
    if (provider && key) {
      console.log(`apply: ai auth (${provider})`);
      await runJob(`${apiBaseUrl}/api/jobs/ai/auth`, { provider, apiKey: key }, authHeader);
    }
  }

  const pairingWait = pairing.wait === true;
  const pairingPrompt = pairing.prompt === true || pairing.manual === true;
  const pairingTimeoutMs = parseNumberFlag(pairing.timeoutMs ?? pairing.timeout);
  const pairingPollMs = parseNumberFlag(pairing.pollMs ?? pairing.poll);
  const pairingNotify = Boolean(pairing.notify);
  const hasPairingCodes = Array.isArray(pairing.codes) && pairing.codes.length > 0;
  const needsPairing = pairingPrompt || pairingWait || hasPairingCodes;
  const shouldProbeNow = runProbe && !needsPairing;

  if (startGateway || shouldProbeNow) {
    console.log("apply: quickstart");
    const payload = {
      startGateway,
      runProbe: shouldProbeNow,
      ...(gateway.host ? { gatewayHost: gateway.host } : {}),
      ...(gateway.port ? { gatewayPort: gateway.port } : {})
    };
    await runJob(
      `${apiBaseUrl}/api/jobs/quickstart`,
      payload,
      authHeader
    );
  }

  if (pairingPrompt) {
    console.log("apply: pairing prompt");
    ensureInteractive(options?.nonInteractive ?? false);
    const code = await promptForValue({
      message: "请输入配对码并回车确认（留空取消）：",
      normalize: (value) => value.toUpperCase()
    });
    if (!code) {
      throw new Error("pairing code required");
    }
    await runJob(`${apiBaseUrl}/api/jobs/discord/pairing`, { code }, authHeader);
  }

  if (!pairingPrompt && pairingWait) {
    console.log("apply: pairing wait");
    const payload = {};
    if (pairingTimeoutMs) payload.timeoutMs = pairingTimeoutMs;
    if (pairingPollMs) payload.pollMs = pairingPollMs;
    if (pairingNotify) payload.notify = true;
    await runJob(`${apiBaseUrl}/api/jobs/discord/pairing/wait`, payload, authHeader);
  }

  if (!pairingPrompt && !pairingWait && hasPairingCodes) {
    for (const raw of pairing.codes) {
      const code = String(raw).trim();
      if (!code) continue;
      console.log(`apply: pairing approve (${code})`);
      await runJob(`${apiBaseUrl}/api/jobs/discord/pairing`, { code }, authHeader);
    }
  }

  if (runProbe && needsPairing) {
    console.log("apply: probe");
    await runProbeJob(apiBaseUrl, authHeader, {
      gatewayHost: gateway.host,
      gatewayPort: gateway.port
    });
  }
}

async function runSandboxVerify(params) {
  const sandbox = await createSandbox(params);
  const baseConfig = await loadTomlConfigRequired(sandbox.configPath);
  const merged = mergeSandboxConfig(baseConfig, params.config);
  if (merged !== baseConfig) {
    fs.writeFileSync(sandbox.configPath, serializeToml(merged), "utf-8");
  }

  if (!sandbox.pid || params.flags["no-apply"] === true) {
    return sandbox;
  }

  const auth = buildBasicAuth(sandbox.admin.user, sandbox.admin.pass);
  try {
    await applyConfig(merged, sandbox.apiBase, auth, { nonInteractive: params.nonInteractive });
  } catch (err) {
    const message = formatError(err);
    if (message.includes("pairing code")) {
      console.error(message);
      console.error(
        `next: MANAGER_API_URL="${sandbox.apiBase}" MANAGER_AUTH_USER="${sandbox.admin.user}" MANAGER_AUTH_PASS="${sandbox.admin.pass}" pnpm manager:pairing-approve -- --code "<PAIRING_CODE>" --continue`
      );
      return sandbox;
    }
    throw err;
  }
  return sandbox;
}

function mergeSandboxConfig(base, extra) {
  if (!extra || typeof extra !== "object") return base;
  const merged = { ...extra };
  merged.api = base.api;
  merged.admin = base.admin;
  merged.gateway = base.gateway;
  if (base.install || extra.install) {
    merged.install = { ...base.install, ...extra.install };
  }
  if (extra.discord) merged.discord = extra.discord;
  if (extra.ai) merged.ai = extra.ai;
  if (extra.pairing) merged.pairing = extra.pairing;
  return merged;
}

function buildProcessSnapshot(params) {
  const managerPort = resolveApiPort(params.flags);
  const managerPidFile = resolvePidFile(params.flags, resolveConfigDir(params.flags));
  const managerPid = readPidFile(managerPidFile);
  const managerListening = getListeningPids([managerPort]);
  const systemdActive = readSystemdStatus();
  const sandboxes = listSandboxInstances();
  const gatewayPorts = [
    parseNumberFlag(process.env.CLAWDBOT_GATEWAY_PORT) ?? 18789,
    ...sandboxes
      .map((entry) => entry.gatewayPort)
      .filter((value) => typeof value === "number")
  ];
  const gatewayListening = getListeningPids(gatewayPorts);
  const gatewayProcesses = listGatewayProcesses();

  return {
    manager: {
      port: managerPort,
      pidFile: managerPidFile,
      pid: managerPid,
      listeningPids: managerListening,
      systemdActive
    },
    sandboxes,
    gateway: {
      listeningPids: gatewayListening,
      processes: gatewayProcesses
    }
  };
}

function printProcessSnapshot(snapshot) {
  const manager = snapshot.manager;
  console.log("[manager]");
  console.log(`  api: http://127.0.0.1:${manager.port}`);
  if (manager.systemdActive) {
    console.log(`  systemd: ${manager.systemdActive}`);
  }
  if (manager.pid) {
    console.log(`  pid: ${manager.pid} (${manager.pidFile})`);
  } else {
    console.log(`  pid: not found (${manager.pidFile})`);
  }
  console.log(`  listening pids: ${formatPidList(manager.listeningPids)}`);

  console.log("");
  if (snapshot.sandboxes.length) {
    console.log(`[sandbox] count: ${snapshot.sandboxes.length}`);
    for (const entry of snapshot.sandboxes) {
      const status = entry.pid && isPidRunning(entry.pid) ? "running" : "stopped";
      console.log(
        `  - ${status} pid=${entry.pid ?? "?"} api=${entry.apiBase || "?"} dir=${entry.rootDir}`
      );
    }
  } else {
    console.log("[sandbox] none");
  }

  console.log("");
  if (snapshot.gateway.processes.length) {
    console.log(`[gateway] count: ${snapshot.gateway.processes.length}`);
    const rows = snapshot.gateway.processes.map(parseGatewayProcessLine);
    const table = formatTable(
      ["pid", "port", "source", "label"],
      rows.map((row) => [
        row.pid ?? "?",
        row.port ?? "-",
        row.source,
        row.label || "-"
      ])
    );
    for (const line of table) console.log(`  ${line}`);
  } else {
    console.log("[gateway] process: none");
  }
  console.log(`  listening pids: ${formatPidList(snapshot.gateway.listeningPids)}`);
}

function listSandboxInstances() {
  const dir = os.tmpdir();
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("clawdbot-manager-sandbox-"))
    .map((entry) => {
      const rootDir = path.join(dir, entry.name);
      const metaPath = path.join(rootDir, "sandbox.json");
      const pidPath = path.join(rootDir, "manager-api.pid");
      const pid = readPidFile(pidPath);
      let apiBase = "";
      let gatewayPort = null;
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
          apiBase = typeof meta.apiBase === "string" ? meta.apiBase : "";
          gatewayPort = typeof meta.gatewayPort === "number" ? meta.gatewayPort : null;
        } catch {
          // ignore
        }
      }
      return {
        rootDir,
        apiBase,
        pid,
        gatewayPort
      };
    })
    .sort((a, b) => a.rootDir.localeCompare(b.rootDir));
}

function readPidFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    const pid = Number(raw);
    if (!Number.isFinite(pid) || pid <= 0) return null;
    return pid;
  } catch {
    return null;
  }
}

function isPidRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function listGatewayProcesses() {
  if (process.platform === "win32") return [];
  const result = spawnSync("pgrep", ["-fl", "clawdbot-gateway"], { encoding: "utf-8" });
  if (result.error || result.status !== 0) return [];
  return result.stdout
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseGatewayProcessLine(line) {
  const tokens = line.split(/\s+/);
  const pid = Number(tokens[0]);
  const portMatch = line.match(/CLAWDBOT_GATEWAY_PORT=(\d+)/);
  const labelMatch = line.match(/CLAWDBOT_LAUNCHD_LABEL=([^\s]+)/);
  const source = line.includes("VSCODE_PROCESS_TITLE=extension-host")
    ? "vscode"
    : labelMatch
    ? "launchd"
    : "unknown";
  return {
    pid: Number.isFinite(pid) && pid > 0 ? pid : null,
    port: portMatch ? portMatch[1] : null,
    label: labelMatch ? labelMatch[1] : "",
    source
  };
}

function stopGatewayProcesses() {
  if (process.platform === "win32") {
    return { ok: true, message: "gateway: skipped (unsupported platform)" };
  }
  const lines = listGatewayProcesses();
  if (!lines.length) return { ok: true, message: "gateway: none" };
  const pids = new Set();
  const labels = new Set();
  for (const line of lines) {
    const parsed = parseGatewayProcessLine(line);
    if (parsed.pid) pids.add(parsed.pid);
    if (parsed.label) labels.add(parsed.label);
  }
  if (!pids.size) return { ok: true, message: "gateway: none" };
  const launchdResult = stopLaunchdLabels(labels);
  const failures = [];
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch (err) {
      if (!(err && typeof err === "object" && err.code === "ESRCH")) {
        failures.push(`pid ${pid}: ${String(err)}`);
      }
    }
  }
  const message = `gateway: stop requested (pids ${Array.from(pids).join(", ")})`;
  if (launchdResult.messages.length) {
    for (const line of launchdResult.messages) {
      console.log(line);
    }
  }
  const remaining = waitForGatewayStop(2000, 200);
  if (remaining.length) {
    const remainingPids = remaining
      .map(parseGatewayProcessLine)
      .map((entry) => entry.pid)
      .filter((pid) => Number.isFinite(pid))
      .join(", ");
    failures.push(`still running (pids ${remainingPids || "unknown"})`);
  }
  if (failures.length || launchdResult.errors.length) {
    const errorParts = [...launchdResult.errors, ...failures];
    return { ok: false, error: `gateway stop failed (${errorParts.join("; ")})`, message };
  }
  return { ok: true, message };
}

function stopLaunchdLabels(labels) {
  const messages = [];
  const errors = [];
  if (!labels.size) return { messages, errors };
  if (process.platform !== "darwin") {
    messages.push("launchd: skipped (not macOS)");
    return { messages, errors };
  }
  if (typeof process.getuid !== "function") {
    errors.push("launchd: missing uid");
    return { messages, errors };
  }
  const uid = process.getuid();
  for (const label of labels) {
    const target = `gui/${uid}/${label}`;
    const result = spawnSync("launchctl", ["bootout", target], { encoding: "utf-8" });
    if (result.error || result.status !== 0) {
      const detail = result.stderr?.trim() || result.stdout?.trim() || "unknown";
      errors.push(`launchd bootout ${label} failed (${detail})`);
    } else {
      messages.push(`launchd: bootout ${label}`);
    }
  }
  return { messages, errors };
}

function waitForGatewayStop(timeoutMs, intervalMs) {
  const deadline = Date.now() + timeoutMs;
  let remaining = listGatewayProcesses();
  while (remaining.length && Date.now() < deadline) {
    sleepSync(intervalMs);
    remaining = listGatewayProcesses();
  }
  return remaining;
}

function formatTable(headers, rows) {
  const widths = headers.map((header, i) =>
    Math.max(
      header.length,
      ...rows.map((row) => String(row[i] ?? "").length)
    )
  );
  const lines = [];
  lines.push(headers.map((header, i) => header.padEnd(widths[i])).join("  "));
  lines.push(headers.map((_, i) => "-".repeat(widths[i])).join("  "));
  for (const row of rows) {
    lines.push(row.map((cell, i) => String(cell ?? "").padEnd(widths[i])).join("  "));
  }
  return lines;
}

function formatPidList(pids) {
  return pids.length ? pids.join(", ") : "none";
}

function sleepSync(ms) {
  const shared = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(shared, 0, 0, ms);
}

function stopAll(params) {
  const dryRun = params.flags["dry-run"] === true;
  const stopManager = params.flags.manager !== false;
  const stopSandboxes = params.flags.sandboxes !== false;
  const stopGateway = params.flags.gateway !== false;
  const messages = [];
  const errors = [];
  const snapshot = buildProcessSnapshot({ flags: params.flags, config: params.config });

  if (dryRun) {
    messages.push(`[dry-run] stop-all`);
    if (stopManager) {
      messages.push(
        `manager: would stop (pid ${snapshot.manager.pid ?? "?"}, port ${snapshot.manager.port})`
      );
    } else {
      messages.push("manager: skipped");
    }
    if (stopSandboxes) {
      if (!snapshot.sandboxes.length) {
        messages.push("sandbox: none");
      } else {
        for (const entry of snapshot.sandboxes) {
          messages.push(`sandbox: would stop (${entry.rootDir})`);
        }
      }
    } else {
      messages.push("sandbox: skipped");
    }
    if (stopGateway) {
      const pids = snapshot.gateway.processes
        .map(parseGatewayProcessLine)
        .map((entry) => entry.pid)
        .filter((pid) => Number.isFinite(pid));
      messages.push(`gateway: would stop (${pids.length ? pids.join(", ") : "none"})`);
    } else {
      messages.push("gateway: skipped");
    }
    return { ok: true, messages };
  }

  if (stopManager) {
    const result = stopManagerService({ flags: params.flags });
    if (result.ok) {
      messages.push(`manager: ${result.message}`);
    } else if (result.error === "no running server process found") {
      messages.push("manager: not running");
    } else {
      errors.push(`manager: ${result.error ?? "stop failed"}`);
    }
  } else {
    messages.push("manager: skipped");
  }

  if (stopSandboxes) {
    if (!snapshot.sandboxes.length) {
      messages.push("sandbox: none");
    }
    for (const entry of snapshot.sandboxes) {
      const result = stopSandboxDir(entry.rootDir, { allowMissing: true });
      if (result.ok) {
        messages.push(`sandbox: ${result.message}`);
      } else {
        errors.push(`sandbox: ${result.error ?? "stop failed"}`);
      }
    }
  } else {
    messages.push("sandbox: skipped");
  }

  if (stopGateway) {
    const result = stopGatewayProcesses();
    if (result.ok) {
      messages.push(result.message);
    } else {
      messages.push(result.message);
      errors.push(result.error ?? "gateway stop failed");
    }
  } else {
    messages.push("gateway: skipped");
  }

  if (errors.length) {
    return { ok: false, error: errors.join("; "), messages };
  }
  return { ok: true, messages };
}

function resetEnvironment(params) {
  const dryRun = params.flags["dry-run"] === true;
  const keepClawdbot = params.flags["keep-clawdbot"] === true;
  const skipStop = params.flags["no-stop"] === true;
  const force = params.flags.force === true;
  const messages = [];
  const errors = [];

  if (!skipStop) {
    const stopResult = stopAll({ flags: params.flags, config: params.config });
    for (const line of stopResult.messages) {
      messages.push(line);
    }
    if (!stopResult.ok) {
      messages.push(`warn: stop-all failed (${stopResult.error ?? "unknown"})`);
    }
  }

  const configDir = resolveConfigDir(params.flags);
  const installDir = resolveInstallDir(params.flags);
  const clawdbotDir = resolveClawdbotDir(params.flags);
  const sandboxDirs = listSandboxInstances().map((entry) => entry.rootDir);

  const targets = [
    { label: "config", path: configDir },
    { label: "install", path: installDir },
    ...sandboxDirs.map((dir) => ({ label: "sandbox", path: dir }))
  ];
  if (!keepClawdbot) {
    targets.push({ label: "clawdbot", path: clawdbotDir });
  }

  const removed = [];
  for (const target of targets) {
    if (!target.path) continue;
    const resolved = path.resolve(target.path);
    const safe = isSafeResetPath(resolved);
    const expected = isExpectedResetPath(resolved);
    if (!safe) {
      errors.push(`refuse remove unsafe path (${resolved})`);
      continue;
    }
    if (!expected && !force) {
      errors.push(`refuse remove ${resolved} (use --force)`);
      continue;
    }
    if (dryRun) {
      messages.push(`[dry-run] ${target.label}: remove ${resolved}`);
      continue;
    }
    if (!fs.existsSync(resolved)) {
      messages.push(`${target.label}: not found (${resolved})`);
      continue;
    }
    try {
      fs.rmSync(resolved, { recursive: true, force: true });
      removed.push(`${target.label}: removed (${resolved})`);
    } catch (err) {
      errors.push(`${target.label}: failed to remove (${resolved}): ${String(err)}`);
    }
  }

  messages.push(...removed);
  if (errors.length) {
    return { ok: false, error: errors.join("; "), messages };
  }
  return { ok: true, messages };
}

function resolveClawdbotDir(flags) {
  const value = flags["clawdbot-dir"] ?? process.env.CLAWDBOT_DIR;
  if (typeof value === "string" && value.trim()) return value.trim();
  return path.join(os.homedir(), ".clawdbot");
}

function isSafeResetPath(resolved) {
  if (!resolved) return false;
  const blocked = new Set([path.resolve("/"), path.resolve(os.homedir()), path.resolve(os.tmpdir())]);
  if (blocked.has(path.resolve(resolved))) return false;
  return true;
}

function isExpectedResetPath(resolved) {
  const normalized = resolved.replace(/\\/g, "/");
  return (
    normalized.includes("/clawdbot-manager") ||
    normalized.includes("/.clawdbot-manager") ||
    normalized.includes("/.clawdbot") ||
    normalized.endsWith("/clawdbot-manager")
  );
}

function getListeningPids(ports) {
  const pids = new Set();
  for (const port of ports) {
    if (!port || !Number.isFinite(port)) continue;
    const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
      encoding: "utf-8"
    });
    if (result.error || result.status !== 0) continue;
    for (const line of result.stdout.split(/\s+/)) {
      const pid = Number(line);
      if (Number.isFinite(pid) && pid > 0) pids.add(pid);
    }
  }
  return Array.from(pids);
}

function readSystemdStatus() {
  if (process.platform !== "linux") return "";
  const servicePath = "/etc/systemd/system/clawdbot-manager.service";
  if (!fs.existsSync(servicePath)) return "";
  const result = spawnSync("systemctl", ["is-active", "clawdbot-manager"], {
    encoding: "utf-8"
  });
  if (result.error || result.status !== 0) return "inactive";
  return result.stdout.trim() || "active";
}

async function createSandbox(params) {
  const rootDir = resolveSandboxDir(params.flags);
  const reuse = Boolean(params.flags.reuse);
  const overwrite = Boolean(params.flags.overwrite);
  const startServer = params.flags.start !== false && params.flags["no-start"] !== true;
  if (fs.existsSync(rootDir) && !reuse) {
    throw new Error(`sandbox dir exists: ${rootDir} (use --reuse or --dir)`);
  }
  fs.mkdirSync(rootDir, { recursive: true });

  const stateDir = path.join(rootDir, "state");
  const credentialsDir = path.join(stateDir, "credentials");
  fs.mkdirSync(credentialsDir, { recursive: true });

  const apiPort = await resolveAvailablePort(parseNumberFlag(params.flags["api-port"]) ?? 17321);
  const gatewayPort = await resolveAvailablePort(
    parseNumberFlag(params.flags["gateway-port"]) ?? 18789,
    [apiPort]
  );

  const admin = resolveSandboxAdmin(params);
  const apiBase = `http://127.0.0.1:${apiPort}`;
  const configPath = path.join(rootDir, "manager.toml");
  if (!fs.existsSync(configPath) || overwrite) {
    const content = renderSandboxToml({
      apiBase,
      adminUser: admin.user,
      adminPass: admin.pass,
      gatewayPort
    });
    fs.writeFileSync(configPath, content, "utf-8");
  }

  const metaPath = path.join(rootDir, "sandbox.json");
  const meta = {
    createdAt: new Date().toISOString(),
    apiBase,
    apiPort,
    gatewayPort,
    stateDir,
    credentialsDir,
    configPath,
    adminUser: admin.user
  };
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf-8");

  let pid = null;
  let logFile = null;
  if (startServer) {
    const repoRoot = resolveRepoRoot();
    const apiEntry = resolveApiEntry(params.flags, repoRoot);
    if (!fs.existsSync(apiEntry)) {
      const allowBuild = params.flags.build !== false && params.flags["no-build"] !== true;
      if (!allowBuild) {
        throw new Error(`api entry not found: ${apiEntry} (run pnpm build or use --build)`);
      }
      const buildResult = spawnSync("pnpm", ["--filter", "clawdbot-manager-api", "build"], {
        cwd: repoRoot,
        stdio: "inherit"
      });
      if (buildResult.status !== 0) {
        throw new Error("failed to build api");
      }
    }
    const pidFile = path.join(rootDir, "manager-api.pid");
    logFile = path.join(rootDir, "manager-api.log");
    const out = fs.openSync(logFile, "a");
    const env = {
      ...process.env,
      MANAGER_API_PORT: String(apiPort),
      MANAGER_AUTH_USERNAME: admin.user,
      MANAGER_AUTH_PASSWORD: admin.pass,
      CLAWDBOT_STATE_DIR: stateDir,
      CLAWDBOT_OAUTH_DIR: credentialsDir,
      CLAWDBOT_GATEWAY_PORT: String(gatewayPort)
    };
    const child = spawn("node", [apiEntry], {
      cwd: repoRoot,
      env,
      detached: true,
      stdio: ["ignore", out, out]
    });
    child.unref();
    pid = child.pid ?? null;
    if (pid) {
      fs.writeFileSync(pidFile, String(pid), "utf-8");
    }
    const ready = await waitForApiReady(apiBase, admin, 12_000);
    if (!ready) {
      throw new Error("api not ready within timeout");
    }
  }

  return {
    rootDir,
    apiBase,
    apiPort,
    gatewayPort,
    stateDir,
    credentialsDir,
    configPath,
    admin,
    pid,
    logFile
  };
}

function stopSandbox(params) {
  const rootDir = resolveSandboxDirRequired(params.flags);
  if (!rootDir) {
    return { ok: false, error: "missing --dir (sandbox directory)" };
  }
  return stopSandboxDir(rootDir, { clean: params.flags.clean === true });
}

function stopSandboxDir(rootDir, options) {
  const opts = options ?? {};
  const pidFile = path.join(rootDir, "manager-api.pid");
  if (!fs.existsSync(pidFile)) {
    if (opts.clean) {
      fs.rmSync(rootDir, { recursive: true, force: true });
      return { ok: true, message: `sandbox removed (${rootDir})` };
    }
    if (opts.allowMissing) {
      return { ok: true, message: `sandbox already stopped (${rootDir})` };
    }
    return { ok: false, error: `pid file not found: ${pidFile}` };
  }
  const raw = fs.readFileSync(pidFile, "utf-8").trim();
  const pid = Number(raw);
  if (!Number.isFinite(pid) || pid <= 0) {
    if (opts.clean) {
      fs.rmSync(rootDir, { recursive: true, force: true });
      return { ok: true, message: `sandbox removed (${rootDir})` };
    }
    if (opts.allowMissing) {
      return { ok: true, message: `sandbox pid invalid (${rootDir})` };
    }
    return { ok: false, error: `invalid pid in ${pidFile}` };
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch (err) {
    if (err && typeof err === "object" && err.code === "ESRCH" && opts.allowMissing) {
      return { ok: true, message: `sandbox already stopped (${rootDir})` };
    }
    return { ok: false, error: `failed to stop pid ${pid}: ${String(err)}` };
  }
  if (opts.clean) {
    fs.rmSync(rootDir, { recursive: true, force: true });
    return { ok: true, message: `sandbox stopped and removed (${rootDir})` };
  }
  return { ok: true, message: `sandbox stopped (pid ${pid})` };
}

function resolveSandboxDir(flags) {
  const value =
    flags.dir ??
    flags["sandbox-dir"] ??
    process.env.MANAGER_SANDBOX_DIR ??
    "";
  if (typeof value === "string" && value.trim()) {
    return path.resolve(value.trim());
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(os.tmpdir(), `clawdbot-manager-sandbox-${stamp}`);
}

function resolveSandboxDirRequired(flags) {
  const value =
    flags.dir ??
    flags["sandbox-dir"] ??
    process.env.MANAGER_SANDBOX_DIR ??
    "";
  if (typeof value === "string" && value.trim()) {
    return path.resolve(value.trim());
  }
  return "";
}

function resolveSandboxAdmin(params) {
  const base = resolveAdminCredentials({ flags: params.flags, config: null });
  const user = base.user || "admin";
  const pass = base.pass || "pass";
  return { user, pass };
}

function resolveRepoRoot() {
  const envRoot = process.env.MANAGER_REPO_ROOT;
  if (envRoot) return path.resolve(envRoot);
  const start = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let current = start;
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(current, "package.json");
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed?.name === "clawdbot-manager") {
          return current;
        }
      } catch {
        // ignore
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(process.cwd());
}

function resolveApiEntry(flags, repoRoot) {
  const value = flags["api-entry"] ?? process.env.MANAGER_API_ENTRY;
  if (typeof value === "string" && value.trim()) {
    return path.resolve(value.trim());
  }
  return path.join(repoRoot, "apps", "api", "dist", "index.js");
}

function renderSandboxToml(params) {
  return [
    `[api]`,
    `base = "${params.apiBase}"`,
    ``,
    `[admin]`,
    `user = "${params.adminUser}"`,
    `pass = "${params.adminPass}"`,
    ``,
    `[gateway]`,
    `port = ${params.gatewayPort}`,
    ``,
    `[install]`,
    `cli = true`,
    ``
  ].join("\n");
}

function serializeToml(config) {
  const lines = [];
  const knownSections = new Set([
    "api",
    "admin",
    "install",
    "discord",
    "ai",
    "gateway",
    "pairing"
  ]);
  for (const [key, value] of Object.entries(config ?? {})) {
    if (knownSections.has(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      continue;
    }
    lines.push(`${key} = ${formatTomlValue(value)}`);
  }
  if (lines.length) lines.push("");
  const writeSection = (name, obj) => {
    if (!obj || typeof obj !== "object") return;
    lines.push(`[${name}]`);
    for (const [key, value] of Object.entries(obj)) {
      lines.push(`${key} = ${formatTomlValue(value)}`);
    }
    lines.push("");
  };
  writeSection("api", config.api);
  writeSection("admin", config.admin);
  writeSection("install", config.install);
  writeSection("discord", config.discord);
  writeSection("ai", config.ai);
  writeSection("gateway", config.gateway);
  writeSection("pairing", config.pairing);
  for (const [key, value] of Object.entries(config ?? {})) {
    if (knownSections.has(key)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    writeSection(key, value);
  }
  return lines.join("\n").trim() + "\n";
}

function formatTomlValue(value) {
  if (Array.isArray(value)) {
    return `[${value.map(formatTomlValue).join(", ")}]`;
  }
  if (typeof value === "string") {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "\"\"";
}

async function resolveAvailablePort(start, avoid = []) {
  const normalizedAvoid = new Set(avoid.filter((value) => typeof value === "number"));
  for (let offset = 0; offset < 40; offset += 1) {
    const candidate = start + offset;
    if (normalizedAvoid.has(candidate)) continue;
    if (await isPortFree(candidate)) return candidate;
  }
  const fallback = await getEphemeralPort();
  if (normalizedAvoid.has(fallback)) {
    return await getEphemeralPort();
  }
  return fallback;
}

async function isPortFree(port) {
  return await new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

async function getEphemeralPort() {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => resolve(typeof port === "number" ? port : 0));
    });
  });
}

async function waitForApiReady(apiBase, admin, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const auth = buildBasicAuth(admin.user, admin.pass);
      const res = await fetch(`${apiBase}/api/status`, { headers: { authorization: auth } });
      if (res.ok) return true;
    } catch {
      // retry
    }
    await sleep(250);
  }
  return false;
}

function printSandboxSummary(result, options) {
  console.log(`[sandbox] root: ${result.rootDir}`);
  console.log(`[sandbox] api: ${result.apiBase}`);
  console.log(`[sandbox] state: ${result.stateDir}`);
  console.log(`[sandbox] config: ${result.configPath}`);
  console.log(`[sandbox] admin: ${result.admin.user} / ${result.admin.pass}`);
  if (result.pid) {
    console.log(`[sandbox] api pid: ${result.pid}`);
  }
  if (result.logFile) {
    console.log(`[sandbox] api log: ${result.logFile}`);
  }
  console.log(
    `[sandbox] next: MANAGER_CONFIG_PATH="${result.configPath}" MANAGER_API_URL="${result.apiBase}" MANAGER_AUTH_USER="${result.admin.user}" MANAGER_AUTH_PASS="${result.admin.pass}" pnpm manager:apply -- --non-interactive`
  );
  console.log(
    `[sandbox] stop: node scripts/manager-cli.mjs sandbox-stop --dir "${result.rootDir}"`
  );
  if (options.printEnv) {
    console.log(`export MANAGER_CONFIG_PATH="${result.configPath}"`);
    console.log(`export MANAGER_API_URL="${result.apiBase}"`);
    console.log(`export MANAGER_AUTH_USER="${result.admin.user}"`);
    console.log(`export MANAGER_AUTH_PASS="${result.admin.pass}"`);
  }
}

function isNonInteractive(flags) {
  return (
    flags["non-interactive"] === true ||
    process.env.MANAGER_NON_INTERACTIVE === "1" ||
    process.env.CI === "1"
  );
}

function ensureInteractive(nonInteractiveFlag) {
  if (!nonInteractiveFlag) return;
  throw new Error(
    "non-interactive: pairing code required. Use pairing-approve --continue after you get the code."
  );
}

async function runProbeJob(apiBaseUrl, authHeader, gateway) {
  const payload = {
    startGateway: false,
    runProbe: true,
    ...(gateway?.gatewayHost ? { gatewayHost: gateway.gatewayHost } : {}),
    ...(gateway?.gatewayPort ? { gatewayPort: gateway.gatewayPort } : {})
  };
  await runJob(`${apiBaseUrl}/api/jobs/quickstart`, payload, authHeader);
}

async function promptForValue(params) {
  if (!process.stdin.isTTY) {
    throw new Error("stdin is not interactive");
  }
  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(params.message);
    const raw = answer.trim();
    if (!raw) return "";
    return params.normalize ? params.normalize(raw) : raw;
  } finally {
    rl.close();
  }
}

function parseNumberFlag(value) {
  if (value === undefined || value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopManagerService(params) {
  const configDir = resolveConfigDir(params.flags);
  const installDir = resolveInstallDir(params.flags);
  const pidFile = resolvePidFile(params.flags, configDir);
  const apiPort = resolveApiPort(params.flags);

  if (trySystemdStop()) {
    return { ok: true, message: "server stop requested (systemd)" };
  }

  const pidStopped = tryStopPidFile(pidFile);
  if (pidStopped) {
    return { ok: true, message: `server stop requested (pid ${pidStopped})` };
  }

  const pgrepStopped = tryStopByPgrep(installDir);
  if (pgrepStopped.length) {
    return { ok: true, message: `server stop requested (pids ${pgrepStopped.join(", ")})` };
  }

  const portStopped = tryStopByPort(apiPort);
  if (portStopped.length) {
    return {
      ok: true,
      message: `server stop requested (port ${apiPort}, pids ${portStopped.join(", ")})`
    };
  }

  return { ok: false, error: "no running server process found" };
}

function resolveConfigDir(flags) {
  const value = flags["config-dir"] ?? process.env.MANAGER_CONFIG_DIR;
  if (typeof value === "string" && value.trim()) return value.trim();
  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
  return isRoot ? "/etc/clawdbot-manager" : path.join(os.homedir(), ".clawdbot-manager");
}

function resolveInstallDir(flags) {
  const value = flags["install-dir"] ?? process.env.MANAGER_INSTALL_DIR;
  if (typeof value === "string" && value.trim()) return value.trim();
  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
  return isRoot ? "/opt/clawdbot-manager" : path.join(os.homedir(), "clawdbot-manager");
}

function resolvePidFile(flags, configDir) {
  const value = flags["pid-file"] ?? process.env.MANAGER_PID_FILE;
  if (typeof value === "string" && value.trim()) return value.trim();
  return path.join(configDir, "manager.pid");
}

function resolveApiPort(flags) {
  const raw = flags["api-port"] ?? process.env.MANAGER_API_PORT ?? "17321";
  return parseNumberFlag(raw) ?? 17321;
}

function trySystemdStop() {
  if (process.platform !== "linux") return false;
  const servicePath = "/etc/systemd/system/clawdbot-manager.service";
  if (!fs.existsSync(servicePath)) return false;
  const result = spawnSync("systemctl", ["stop", "clawdbot-manager"], { stdio: "ignore" });
  return result.status === 0 && !result.error;
}

function tryStopPidFile(pidFile) {
  if (!fs.existsSync(pidFile)) return null;
  const raw = fs.readFileSync(pidFile, "utf-8").trim();
  const pid = Number(raw);
  if (!Number.isFinite(pid) || pid <= 0) return null;
  try {
    process.kill(pid, "SIGTERM");
    fs.unlinkSync(pidFile);
    return pid;
  } catch {
    return null;
  }
}

function tryStopByPgrep(installDir) {
  const match = path.join(installDir, "apps", "api", "dist", "index.js");
  const result = spawnSync("pgrep", ["-f", match], { encoding: "utf-8" });
  if (result.error || result.status !== 0) return [];
  return killPidList(result.stdout);
}

function tryStopByPort(port) {
  const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
    encoding: "utf-8"
  });
  if (result.error || result.status !== 0) return [];
  return killPidList(result.stdout);
}

function killPidList(output) {
  const list = output
    .split(/\s+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!list.length) return [];
  const stopped = [];
  for (const pid of list) {
    try {
      process.kill(pid, "SIGTERM");
      stopped.push(pid);
    } catch {
      // ignore and continue
    }
  }
  return stopped;
}

async function loadTomlConfig(configPath) {
  const fs = await import("node:fs/promises");
  const text = await fs.readFile(configPath, "utf-8");
  return parseToml(text);
}

async function loadTomlConfigOptional(configPath) {
  try {
    return await loadTomlConfig(configPath);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

async function loadTomlConfigRequired(configPath) {
  const config = await loadTomlConfigOptional(configPath);
  if (!config) {
    throw new Error(`config not found: ${configPath}`);
  }
  return config;
}

function parseToml(input) {
  const root = {};
  let current = root;

  const lines = input.split(/\r?\n/);
  for (const raw of lines) {
    const line = stripComment(raw).trim();
    if (!line) continue;
    if (line.startsWith("[") && line.endsWith("]")) {
      const section = line.slice(1, -1).trim();
      if (!section) continue;
      current = ensurePath(root, section.split("."));
      continue;
    }
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const valueRaw = line.slice(idx + 1).trim();
    const value = parseTomlValue(valueRaw);
    setPath(current, key.split("."), value);
  }
  return root;
}

function stripComment(line) {
  const hashIndex = line.indexOf("#");
  if (hashIndex === -1) return line;
  return line.slice(0, hashIndex);
}

function parseTomlValue(raw) {
  if (!raw) return "";
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return splitArray(inner).map(parseTomlValue);
  }
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

function splitArray(raw) {
  const items = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if ((ch === '"' || ch === "'") && (!inQuotes || ch === quoteChar)) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = ch;
      } else {
        inQuotes = false;
      }
      current += ch;
      continue;
    }
    if (ch === "," && !inQuotes) {
      if (current.trim()) items.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

function ensurePath(root, parts) {
  let target = root;
  for (const part of parts) {
    if (!part) continue;
    if (!Object.prototype.hasOwnProperty.call(target, part)) {
      target[part] = {};
    }
    const next = target[part];
    if (typeof next !== "object" || next === null) {
      target[part] = {};
    }
    target = target[part];
  }
  return target;
}

function setPath(root, parts, value) {
  if (!parts.length) return;
  let target = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!Object.prototype.hasOwnProperty.call(target, part)) {
      target[part] = {};
    }
    const next = target[part];
    if (typeof next !== "object" || next === null) {
      target[part] = {};
    }
    target = target[part];
  }
  target[parts[parts.length - 1]] = value;
}
