"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface PresetOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * Up to three big preset buttons that stay selected (a radio group). Arrow
 * keys move between them. `value` may match none of the options when a
 * setting was changed in Advanced.
 */
export function PresetPicker<T extends string | number>({ label, options, value, onChange, disabled, size = "lg", allowEmpty = false, className }: {
  label: string;
  options: readonly PresetOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  disabled?: boolean;
  /** `lg` for the main presets, `sm` for chips such as 10 / 25 / 50 MB. */
  size?: "lg" | "sm";
  /** Clicking the selected chip clears it. */
  allowEmpty?: boolean;
  className?: string;
}) {
  const group = useRef<HTMLDivElement>(null);
  const index = options.findIndex((option) => option.value === value);
  const focusable = index >= 0 ? index : 0;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: number) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (current + delta + options.length) % options.length;
    onChange(options[next].value);
    group.current?.querySelectorAll<HTMLButtonElement>("[role=radio]")[next]?.focus();
  };

  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label={label}
      className={cn(size === "lg" ? "grid gap-2.5 sm:grid-cols-3" : "flex flex-wrap gap-2", className)}
    >
      {options.map((option, position) => {
        const checked = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={position === focusable ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(checked && allowEmpty ? null : option.value)}
            onKeyDown={(event) => onKeyDown(event, position)}
            className={cn(
              "border text-left transition-[border-color,background-color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
              size === "lg" ? "rounded-2xl px-4 py-3.5" : "h-9 rounded-full px-4 text-[13px] font-medium",
              checked
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-surface hover:border-border-strong",
            )}
          >
            {size === "lg" ? (
              <>
                <span className="block text-[15px] font-medium">{option.label}</span>
                {option.hint && <span className={cn("mt-0.5 block text-[13px]", checked ? "text-accent-foreground/75" : "text-muted-foreground")}>{option.hint}</span>}
              </>
            ) : option.label}
          </button>
        );
      })}
    </div>
  );
}
