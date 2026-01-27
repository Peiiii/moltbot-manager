import { DEFAULT_GATEWAY_HOST, DEFAULT_GATEWAY_PORT } from "../lib/constants.js";
import { checkGateway } from "../lib/gateway.js";
import { getOnboardingStatus } from "../lib/onboarding.js";
import { getCliStatus, getSystemStatus } from "../lib/system.js";
import { parsePort } from "../lib/utils.js";
import type { ApiDeps } from "../deps.js";

export type StatusQuery = {
  gatewayHost?: string;
  gatewayPort?: string;
};

export async function buildStatus(deps: ApiDeps, query: StatusQuery) {
  const gatewayHost = query.gatewayHost ?? DEFAULT_GATEWAY_HOST;
  const gatewayPort = parsePort(query.gatewayPort) ?? DEFAULT_GATEWAY_PORT;

  const [system, cli, gateway] = await Promise.all([
    getSystemStatus(),
    getCliStatus(deps.runCommand),
    checkGateway(gatewayHost, gatewayPort)
  ]);
  const onboarding = await getOnboardingStatus(cli.installed, deps.runCommand);

  return {
    ok: true,
    now: new Date().toISOString(),
    system,
    cli,
    gateway,
    onboarding,
    commands: deps.commandRegistry.map((cmd) => ({
      id: cmd.id,
      title: cmd.title,
      description: cmd.description,
      command: [cmd.command, ...cmd.args].join(" "),
      cwd: cmd.cwd,
      allowRun: cmd.allowRun
    })),
    processes: deps.processManager.listProcesses()
  };
}
