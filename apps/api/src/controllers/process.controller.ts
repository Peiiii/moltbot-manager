import type { Handler } from "hono";

import type { ApiDeps } from "../deps.js";
import { listProcesses, startProcess, stopProcess } from "../services/process.service.js";

export function createProcessListHandler(deps: ApiDeps): Handler {
  return (c) => {
    return c.json({ ok: true, processes: listProcesses(deps) });
  };
}

export function createProcessStartHandler(deps: ApiDeps): Handler {
  return async (c) => {
    const body = await c.req.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id : null;
    if (!id) return c.json({ ok: false, error: "missing id" }, 400);

    const result = startProcess(deps, id);
    return c.json(result.ok ? { ok: true, process: result.process } : result, result.ok ? 200 : 400);
  };
}

export function createProcessStopHandler(deps: ApiDeps): Handler {
  return async (c) => {
    const body = await c.req.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id : null;
    if (!id) return c.json({ ok: false, error: "missing id" }, 400);

    const result = stopProcess(deps, id);
    return c.json(result.ok ? { ok: true, process: result.process } : result, result.ok ? 200 : 400);
  };
}
