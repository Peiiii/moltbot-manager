import type { Handler } from "hono";

import type { ApiDeps } from "../deps.js";
import { buildStatus } from "../services/status.service.js";

export function createStatusHandler(deps: ApiDeps): Handler {
  return async (c) => {
    const data = await buildStatus(deps, {
      gatewayHost: c.req.query("gatewayHost") ?? undefined,
      gatewayPort: c.req.query("gatewayPort") ?? undefined
    });
    return c.json(data);
  };
}
