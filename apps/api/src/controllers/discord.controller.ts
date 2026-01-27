import type { Handler } from "hono";

import type { ApiDeps } from "../deps.js";
import { approveDiscordPairing, saveDiscordToken } from "../services/discord.service.js";

export function createDiscordTokenHandler(deps: ApiDeps): Handler {
  return async (c) => {
    const body = await c.req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) return c.json({ ok: false, error: "missing token" }, 400);

    const result = await saveDiscordToken(deps.runCommand, token);
    return c.json(result, result.ok ? 200 : 500);
  };
}

export function createDiscordPairingHandler(deps: ApiDeps): Handler {
  return async (c) => {
    const body = await c.req.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!code) return c.json({ ok: false, error: "missing code" }, 400);

    const result = await approveDiscordPairing(deps.runCommand, code);
    return c.json(result, result.ok ? 200 : 500);
  };
}
