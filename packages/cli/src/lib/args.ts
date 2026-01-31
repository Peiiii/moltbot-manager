import type { CliCommand, CliFlags, ParsedArgs } from "./types.js";

const longKeyMap: Record<string, keyof CliFlags> = {
  help: "help",
  version: "version",
  user: "user",
  username: "user",
  pass: "pass",
  password: "pass",
  "api-port": "apiPort",
  "api-host": "apiHost",
  "config-dir": "configDir",
  "config-path": "configPath",
  "log-path": "logPath",
  "error-log-path": "errorLogPath",
  "non-interactive": "nonInteractive"
};

const shortKeyMap: Record<string, keyof CliFlags> = {
  h: "help",
  v: "version",
  u: "user",
  p: "pass"
};

const validKeys = new Set<keyof CliFlags>(Object.values(longKeyMap));

export function parseArgs(argv: string[]): ParsedArgs {
  const flags: CliFlags = {};
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (arg.startsWith("--")) {
      const [rawKey, inlineValue] = arg.slice(2).split("=");
      const key = longKeyMap[rawKey] ?? rawKey;
      if (key === "help" || key === "version" || key === "nonInteractive") {
        (flags as Record<string, boolean>)[key] = true;
      } else if (inlineValue !== undefined) {
        setFlag(flags, key, inlineValue);
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
        setFlag(flags, key, argv[i + 1]);
        i += 1;
      } else {
        (flags as Record<string, boolean>)[key] = true;
      }
      continue;
    }
    if (arg.startsWith("-") && arg.length > 1) {
      const shorts = arg.slice(1).split("");
      for (const short of shorts) {
        const mapped = shortKeyMap[short] ?? short;
        if (mapped === "help" || mapped === "version") {
          (flags as Record<string, boolean>)[mapped] = true;
        } else if (mapped === "user" || mapped === "pass") {
          if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
            setFlag(flags, mapped, argv[i + 1]);
            i += 1;
          } else {
            (flags as Record<string, boolean>)[mapped] = true;
          }
        } else {
          (flags as Record<string, boolean>)[mapped] = true;
        }
      }
      continue;
    }
    positionals.push(arg);
  }

  const command = (positionals[0] ?? "") as CliCommand;
  return { command, flags };
}

function setFlag(flags: CliFlags, key: string, value: string) {
  if (!validKeys.has(key as keyof CliFlags)) return;
  if (key === "apiPort") {
    const num = Number(value);
    if (Number.isFinite(num)) {
      flags.apiPort = num;
      return;
    }
  }
  (flags as Record<string, string>)[key] = value;
}
