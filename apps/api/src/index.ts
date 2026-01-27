import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { spawn } from "node:child_process";
import { scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

const REQUIRED_NODE_MAJOR = 22;
const DEFAULT_GATEWAY_HOST = "127.0.0.1";
const DEFAULT_GATEWAY_PORT = 18789;
const DEFAULT_API_HOST = "127.0.0.1";
const DEFAULT_API_PORT = 17321;
const DEFAULT_CONFIG_PATH = path.join(os.homedir(), ".clawdbot-manager", "config.json");

const app = new Hono();

type OnboardingStatus = {
  discord: {
    tokenConfigured: boolean;
    allowFromConfigured: boolean;
    pendingPairings: number;
  };
  probe: { ok: boolean; at: string } | null;
};

let onboardingCache: { at: number; data: OnboardingStatus } | null = null;
let lastProbe: { ok: boolean; at: string } | null = null;
const ONBOARDING_CACHE_MS = 5000;

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      const allowed = new Set(
        [
          "http://localhost:5173",
          "http://127.0.0.1:5173",
          "http://localhost:5179",
          "http://127.0.0.1:5179"
        ].concat(parseOrigins(process.env.MANAGER_CORS_ORIGIN))
      );
      if (allowed.has("*")) return "*";
      if (allowed.has(origin)) return origin;
      return "null";
    },
    allowHeaders: ["Content-Type", "Authorization"]
  })
);

type CommandDefinition = {
  id: string;
  title: string;
  description: string;
  command: string;
  args: string[];
  cwd: string;
  allowRun: boolean;
};

type ProcessSnapshot = {
  id: string;
  title: string;
  command: string;
  cwd: string;
  running: boolean;
  pid: number | null;
  startedAt: string | null;
  exitCode: number | null;
  lastLines: string[];
};

type ManagedProcess = {
  def: CommandDefinition;
  child: ReturnType<typeof spawn> | null;
  logs: string[];
  startedAt: Date | null;
  exitCode: number | null;
};

const repoRoot = resolveRepoRoot();
const webDist = resolveWebDist(repoRoot);
const commandRegistry = buildCommandRegistry(repoRoot);
const processRegistry = new Map<string, ManagedProcess>();
const authDisabled = process.env.MANAGER_AUTH_DISABLED === "1";
const authAllowUnconfigured = process.env.MANAGER_AUTH_ALLOW_UNCONFIGURED === "1";

app.use("/api/*", async (c, next) => {
  const pathName = c.req.path;
  if (pathName.startsWith("/api/auth/")) {
    return next();
  }
  if (authDisabled) {
    return next();
  }

  const authState = resolveAuthState();
  if (!authState.configured) {
    if (authAllowUnconfigured) return next();
    return c.json({ ok: false, error: "auth not configured" }, 401, authHeaders());
  }

  const header = c.req.header("authorization");
  if (!header || !verifyAuthHeader(header, authState)) {
    return c.json({ ok: false, error: "unauthorized" }, 401, authHeaders());
  }

  return next();
});

app.get("/health", (c) => {
  return c.json({
    ok: true,
    time: new Date().toISOString(),
    version: "clawdbot-manager-api"
  });
});

app.get("/api/status", async (c) => {
  const gatewayHost = c.req.query("gatewayHost") ?? DEFAULT_GATEWAY_HOST;
  const gatewayPort = parsePort(c.req.query("gatewayPort")) ?? DEFAULT_GATEWAY_PORT;

  const [system, cli, gateway] = await Promise.all([
    getSystemStatus(),
    getCliStatus(),
    checkGateway(gatewayHost, gatewayPort)
  ]);
  const onboarding = await getOnboardingStatus(cli.installed);

  return c.json({
    ok: true,
    now: new Date().toISOString(),
    system,
    cli,
    gateway,
    onboarding,
    commands: commandRegistry.map((cmd) => ({
      id: cmd.id,
      title: cmd.title,
      description: cmd.description,
      command: formatCommand(cmd),
      cwd: cmd.cwd,
      allowRun: cmd.allowRun
    })),
    processes: listProcesses()
  });
});

app.get("/api/processes", (c) => {
  return c.json({
    ok: true,
    processes: listProcesses()
  });
});

