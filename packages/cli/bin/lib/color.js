export function colorize(text, code) {
    if (!shouldColor())
        return text;
    return `\u001b[${code}m${text}\u001b[0m`;
}
export function cyan(text) {
    return colorize(text, 36);
}
export function dim(text) {
    return colorize(text, 90);
}
function shouldColor() {
    if (process.env.NO_COLOR)
        return false;
    return Boolean(process.stdout.isTTY);
}
