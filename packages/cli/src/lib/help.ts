import { printBanner } from "./banner.js";

export function printHelp(): void {
  printBanner();
  console.log(
    `\nUsage:\n  openclaw-manager <command> [options]\n\nCommands:\n  start     Start OpenClaw Manager\n  stop      Stop the running Manager process\n  stop-all  Stop Manager, sandboxes, and gateway processes\n\nOptions:\n  -h, --help            Show help\n  -v, --version         Show version\n  -u, --user <name>     Admin username (start)\n  -p, --pass <value>    Admin password (start)\n  --non-interactive     Fail instead of prompting for credentials\n  --api-port <port>     API port (default: 17321)\n  --api-host <host>     API host (default: 0.0.0.0)\n  --config-dir <dir>    Config directory\n  --config-path <path>  Config file path\n`
  );
}

export function printWelcome(): void {
  printBanner();
  console.log(
    `\nQuick start:\n  openclaw-manager start\n\nCommon commands:\n  openclaw-manager stop\n  openclaw-manager stop-all\n\nTip: First start will ask for admin username/password.\nDocs: https://openclaw-manager.com\n`
  );
}
