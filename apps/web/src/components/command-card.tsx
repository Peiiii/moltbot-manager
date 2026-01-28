import { useState } from "react";
import { ChevronDown, Copy, Play, Square, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { CommandEntry, ProcessEntry } from "@/store/status-store";

export function CommandCard({
  command,
  process,
  onRun,
  onStop
}: {
  command: CommandEntry;
  process?: ProcessEntry;
  onRun: () => Promise<void>;
  onStop: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const running = Boolean(process?.running);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Terminal className="h-4 w-4" />
            {command.title}
          </div>
          <p className="mt-2 text-sm text-muted">{command.description}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails((value) => !value)}
          >
            <ChevronDown className={cn("h-4 w-4 transition", showDetails && "rotate-180")} />
            Details
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className={cn(copied && "border-success text-success")}
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copied" : "Copy"}
          </Button>
          {command.allowRun ? (
            running ? (
              <Button type="button" variant="danger" size="sm" onClick={onStop}>
                <Square className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={onRun}>
                <Play className="h-4 w-4" />
                Run
              </Button>
            )
          ) : null}
        </div>
      </div>
      {showDetails ? (
        <>
          <Separator />
          <div className="rounded-2xl bg-ink/5 px-4 py-3 text-xs text-ink">
            <code className="break-words">{command.command}</code>
          </div>
          {process?.lastLines?.length ? (
            <div className="rounded-2xl border border-line/60 bg-white/70 px-4 py-3 text-xs text-ink">
              <div className="mb-2 text-[11px] uppercase tracking-widest text-muted">
                Recent output
              </div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap leading-relaxed">
                {process.lastLines.join("\n")}
              </pre>
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
