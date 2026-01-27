import type { Handler } from "hono";

import type { ApiDeps } from "../deps.js";
import { getAuthStatus, loginWithCredentials } from "../services/auth.service.js";

export function createAuthStatusHandler(deps: ApiDeps): Handler {
  return (c) => {
    const status = getAuthStatus(deps.auth.disabled);
    return c.json({ ok: true, ...status });
  };
}

export function createAuthLoginHandler(deps: ApiDeps): Handler {
  return async (c) => {
    const body = await c.req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const result = loginWithCredentials(deps.auth.disabled, username, password);
    if (result.ok) {
      return c.json({ ok: true, disabled: result.disabled });
    }
    return c.json({ ok: false, error: result.error }, result.status);
  };
}
