import { readPackageVersion } from "./version.js";

const BANNER_LINES = [
  "   ____                 __      __           __  ___                                  ",
  "  / __ \\____  ___  ____/ /___ _/ /___  _____/  |/  /___ _____  ____ _____  _____     ",
  " / / / / __ \\/ _ \\/ __  / __ `/ / __ \\___/ /|_/ / __ `/ __ \\/ __ `/ __ \\/ ___/     ",
  "/ /_/ / /_/ /  __/ /_/ / /_/ / / / / / /__/ /  / / /_/ / / / / /_/ / /_/ / /         ",
  "\\____/ .___/\\___/\\__,_/\\__,_/_/_/ /_/\\___/_/  /_/\\__,_/_/ /_/\\__,_/\\____/_/          ",
  "    /_/                                                                           "
];

export function printBanner(): void {
  const version = readPackageVersion();
  console.log(`${BANNER_LINES.join("\n")}\nopenclaw-manager ${version}`);
}
