import type { Hono } from "hono";

import type { ApiDeps } from "../deps.js";
import { createCliInstallHandler } from "../controllers/cli.controller.js";

export function registerCliRoutes(app: Hono, deps: ApiDeps) {
  app.post("/api/cli/install", createCliInstallHandler(deps));
}
