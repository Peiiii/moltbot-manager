import { Badge } from "@/components/ui/badge";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "accent";

export function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  return <Badge variant={tone}>{label}</Badge>;
}
