import type { Hono } from "hono";

import type { ApiDeps } from "../deps.js";
import {
  createAiAuthJobHandler,
  createCliInstallJobHandler,
  createDiscordPairingJobHandler,
  createJobStatusHandler,
  createJobStreamHandler,
  createQuickstartJobHandler,
  createResourceDownloadJobHandler
} from "../controllers/jobs.controller.js";

export function registerJobRoutes(app: Hono, deps: ApiDeps) {
  app.post("/api/jobs/cli-install", createCliInstallJobHandler(deps));
  app.post("/api/jobs/quickstart", createQuickstartJobHandler(deps));
  app.post("/api/jobs/discord/pairing", createDiscordPairingJobHandler(deps));
  app.post("/api/jobs/resources/download", createResourceDownloadJobHandler(deps));
  app.post("/api/jobs/ai/auth", createAiAuthJobHandler(deps));
  app.get("/api/jobs/:id", createJobStatusHandler(deps));
  app.get("/api/jobs/:id/stream", createJobStreamHandler(deps));
}