app.post("/api/processes/start", async (c) => {
  const body = await c.req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return c.json({ ok: false, error: "missing id" }, 400);

  const result = startProcess(id);
  return c.json(result.ok ? { ok: true, process: result.process } : result, result.ok ? 200 : 400);
});

app.post("/api/processes/stop", async (c) => {
  const body = await c.req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return c.json({ ok: false, error: "missing id" }, 400);

  const result = stopProcess(id);
  return c.json(result.ok ? { ok: true, process: result.process } : result, result.ok ? 200 : 400);
});

app.get("/api/auth/status", (c) => {
  const authState = resolveAuthState();
  return c.json({
    ok: true,
    required: !authDisabled,
    configured: authState.configured
  });
});

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (authDisabled) {
    return c.json({ ok: true, disabled: true });
  }
  const authState = resolveAuthState();
  if (!authState.configured) {
    return c.json({ ok: false, error: "auth not configured" }, 400);
  }
  if (!username || !password) {
    return c.json({ ok: false, error: "missing credentials" }, 400);
  }
  if (!authState.verify(username, password)) {
    return c.json({ ok: false, error: "invalid credentials" }, 401);
  }
  return c.json({ ok: true });
});

app.post("/api/cli/install", async (c) => {
  const cli = await getCliStatus();
  if (cli.installed) {
    return c.json({ ok: true, alreadyInstalled: true, version: cli.version });
  }

  try {
    await runCommand("npm", ["i", "-g", "clawdbot@latest"], 120_000);
    const updated = await getCliStatus();
    return c.json({ ok: true, version: updated.version });
  } catch (err) {
    return c.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});

app.post("/api/discord/token", async (c) => {
  const body = await c.req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) return c.json({ ok: false, error: "missing token" }, 400);

  const args = ["config", "set", "channels.discord.token", token];
  const result = await runCommand("clawdbot", args, 8000).then(
    () => ({ ok: true }),
    (err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })
  );

  return c.json(result, result.ok ? 200 : 500);
});

app.post("/api/discord/pairing", async (c) => {
  const body = await c.req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) return c.json({ ok: false, error: "missing code" }, 400);

  const args = ["pairing", "approve", "discord", code];
  const result = await runCommand("clawdbot", args, 8000).then(
    () => ({ ok: true }),
    (err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })
  );

  return c.json(result, result.ok ? 200 : 500);
});

app.post("/api/quickstart", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    runProbe?: boolean;
    startGateway?: boolean;
    gatewayHost?: string;
    gatewayPort?: string;
  };
  const runProbe = Boolean(body?.runProbe);
  const startGateway = body?.startGateway !== false;
  const gatewayHost =
    typeof body?.gatewayHost === "string" ? body.gatewayHost : DEFAULT_GATEWAY_HOST;
  const gatewayPort =
    typeof body?.gatewayPort === "string"
      ? parsePort(body.gatewayPort) ?? DEFAULT_GATEWAY_PORT
      : DEFAULT_GATEWAY_PORT;

  let gatewayReady = false;
  let probeOk: boolean | undefined;

  const cli = await getCliStatus();
  if (!cli.installed) {
    return c.json({ ok: false, error: "clawdbot CLI not installed" }, 400);
  }

  if (startGateway) {
    const started = startProcess("gateway-run");
    if (!started.ok) {
      return c.json({ ok: false, error: started.error }, 500);
    }
    gatewayReady = await waitForGateway(gatewayHost, gatewayPort, 12_000);
  } else {
    const snapshot = await checkGateway(gatewayHost, gatewayPort);
    gatewayReady = snapshot.ok;
  }

  if (runProbe) {
    probeOk = await runCommand("clawdbot", ["channels", "status", "--probe"], 12_000)
      .then(() => true)
      .catch(() => false);
    lastProbe = { ok: Boolean(probeOk), at: new Date().toISOString() };
  }

  return c.json({ ok: true, gatewayReady, probeOk });
});

const host =
  process.env.MANAGER_API_HOST ?? process.env.ONBOARDING_API_HOST ?? DEFAULT_API_HOST;
