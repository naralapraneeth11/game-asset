"use client";

import { useState } from "react";
import { ToolShell, CopyButton } from "@/components/dev";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function ColorClient() {
  const [hex, setHex] = useState("#3b82f6");
  const rgb = hexToRgb(hex) || { r: 59, g: 130, b: 246 };

  return (
    <ToolShell title="Color Converter" description="Convert HEX to RGB and preview the color." actions={<CopyButton text={hex} />}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div
          className="h-32 w-32 shrink-0 rounded-2xl border border-border shadow-inner"
          style={{ backgroundColor: hex }}
        />
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">HEX</label>
            <input value={hex} onChange={(e) => setHex(e.target.value)} className="w-40 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm" />
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">RGB:</span>{" "}
            <span className="font-mono">{rgb.r}, {rgb.g}, {rgb.b}</span>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
