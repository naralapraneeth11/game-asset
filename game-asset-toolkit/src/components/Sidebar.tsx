"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Scaling,
  Box,
  Grid3X3,
  Package,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "./SegmentedControl";
import { useTheme } from "@/lib/theme";

const tools = [
  {
    name: "Image Scaler",
    description: "1x / 2x / 3x export",
    icon: Scaling,
    href: "/tools/1x-2x-3x-converter",
  },
  {
    name: "3D Converter",
    description: "OBJ · GLB · USD · more",
    icon: Box,
    href: "/tools/3d-converter",
  },
  {
    name: "Sprite Packer",
    description: "Atlas + JSON metadata",
    icon: Grid3X3,
    href: "/tools/sprite-packer",
  },
] as const;

const soonTools = [
  { name: "Batch Export", icon: Package },
];

function SidebarNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <>
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
          <Layers className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Game Asset Toolkit
        </span>
      </Link>

      <nav className="mt-7 flex flex-1 flex-col gap-1 px-2">
        <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Tools
        </p>

        {tools.map((tool) => {
          const active = pathname === tool.href;
          return (
            <Link
              key={tool.name}
              href={tool.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-neutral-900 font-medium text-white dark:bg-white dark:text-neutral-900"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <tool.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <div className="min-w-0">
                <div className="truncate">{tool.name}</div>
              </div>
            </Link>
          );
        })}

        {soonTools.map((tool) => (
          <div
            key={tool.name}
            className="flex cursor-default items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-muted-foreground/50"
          >
            <tool.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="flex-1">{tool.name}</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70">
              Soon
            </span>
          </div>
        ))}
      </nav>

      <div className="px-2 pt-4">
        <p className="px-2.5 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Appearance
        </p>
        <SegmentedControl
          layoutId="theme-switch"
          size="sm"
          value={theme}
          onChange={setTheme}
          className="w-full justify-between"
          options={[
            {
              value: "light",
              label: "Light",
              icon: <Sun className="h-3.5 w-3.5" />,
            },
            {
              value: "dark",
              label: "Dark",
              icon: <Moon className="h-3.5 w-3.5" />,
            },
            {
              value: "system",
              label: "System",
              icon: <Monitor className="h-3.5 w-3.5" />,
            },
          ]}
        />
      </div>
    </>
  );
}

export default function Sidebar() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-[var(--sidebar)] py-5 md:flex">
        <SidebarNav />
      </aside>

      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            Game Asset Toolkit
          </span>
        </Link>
      </div>
    </>
  );
}
