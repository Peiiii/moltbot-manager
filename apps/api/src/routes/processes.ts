import type { Hono } from "hono";

import type { ApiDeps } from "../deps.js";
import {
  createProcessListHandler,
  createProcessStartHandler,
  createProcessStopHandler
} from "../controllers/process.controller.js";

export function registerProcessRoutes(app: Hono, deps: ApiDeps) {
  app.get("/api/processes", createProcessListHandler(deps));
  app.post("/api/processes/start", createProcessStartHandler(deps));
  app.post("/api/processes/stop", createProcessStopHandler(deps));
}
