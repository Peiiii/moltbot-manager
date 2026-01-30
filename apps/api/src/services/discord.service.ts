import type { CommandRunner } from "../lib/runner.js";

export async function saveDiscordToken(runCommand: CommandRunner, token: string) {
  const args = ["config", "set", "channels.discord.token", token];
  try {
    await runCommand("clawdbot", args, 8000);
    await ensureDiscordDmAllow(runCommand);
    return { ok: true } as const;
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

export async function approveDiscordPairing(runCommand: CommandRunner, code: string) {
  const args = ["pairing", "approve", "discord", code];
  return runCommand("clawdbot", args, 8000)
    .then(() => ({ ok: true } as const))
    .catch((err: unknown) => ({
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    }));
}

async function ensureDiscordDmAllow(runCommand: CommandRunner) {
  const value = await runCommand(
    "clawdbot",
    ["config", "get", "channels.discord.dm.allowFrom", "--json"],
    4000
  ).catch(() => null);

  if (value) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed === "*" || (Array.isArray(parsed) && parsed.length > 0)) {
        return;
      }
    } catch {
      // ignore parse failure and attempt to set
    }
  }

  await runCommand(
    "clawdbot",
    ["config", "set", "channels.discord.dm.allowFrom", "*"],
    8000
  );
}
