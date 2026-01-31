import fs from "node:fs";
import path from "node:path";
import { resolvePackageRoot } from "./paths.js";
export function readPackageVersion() {
    try {
        const pkgRoot = resolvePackageRoot();
        const pkgPath = path.join(pkgRoot, "package.json");
        const raw = fs.readFileSync(pkgPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.version && typeof parsed.version === "string")
            return parsed.version;
    }
    catch {
        // ignore
    }
    return "0.0.0";
}
