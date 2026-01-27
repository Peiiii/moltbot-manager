import * as React from "react";

import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-3xl border border-line/70 bg-white/80 p-6 shadow-soft backdrop-blur",
        className
      )}
      {...props}
    />
  )
);

Card.displayName = "Card";
