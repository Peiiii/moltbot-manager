import type { Hono } from "hono";

import type { ApiDeps } from "../deps.js";
import { createQuickstartHandler } from "../controllers/quickstart.controller.js";

export function registerQuickstartRoutes(app: Hono, deps: ApiDeps) {
  app.post("/api/quickstart", createQuickstartHandler(deps));
}