const port =
  parsePort(process.env.MANAGER_API_PORT ?? process.env.ONBOARDING_API_PORT) ??
  DEFAULT_API_PORT;

if (webDist) {
  app.get("*", async (c) => {
    const reqPath = c.req.path;
    if (reqPath.startsWith("/api") || reqPath === "/health") {
      return c.notFound();
    }
    return serveStaticFile(c.req.path, webDist);
  });
}

serve({
  fetch: app.fetch,
  hostname: host,
  port
});

function parsePort(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed <= 0 || parsed > 65535) return null;
  return parsed;
}

function resolveRepoRoot(): string {
  const envRoot = process.env.MANAGER_REPO_ROOT ?? process.env.ONBOARDING_REPO_ROOT;
  if (envRoot) return path.resolve(envRoot);

  const startPoints = [
    process.cwd(),
    path.dirname(fileURLToPath(import.meta.url))
  ];

  for (const start of startPoints) {
    const found = findRepoRoot(start);
    if (found) return found;
  }

  return path.resolve(process.cwd(), "../..");
}

type AuthState = {
  configured: boolean;
  verify: (username: string, password: string) => boolean;
};

type ManagerConfig = {
  auth?: {
    username: string;
    salt: string;
    hash: string;
  };
  createdAt?: string;
};

function resolveAuthState(): AuthState {
  if (authDisabled) {
    return { configured: false, verify: () => true };
  }

  const envUser = process.env.MANAGER_AUTH_USERNAME?.trim() ?? "";
  const envPass = process.env.MANAGER_AUTH_PASSWORD ?? "";
  if (envUser && envPass) {
    return {
      configured: true,
      verify: (username, password) => username === envUser && password === envPass
    };
  }

  const config = loadManagerConfig();
  const auth = config?.auth;
  if (!auth?.username || !auth?.salt || !auth?.hash) {
    return { configured: false, verify: () => false };
  }

  return {
    configured: true,
    verify: (username, password) => verifyPassword(username, password, auth)
  };
}

function verifyPassword(
  username: string,
  password: string,
  auth: { username: string; salt: string; hash: string }
) {
  if (username !== auth.username) return false;
  const hashed = scryptSync(password, auth.salt, 64);
  const expected = Buffer.from(auth.hash, "base64");
  if (hashed.length !== expected.length) return false;
  return timingSafeEqual(hashed, expected);
}

function verifyAuthHeader(header: string, authState: AuthState) {
  const match = header.match(/^Basic\s+(.+)$/i);
  if (!match) return false;
  const decoded = Buffer.from(match[1], "base64").toString("utf-8");
  const [username, ...rest] = decoded.split(":");
  const password = rest.join(":");
  if (!username || !password) return false;
  return authState.verify(username, password);
}

function authHeaders() {
  return { "WWW-Authenticate": 'Basic realm="Clawdbot Manager"' };
}

function loadManagerConfig(): ManagerConfig | null {
  const configPath = resolveConfigPath();
  try {
    if (!fs.existsSync(configPath)) return null;
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as ManagerConfig;
  } catch {
    return null;
  }
}

function resolveConfigPath() {
  return process.env.MANAGER_CONFIG_PATH ?? DEFAULT_CONFIG_PATH;
}

function resolveWebDist(root: string) {
  const candidate = process.env.MANAGER_WEB_DIST ?? path.join(root, "apps/web/dist");
  const indexPath = path.join(candidate, "index.html");
  if (fs.existsSync(indexPath)) return candidate;
  return null;
}

