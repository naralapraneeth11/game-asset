import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-[background-color,border-color,color,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-45";
const variants: Record<Variant, string> = {
  // Disabled primaries go neutral: faded orange reads as brown, especially in dark mode.
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-active disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100",
  secondary: "border border-border bg-surface-elevated text-foreground hover:border-border-strong active:bg-hover",
  ghost: "text-muted-foreground hover:bg-hover hover:text-foreground active:text-accent-text",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

/** Class names for the three button styles shared by every tool. One primary button per state. */
export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}
