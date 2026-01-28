import { DEFAULT_GATEWAY_HOST, DEFAULT_GATEWAY_PORT } from "../lib/constants.js";
import { checkGateway, waitForGateway } from "../lib/gateway.js";
import { runCommandWithLogs } from "../lib/runner.js";
import { getCliStatus } from "../lib/system.js";
import { parsePort, parsePositiveInt, sleep } from "../lib/utils.js";
import { setLastProbe } from "../lib/onboarding.js";
import type { ApiDeps } from "../deps.js";

export type QuickstartRequest = {
  runProbe?: boolean;
  startGateway?: boolean;
  gatewayHost?: string;
  gatewayPort?: string;
};

type QuickstartResult =
  | { ok: true; gatewayReady: boolean; probeOk?: boolean }
  | { ok: false; error: string; status: 400 | 500 | 504 };

export async function runQuickstart(
  deps: ApiDeps,
  body: QuickstartRequest,
  log?: (line: string) => void
): Promise<QuickstartResult> {
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
  const gatewayTimeoutMs = parsePositiveInt(process.env.MANAGER_GATEWAY_TIMEOUT_MS) ?? 20_000;

  log?.("检查 CLI 环境...");
  const cli = await getCliStatus(deps.runCommand);
  if (!cli.installed) {
    log?.("未检测到 CLI。");
    return { ok: false, error: "clawdbot CLI not installed", status: 400 };
  }
  if (cli.version) {
    log?.(`CLI 版本: ${cli.version}`);
  }

  if (startGateway) {
    log?.("初始化网关配置...");
    await runCommandWithLogs("clawdbot", ["config", "set", "gateway.mode", "local"], {
      cwd: deps.repoRoot,
      env: process.env,
      timeoutMs: 8000,
      onLog: (line) => log?.(`[config] ${line}`)
    });

    const gatewayArgs = [
      "gateway",
      "run",
      "--allow-unconfigured",
      "--bind",
      "loopback",
      "--port",
      String(gatewayPort),
      "--force"
    ];

    log?.("启动网关中...");
    const started = deps.processManager.startProcess("gateway-run", {
      args: gatewayArgs,
      onLog: (line) => log?.(`[gateway] ${line}`)
    });
    if (!started.ok) {
      return { ok: false, error: started.error ?? "unknown", status: 500 };
    }
    await sleep(500);
    const earlySnapshot = deps.processManager
      .listProcesses()
      .find((process) => process.id === "gateway-run");
    if (earlySnapshot && !earlySnapshot.running) {
      if (earlySnapshot.lastLines.length) {
        log?.("网关进程已退出，输出如下：");
        for (const line of earlySnapshot.lastLines) {
          log?.(`[gateway] ${line}`);
        }
      }
      return { ok: false, error: "gateway process exited", status: 500 };
    }

    gatewayReady = await waitForGateway(gatewayHost, gatewayPort, gatewayTimeoutMs);
    if (!gatewayReady) {
      log?.("网关启动超时。");
      const snapshot = deps.processManager
        .listProcesses()
        .find((process) => process.id === "gateway-run");
      if (snapshot?.lastLines?.length) {
        log?.("网关进程输出（最近日志）：");
        for (const line of snapshot.lastLines) {
          log?.(`[gateway] ${line}`);
        }
      }
      if (snapshot && snapshot.exitCode !== null) {
        log?.(`网关进程已退出，exit code: ${snapshot.exitCode}`);
      }
      return { ok: false, error: "gateway not ready", status: 504 };
    }
    log?.("网关已就绪。");
  } else {
    log?.("检查网关状态...");
    const snapshot = await checkGateway(gatewayHost, gatewayPort);
    gatewayReady = snapshot.ok;
    log?.(gatewayReady ? "网关已就绪。" : "网关未就绪。");
  }

  if (runProbe) {
    log?.("执行通道探测...");
    probeOk = await deps
      .runCommand("clawdbot", ["channels", "status", "--probe"], 12_000)
      .then(() => true)
      .catch(() => false);
    setLastProbe(Boolean(probeOk));
    log?.(probeOk ? "通道探测通过。" : "通道探测未通过。");
  }

  return { ok: true, gatewayReady, probeOk };
}
