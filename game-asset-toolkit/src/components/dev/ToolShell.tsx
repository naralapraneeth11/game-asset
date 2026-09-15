"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ToolShellProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function ToolShell({
  title,
  description,
  children,
  actions,
  className,
}: ToolShellProps) {
  return (
    <div className={cn("flex min-h-full flex-col", className)}>
      <div className="border-b border-border px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
      </div>
      <div className="flex-1 px-6 py-6 sm:px-8">{children}</div>
    </div>
  );
}
