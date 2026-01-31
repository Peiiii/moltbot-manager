#!/usr/bin/env node

import process from "node:process";
import { parseArgs } from "./lib/args.js";
import { printHelp, printWelcome } from "./lib/help.js";
import { readPackageVersion } from "./lib/version.js";
import { startManager } from "./commands/start.js";
import { stopManager } from "./commands/stop.js";
import { stopAll } from "./commands/stop-all.js";
import { resetManager } from "./commands/reset.js";

const args = process.argv.slice(2);
const parsed = parseArgs(args);
const cmd = parsed.command;

if (parsed.flags.help || cmd === "help") {
  printHelp();
  process.exit(0);
}

if (parsed.flags.version) {
  console.log(`openclaw-manager ${readPackageVersion()}`);
  process.exit(0);
}

if (!cmd) {
  printWelcome();
  process.exit(0);
}

try {
  if (cmd === "start") {
    await startManager(parsed.flags);
  } else if (cmd === "stop") {
    const result = stopManager(parsed.flags);
    for (const line of result.messages) console.log(line);
    if (!result.ok) process.exit(1);
  } else if (cmd === "stop-all") {
    const result = stopAll(parsed.flags);
    for (const line of result.messages) console.log(line);
    if (!result.ok) process.exit(1);
  } else if (cmd === "reset") {
    const result = resetManager(parsed.flags);
    for (const line of result.messages) console.log(line);
    if (!result.ok) process.exit(1);
  } else {
    console.error(`[manager] Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
  }
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
}