function serveStaticFile(reqPath: string, webRoot: string) {
  const relPath = reqPath === "/" ? "/index.html" : reqPath;
  const safePath = safeJoin(webRoot, relPath);
  if (!safePath) return new Response("Not Found", { status: 404 });

  const fileContent = readFileOrNull(safePath);
  if (fileContent) {
    return new Response(toArrayBuffer(fileContent), {
      headers: { "content-type": contentType(path.extname(safePath)) }
    });
  }

  if (relPath !== "/index.html") {
    const indexPath = path.join(webRoot, "index.html");
    const indexContent = readFileOrNull(indexPath);
    if (indexContent) {
      return new Response(toArrayBuffer(indexContent), {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }
  }

  return new Response("Not Found", { status: 404 });
}

function readFileOrNull(filePath: string): Uint8Array | null {
  try {
    return fs.readFileSync(filePath) as Uint8Array;
  } catch {
    return null;
  }
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

function safeJoin(root: string, reqPath: string) {
  const normalized = path.normalize(reqPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const resolved = path.join(root, normalized);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function contentType(ext: string) {
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".map":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".ico":
      return "image/x-icon";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

function parseOrigins(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function findRepoRoot(start: string): string | null {
  let current = start;
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(current, "package.json");
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, "utf-8");
        const parsed = JSON.parse(raw) as { name?: string };
        if (parsed.name === "clawdbot-manager") return current;
      } catch {
        return current;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function buildCommandRegistry(root: string): CommandDefinition[] {
  return [
    {
      id: "install-cli",
      title: "Install Clawdbot CLI",
      description: "Install the latest Clawdbot CLI (may require sudo)",
      command: "npm",
      args: ["i", "-g", "clawdbot@latest"],
      cwd: root,
      allowRun: true
    },
    {
      id: "gateway-run",
      title: "Start gateway",
      description: "Run the local gateway (loopback only)",
      command: "clawdbot",
      args: ["gateway", "run", "--allow-unconfigured", "--bind", "loopback", "--port", "18789", "--force"],
      cwd: root,
      allowRun: true
    },
    {
      id: "channels-probe",
      title: "Probe channels",
      description: "Check channel connectivity",
      command: "clawdbot",
      args: ["channels", "status", "--probe"],
      cwd: root,
      allowRun: true
    }
  ];
}

async function getSystemStatus() {
  const major = parseMajor(process.version);
  return {
    node: {
      current: process.version,
      required: `>=${REQUIRED_NODE_MAJOR}`,
      ok: major >= REQUIRED_NODE_MAJOR
    },
    platform: process.platform,
    arch: process.arch
  };
}

function parseMajor(version: string): number {
  const cleaned = version.replace(/^v/, "");
  const [major] = cleaned.split(".");
  return Number(major);
}

async function getCliStatus() {
  const pathMatch = findOnPath("clawdbot");
  if (!pathMatch) {
    return { installed: false, path: null, version: null };
  }

  const version = await runCommand(pathMatch, ["--version"], 2000).catch(() => null);
  return {
    installed: true,
    path: pathMatch,
    version: version?.trim() ?? null
  };
}

async function getOnboardingStatus(cliInstalled: boolean): Promise<OnboardingStatus> {
  const now = Date.now();
  if (onboardingCache && now - onboardingCache.at < ONBOARDING_CACHE_MS) {
    return onboardingCache.data;
  }

  if (!cliInstalled) {
    const data: OnboardingStatus = {
      discord: {
        tokenConfigured: false,
        allowFromConfigured: false,
        pendingPairings: 0
      },
      probe: lastProbe
    };
    onboardingCache = { at: now, data };
    return data;
  }

  const [tokenConfigured, allowFromConfigured, pendingPairings] = await Promise.all([
    readDiscordTokenConfigured(),
    readDiscordAllowFromConfigured(),
    readPendingDiscordPairings()
  ]);

  const data: OnboardingStatus = {
    discord: {
      tokenConfigured,
      allowFromConfigured,
      pendingPairings
    },
    probe: lastProbe
  };
  onboardingCache = { at: now, data };
  return data;
}

function findOnPath(binary: string): string | null {
  const envPath = process.env.PATH ?? "";
  const entries = envPath.split(path.delimiter).filter(Boolean);

  for (const entry of entries) {
    const candidate = path.join(entry, binary);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function runCommand(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env
    });

    let output = "";
    let error = "";

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("timeout"));
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      error += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(output);
      else reject(new Error(error || output));
    });
  });
}

async function readConfigValue(pathKey: string): Promise<unknown | null> {
  try {
    const output = await runCommand("clawdbot", ["config", "get", pathKey, "--json"], 4000);
    return JSON.parse(output);
  } catch {
    return null;
  }
}

async function readDiscordTokenConfigured(): Promise<boolean> {
  const value = await readConfigValue("channels.discord.token");
  return typeof value === "string" ? value.trim().length > 0 : false;
}

async function readDiscordAllowFromConfigured(): Promise<boolean> {
  const value = await readConfigValue("channels.discord.dm.allowFrom");
  if (Array.isArray(value)) return value.length > 0;
  if (value === "*") return true;
  return false;
}

async function readPendingDiscordPairings(): Promise<number> {
  try {
    const output = await runCommand(
      "clawdbot",
      ["pairing", "list", "--channel", "discord", "--json"],
      4000
    );
    const parsed = JSON.parse(output) as { requests?: unknown[] };
    return Array.isArray(parsed?.requests) ? parsed.requests.length : 0;
  } catch {
    return 0;
  }
}

type GatewayProbe = {
  ok: boolean;
  host: string;
  port: number;
  latencyMs: number | null;
  error: string | null;
};

async function checkGateway(host: string, port: number): Promise<GatewayProbe> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let finished = false;

    const finish = (ok: boolean, error?: string) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve({
        ok,
        host,
        port,
        latencyMs: ok ? Date.now() - start : null,
        error: error ?? null
      });
    };

    socket.setTimeout(1200);

    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false, "timeout"));
    socket.once("error", (err) => finish(false, err.message));

    socket.connect(port, host);
  });
}

