import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_API_PORT = 17321;
const DEFAULT_WEB_URL = "http://127.0.0.1:5179";

const repoRoot = resolveRepoRoot();
const apiPort = Number(
  process.env.MANAGER_API_PORT ?? process.env.ONBOARDING_API_PORT ?? DEFAULT_API_PORT
);
const webUrl = process.env.MANAGER_WEB_URL ?? process.env.ONBOARDING_WEB_URL ?? DEFAULT_WEB_URL;
const openBrowser =
  (process.env.MANAGER_OPEN_BROWSER ?? process.env.ONBOARDING_OPEN_BROWSER) !== "0";
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const viteCacheDir =
  process.env.VITE_CACHE_DIR ?? path.join(os.tmpdir(), "clawdbot-manager-vite");

const apiProcess = spawnWithLabel("api", "pnpm", ["--filter", "clawdbot-manager-api", "dev"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    MANAGER_API_PORT: String(apiPort),
    ONBOARDING_API_PORT: String(apiPort)
  }
});

const webProcess = spawnWithLabel("web", "pnpm", ["--filter", "clawdbot-manager-web", "dev"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    VITE_CACHE_DIR: viteCacheDir,
    VITE_MANAGER_API_URL: apiBaseUrl,
    VITE_ONBOARDING_API_URL: apiBaseUrl
  }
});

const shutdown = () => {
  apiProcess.kill("SIGTERM");
  webProcess.kill("SIGTERM");
  setTimeout(() => {
    apiProcess.kill("SIGKILL");
    webProcess.kill("SIGKILL");
    process.exit(0);
  }, 2000).unref();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

(async () => {
  const ready = await waitForUrl(webUrl, 20_000);
  if (!ready) {
    console.error(`[manager] UI did not become ready at ${webUrl}`);
    return;
  }
  console.log(`[manager] UI ready: ${webUrl}`);
  if (openBrowser) {
    await openInBrowser(webUrl);
  }
})();

function spawnWithLabel(
  label: string,
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv }
) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["inherit", "pipe", "pipe"]
  });

  const prefix = `[${label}] `;
  child.stdout?.on("data", (chunk) => {
    process.stdout.write(prefix + chunk.toString());
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(prefix + chunk.toString());
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
    }
  });

  return child;
}

async function waitForUrl(url: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) return true;
    } catch {
      // retry
    }
    await sleep(400);
  }
  return false;
}

async function openInBrowser(url: string) {
  const platform = process.platform;
  if (platform === "darwin") {
    await spawnDetached("open", [url]);
    return;
  }
  if (platform === "win32") {
    await spawnDetached("cmd", ["/c", "start", "", url]);
    return;
  }
  await spawnDetached("xdg-open", [url]);
}

async function spawnDetached(command: string, args: string[]) {
  try {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
  } catch {
    // ignore
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveRepoRoot(): string {
  const envRoot = process.env.MANAGER_REPO_ROOT ?? process.env.ONBOARDING_REPO_ROOT;
  if (envRoot) return path.resolve(envRoot);

  const startPoints = [process.cwd(), path.dirname(fileURLToPath(import.meta.url))];
  for (const start of startPoints) {
    const found = findRepoRoot(start);
    if (found) return found;
  }
  return path.resolve(process.cwd(), "../..");
}

function findRepoRoot(start: string): string | null {
  let current = start;
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(current, "package.json");
    if (exists(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, "utf-8");
        const parsed = JSON.parse(raw) as { name?: string };
        if (parsed.name === "clawdbot-manager") return current;
      } catch {
        // ignore and continue
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function exists(p: string) {
  try {
    return Boolean(p && fs.existsSync(p));
  } catch {
    return false;
  }
}
