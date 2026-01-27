import type { CommandRunner } from "../lib/runner.js";

export async function saveDiscordToken(runCommand: CommandRunner, token: string) {
  const args = ["config", "set", "channels.discord.token", token];
  return runCommand("clawdbot", args, 8000)
    .then(() => ({ ok: true } as const))
    .catch((err: unknown) => ({
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    }));
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
