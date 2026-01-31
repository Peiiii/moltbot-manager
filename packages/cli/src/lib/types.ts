export type CliCommand = "" | "start" | "stop" | "stop-all" | "reset" | "help";

export type StringFlag = string | boolean | undefined;

export interface CliFlags {
  help?: boolean;
  version?: boolean;
  user?: string;
  pass?: string;
  apiPort?: number;
  apiHost?: string;
  configDir?: string;
  configPath?: string;
  logPath?: string;
  errorLogPath?: string;
  nonInteractive?: boolean;
}

export interface ParsedArgs {
  command: CliCommand;
  flags: CliFlags;
}
