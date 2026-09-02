"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  icon,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200",
        checked
          ? "border-[#FF6B00] bg-[#FF6B00]"
          : "border-border bg-muted",
        className
      )}
    >
      <motion.span
        className="absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#FF6B00] shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
        animate={{ x: checked ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 600, damping: 30 }}
      >
        {icon}
      </motion.span>
    </button>
  );
}
