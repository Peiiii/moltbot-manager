import { getCliStatus } from "../lib/system.js";
import { parsePositiveInt } from "../lib/utils.js";
import type { CommandRunner } from "../lib/runner.js";

export async function installCli(runCommand: CommandRunner) {
  const cli = await getCliStatus(runCommand);
  if (cli.installed) {
    return { ok: true, alreadyInstalled: true, version: cli.version } as const;
  }

  const timeoutMs = parsePositiveInt(process.env.MANAGER_CLI_INSTALL_TIMEOUT_MS) ?? 600_000;

  try {
    await runCommand(
      "npm",
      ["i", "-g", "clawdbot@latest"],
      timeoutMs,
      {
        ...process.env,
        NPM_CONFIG_AUDIT: "false",
        NPM_CONFIG_FUND: "false"
      }
    );
    const updated = await getCliStatus(runCommand);
    return { ok: true, version: updated.version } as const;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) } as const;
  }
}
