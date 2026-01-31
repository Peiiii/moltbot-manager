export function colorize(text: string, code: number): string {
  if (!shouldColor()) return text;
  return `\u001b[${code}m${text}\u001b[0m`;
}

export function cyan(text: string): string {
  return colorize(text, 36);
}

export function dim(text: string): string {
  return colorize(text, 90);
}

function shouldColor(): boolean {
  if (process.env.NO_COLOR) return false;
  return Boolean(process.stdout.isTTY);
}
