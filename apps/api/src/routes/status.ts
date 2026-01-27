import type { Hono } from "hono";

import type { ApiDeps } from "../deps.js";
import { createStatusHandler } from "../controllers/status.controller.js";

export function registerStatusRoutes(app: Hono, deps: ApiDeps) {
  app.get("/api/status", createStatusHandler(deps));
}