async function waitForGateway(host: string, port: number, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await checkGateway(host, port);
    if (res.ok) return true;
    await sleep(400);
  }
  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatCommand(cmd: CommandDefinition) {
  return [cmd.command, ...cmd.args].join(" ");
}

function listProcesses(): ProcessSnapshot[] {
  return commandRegistry.map((cmd) => {
    const managed = processRegistry.get(cmd.id);
    return snapshotProcess(cmd, managed ?? null);
  });
}

function snapshotProcess(def: CommandDefinition, managed: ManagedProcess | null): ProcessSnapshot {
  const running = Boolean(managed?.child && !managed.child.killed);
  return {
    id: def.id,
    title: def.title,
    command: formatCommand(def),
    cwd: def.cwd,
    running,
    pid: managed?.child?.pid ?? null,
    startedAt: managed?.startedAt?.toISOString() ?? null,
    exitCode: managed?.exitCode ?? null,
    lastLines: managed?.logs.slice(-20) ?? []
  };
}

function startProcess(id: string) {
  const def = commandRegistry.find((cmd) => cmd.id === id);
  if (!def) return { ok: false, error: "unknown id" } as const;
  if (!def.allowRun) return { ok: false, error: "not allowed" } as const;

  const existing = processRegistry.get(id);
  if (existing?.child && !existing.child.killed) {
    return { ok: true, process: snapshotProcess(def, existing) } as const;
  }

  const child = spawn(def.command, def.args, {
    cwd: def.cwd,
    env: process.env
  });

  const managed: ManagedProcess = {
    def,
    child,
    logs: [],
    startedAt: new Date(),
    exitCode: null
  };

  processRegistry.set(id, managed);

  const pushLog = (chunk: string) => {
    const lines = chunk.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return;
    managed.logs.push(...lines.map((line) => line.slice(0, 1000)));
    if (managed.logs.length > 200) {
      managed.logs.splice(0, managed.logs.length - 200);
    }
  };

  child.stdout?.on("data", (chunk) => pushLog(chunk.toString()));
  child.stderr?.on("data", (chunk) => pushLog(chunk.toString()));

  child.on("close", (code) => {
    managed.exitCode = code ?? null;
  });

  return { ok: true, process: snapshotProcess(def, managed) } as const;
}

function stopProcess(id: string) {
  const def = commandRegistry.find((cmd) => cmd.id === id);
  if (!def) return { ok: false, error: "unknown id" } as const;

  const managed = processRegistry.get(id);
  if (!managed?.child) {
    return { ok: true, process: snapshotProcess(def, managed ?? null) } as const;
  }

  managed.child.kill("SIGTERM");

  setTimeout(() => {
    if (managed.child && !managed.child.killed) {
      managed.child.kill("SIGKILL");
    }
  }, 2000);

  return { ok: true, process: snapshotProcess(def, managed) } as const;
}
