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
  | { ok: false; error: string; status: 400 | 500 };

export async function runQuickstart(
  deps: ApiDeps,
  body: QuickstartRequest
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

  const cli = await getCliStatus(deps.runCommand);
  if (!cli.installed) {
    return { ok: false, error: "clawdbot CLI not installed", status: 400 };
  }

  if (startGateway) {
    const started = deps.processManager.startProcess("gateway-run");
    if (!started.ok) {
      return { ok: false, error: started.error ?? "unknown", status: 500 };
    }
    gatewayReady = await waitForGateway(gatewayHost, gatewayPort, 12_000);
  } else {
    const snapshot = await checkGateway(gatewayHost, gatewayPort);
    gatewayReady = snapshot.ok;
  }

  if (runProbe) {
    probeOk = await deps
      .runCommand("clawdbot", ["channels", "status", "--probe"], 12_000)
      .then(() => true)
      .catch(() => false);
    setLastProbe(Boolean(probeOk));
  }

  return { ok: true, gatewayReady, probeOk };
}
