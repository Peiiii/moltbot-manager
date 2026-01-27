import type { Handler } from "hono";

import type { ApiDeps } from "../deps.js";
import { runQuickstart, type QuickstartRequest } from "../services/quickstart.service.js";

export function createQuickstartHandler(deps: ApiDeps): Handler {
  return async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as QuickstartRequest;
    const result = await runQuickstart(deps, body);
    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, result.status);
    }
    return c.json(result);
  };
}
