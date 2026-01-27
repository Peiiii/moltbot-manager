import type { ApiDeps } from "../deps.js";

export function listProcesses(deps: ApiDeps) {
  return deps.processManager.listProcesses();
}

export function startProcess(deps: ApiDeps, id: string) {
  return deps.processManager.startProcess(id);
}

export function stopProcess(deps: ApiDeps, id: string) {
  return deps.processManager.stopProcess(id);
}
