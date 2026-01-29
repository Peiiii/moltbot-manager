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

  if (cmd === "sandbox") {
    const result = await createSandbox({ flags, nonInteractive });
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
  await streamJob(`${base}/api/jobs/${res.jobId}/stream`, authHeader);
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
  sandbox                 Prepare an isolated sandbox for quick validation
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

Common flags:
  --api <base>            API base (default: http://127.0.0.1:17321)
  --config <path>         TOML config path (default: manager.toml)
  --user <user>           Auth username (or MANAGER_AUTH_USER)
  --pass <pass>           Auth password (or MANAGER_AUTH_PASS)
  --non-interactive       Disable prompts (or MANAGER_NON_INTERACTIVE=1)
  --dir <path>            Sandbox directory (sandbox only)
  --api-port <port>       Sandbox API port (sandbox only)
  --gateway-port <port>   Sandbox gateway port (sandbox only)
  --no-start              Do not start API server (sandbox only)
  --print-env             Print export statements (sandbox only)
  --config-dir <path>     Service config directory (server-stop only)
  --install-dir <path>    Service install directory (server-stop only)
  --pid-file <path>       PID file path (server-stop only)
  --api-port <port>       Service port (server-stop only)
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
  const pidFile = path.join(rootDir, "manager-api.pid");
  if (!fs.existsSync(pidFile)) {
    return { ok: false, error: `pid file not found: ${pidFile}` };
  }
  const raw = fs.readFileSync(pidFile, "utf-8").trim();
  const pid = Number(raw);
  if (!Number.isFinite(pid) || pid <= 0) {
    return { ok: false, error: `invalid pid in ${pidFile}` };
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch (err) {
    return { ok: false, error: `failed to stop pid ${pid}: ${String(err)}` };
  }
  if (params.flags.clean === true) {
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
