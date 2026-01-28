import { DEFAULT_GATEWAY_HOST, DEFAULT_GATEWAY_PORT } from "../lib/constants.js";
import { checkGateway, waitForGateway } from "../lib/gateway.js";
import { getCliStatus } from "../lib/system.js";
import { parsePort } from "../lib/utils.js";
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
    log?.("启动网关中...");
    const started = deps.processManager.startProcess("gateway-run");
    if (!started.ok) {
      return { ok: false, error: started.error ?? "unknown", status: 500 };
    }
    gatewayReady = await waitForGateway(gatewayHost, gatewayPort, 12_000);
    if (!gatewayReady) {
      log?.("网关启动超时。");
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
