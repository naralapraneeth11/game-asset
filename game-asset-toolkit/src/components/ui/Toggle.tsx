"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export default function Toggle({
  checked,
  onChange,
  className,
  disabled = false,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-[28px] w-[48px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
        checked ? "bg-[#FF6B00]" : "bg-neutral-200 dark:bg-neutral-700",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <motion.span
        layout
        transition={{
          type: "spring",
          stiffness: 600,
          damping: 28,
          mass: 0.7,
        }}
        className={cn(
          "pointer-events-none absolute top-[3px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white",
          "shadow-[0_1px_3px_rgba(0,0,0,0.15),0_1px_2px_rgba(0,0,0,0.1)]"
        )}
        style={{
          left: checked ? 23 : 3,
        }}
      />
    </button>
  );
}
