import type { ApiDeps } from "../deps.js";
import { getCliStatus } from "../lib/system.js";
import { runCommandWithLogs } from "../lib/runner.js";
import { parsePositiveInt } from "../lib/utils.js";
import { runQuickstart, type QuickstartRequest } from "./quickstart.service.js";

export function createCliInstallJob(deps: ApiDeps) {
  const job = deps.jobStore.createJob("Install Clawdbot CLI");
  deps.jobStore.startJob(job.id);
  deps.jobStore.appendLog(job.id, "开始安装 Clawdbot CLI...");

  const timeoutMs = parsePositiveInt(process.env.MANAGER_CLI_INSTALL_TIMEOUT_MS) ?? 600_000;

  void (async () => {
    const current = await getCliStatus(deps.runCommand);
    if (current.installed) {
      deps.jobStore.appendLog(job.id, `CLI 已安装${current.version ? `（${current.version}）` : ""}。`);
      deps.jobStore.completeJob(job.id, { version: current.version ?? null });
      return;
    }

    await runCommandWithLogs("npm", ["i", "-g", "clawdbot@latest"], {
      cwd: deps.repoRoot,
      env: {
        ...process.env,
        NPM_CONFIG_AUDIT: "false",
        NPM_CONFIG_FUND: "false"
      },
      timeoutMs,
      onLog: (line) => deps.jobStore.appendLog(job.id, line)
    });

    const cli = await getCliStatus(deps.runCommand);
    if (cli.version) {
      deps.jobStore.appendLog(job.id, `CLI 版本: ${cli.version}`);
    }
    deps.jobStore.completeJob(job.id, { version: cli.version ?? null });
  })().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    deps.jobStore.appendLog(job.id, `安装失败: ${message}`);
    deps.jobStore.failJob(job.id, message);
  });

  return job.id;
}

export function createQuickstartJob(deps: ApiDeps, body: QuickstartRequest) {
  const job = deps.jobStore.createJob("Quickstart");
  deps.jobStore.startJob(job.id);
  deps.jobStore.appendLog(job.id, "开始执行快速启动...");

  void runQuickstart(deps, body, (line) => deps.jobStore.appendLog(job.id, line))
    .then((result) => {
      if (!result.ok) {
        deps.jobStore.appendLog(job.id, `快速启动失败: ${result.error}`);
        deps.jobStore.failJob(job.id, result.error);
        return;
      }
      deps.jobStore.appendLog(job.id, "快速启动完成。");
      deps.jobStore.completeJob(job.id, {
        gatewayReady: result.gatewayReady,
        probeOk: result.probeOk ?? null
      });
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      deps.jobStore.appendLog(job.id, `快速启动失败: ${message}`);
      deps.jobStore.failJob(job.id, message);
    });

  return job.id;
}
