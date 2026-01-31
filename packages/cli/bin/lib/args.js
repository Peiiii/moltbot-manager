const longKeyMap = {
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
const shortKeyMap = {
    h: "help",
    v: "version",
    u: "user",
    p: "pass"
};
const validKeys = new Set(Object.values(longKeyMap));
export function parseArgs(argv) {
    const flags = {};
    const positionals = [];
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
                flags[key] = true;
            }
            else if (inlineValue !== undefined) {
                setFlag(flags, key, inlineValue);
            }
            else if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
                setFlag(flags, key, argv[i + 1]);
                i += 1;
            }
            else {
                flags[key] = true;
            }
            continue;
        }
        if (arg.startsWith("-") && arg.length > 1) {
            const shorts = arg.slice(1).split("");
            for (const short of shorts) {
                const mapped = shortKeyMap[short] ?? short;
                if (mapped === "help" || mapped === "version") {
                    flags[mapped] = true;
                }
                else if (mapped === "user" || mapped === "pass") {
                    if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
                        setFlag(flags, mapped, argv[i + 1]);
                        i += 1;
                    }
                    else {
                        flags[mapped] = true;
                    }
                }
                else {
                    flags[mapped] = true;
                }
            }
            continue;
        }
        positionals.push(arg);
    }
    const command = (positionals[0] ?? "");
    return { command, flags };
}
function setFlag(flags, key, value) {
    if (!validKeys.has(key))
        return;
    if (key === "apiPort") {
        const num = Number(value);
        if (Number.isFinite(num)) {
            flags.apiPort = num;
            return;
        }
    }
    flags[key] = value;
}
