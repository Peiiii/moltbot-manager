import { cyan, dim } from "./color.js";
import { readPackageVersion } from "./version.js";
export function printBanner() {
    const version = readPackageVersion();
    const title = cyan("OpenClaw Manager");
    const ver = dim(`v${version}`);
    console.log(`${title} ${ver}`);
}
