"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Image as ImageIcon,
  Grid3X3,
  Box,
  Package,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tools = [
  {
    name: "1x / 2x / 3x Scaler",
    href: "/tools/1x-2x-3x-converter",
    icon: ImageIcon,
    description: "Retina & pixel-perfect scales",
  },
  {
    name: "Sprite Packer",
    href: "/tools/sprite-packer",
    icon: Grid3X3,
    description: "Coming soon",
    disabled: true,
  },
  {
    name: "Texture Tools",
    href: "/tools/texture-tools",
    icon: Sparkles,
    description: "Coming soon",
    disabled: true,
  },
  {
    name: "3D Helpers",
    href: "/tools/3d-helpers",
    icon: Box,
    description: "Coming soon",
    disabled: true,
  },
  {
    name: "Batch Export",
    href: "/tools/batch-export",
    icon: Package,
    description: "Coming soon",
    disabled: true,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-[var(--sidebar-border)] px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-white">
          <Layers className="h-3.5 w-3.5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold tracking-tight text-neutral-900">
            Game Asset Toolkit
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
          Tools
        </p>
        <ul className="space-y-0.5">
          {tools.map((tool) => {
            const isActive = pathname === tool.href;
            const Icon = tool.icon;

            if (tool.disabled) {
              return (
                <li key={tool.href}>
                  <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-neutral-400 opacity-60">
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{tool.name}</div>
                      <div className="truncate text-[11px] text-neutral-400">
                        {tool.description}
                      </div>
                    </div>
                  </div>
                </li>
              );
            }

            return (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
                    isActive
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-100"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-white" : "text-neutral-500"
                    )}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{tool.name}</div>
                    <div
                      className={cn(
                        "truncate text-[11px]",
                        isActive ? "text-neutral-300" : "text-neutral-400"
                      )}
                    >
                      {tool.description}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--sidebar-border)] px-4 py-3">
        <p className="text-[11px] text-neutral-400">
          100% local processing
        </p>
      </div>
    </aside>
  );
}
