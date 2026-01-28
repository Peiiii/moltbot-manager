import { cn } from "@/lib/utils";

interface JobLogPanelProps {
  title: string;
  logs: string[];
  status: string;
  className?: string;
}

export function JobLogPanel({ title, logs, status, className }: JobLogPanelProps) {
  if (logs.length === 0) return null;
  const label = status === "running" ? title : `${title}（已完成）`;

  return (
    <div className={cn("rounded-2xl bg-black/80 p-4 text-left text-xs text-emerald-200", className)}>
      <div className="mb-2 text-[11px] uppercase tracking-widest text-emerald-300">
        {label}
      </div>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap">{logs.join("\n")}</pre>
    </div>
  );
}
