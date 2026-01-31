import path from "node:path";
import { fileURLToPath } from "node:url";
export function resolvePackageRoot() {
    const filePath = fileURLToPath(import.meta.url);
    return path.resolve(path.dirname(filePath), "..", "..");
}
