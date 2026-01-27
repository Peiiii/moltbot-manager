import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StatusPill, type StatusTone } from "@/components/status-pill";

export function StepCard({
  title,
  description,
  tone,
  badge,
  children
}: {
  title: string;
  description: string;
  tone: StatusTone;
  badge: string;
  children?: ReactNode;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-ink">
            {title}
            <ChevronRight className="h-4 w-4 text-muted" />
          </div>
          <p className="mt-2 text-sm text-muted">{description}</p>
        </div>
        <StatusPill label={badge} tone={tone} />
      </div>
      {children}
    </Card>
  );
}
