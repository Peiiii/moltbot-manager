import { spawnSync } from "node:child_process";
import process from "node:process";

const project = process.env.CLOUDFLARE_PAGES_PROJECT ?? "clawdbot-manager";
const branch = process.env.CLOUDFLARE_PAGES_BRANCH ?? "main";

const result = spawnSync(
  "pnpm",
  ["exec", "wrangler", "pages", "deploy", "dist", "--project-name", project, "--branch", branch],
  { stdio: "inherit" }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`[pages] deploy complete: https://${project}.pages.dev`);
