import type { Handler } from "hono";

import type { ApiDeps } from "../deps.js";
import { installCli } from "../services/cli.service.js";

export function createCliInstallHandler(deps: ApiDeps): Handler {
  return async (c) => {
    const result = await installCli(deps.runCommand);
    if (result.ok) {
      return c.json(result);
    }
    return c.json(result, 500);
  };
}
