import type { Hono } from "hono";

import type { ApiDeps } from "../deps.js";
import {
  createDiscordPairingHandler,
  createDiscordTokenHandler
} from "../controllers/discord.controller.js";

export function registerDiscordRoutes(app: Hono, deps: ApiDeps) {
  app.post("/api/discord/token", createDiscordTokenHandler(deps));
  app.post("/api/discord/pairing", createDiscordPairingHandler(deps));
}
