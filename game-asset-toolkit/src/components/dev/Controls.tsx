"use client";

import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { Info } from "lucide-react";
import Toggle from "@/components/ui/Toggle";
import s from "./dev.module.css";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const id = useId();
  const child = Children.count(children) === 1 && isValidElement(children)
    && typeof children.type === "string" && ["input", "select", "textarea"].includes(children.type)
    ? children as ReactElement<{ id?: string; "aria-describedby"?: string }> : null;
  const controlId = child?.props.id || id;
  const description = [child?.props["aria-describedby"], hint ? `${id}-hint` : undefined].filter(Boolean).join(" ") || undefined;
  return <div className={s.field}>{child ? <label className={s.fieldLabel} htmlFor={controlId}>{label}</label> : <span className={s.fieldLabel}>{label}</span>}{child ? cloneElement(child, { id: controlId, "aria-describedby": description }) : children}{hint && <p id={`${id}-hint`} className={s.muted}>{hint}</p>}</div>;
}

export function OptionToggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (checked: boolean) => void; description?: string }) {
  const id = useId();
  return <div className={s.toggle}><Toggle checked={checked} onChange={onChange} aria-labelledby={`${id}-label`} aria-describedby={description ? `${id}-description` : undefined} /><span className={s.toggleText}><span id={`${id}-label`}>{label}</span>{description && <span id={`${id}-description`} className={s.muted}>{description}</span>}</span></div>;
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" | "warning" }) {
  return <div className={`${s.notice} ${tone === "info" ? "" : s[tone]}`} role={tone === "error" ? "alert" : "status"}><Info size={14} aria-hidden /><div>{children}</div></div>;
}

export function Segments<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (value: T) => void; options: { value: T; label: string }[] }) {
  return <div className={s.segments} role="group" aria-label={label}>{options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}

