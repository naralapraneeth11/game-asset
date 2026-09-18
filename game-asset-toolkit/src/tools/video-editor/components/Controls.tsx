"use client";

import { useId, type ReactNode } from "react";
import Toggle from "@/components/ui/Toggle";
import s from "../VideoEditor.module.css";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <div className={s.field}><span className={s.fieldLabel}>{label}</span>{children}{hint && <p className={s.hint}>{hint}</p>}</div>;
}

export function Slider({ label, value, onChange, min, max, step = 0.01, suffix = "", disabled = false }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number; suffix?: string; disabled?: boolean }) {
  const id = useId();
  return <div className={s.field}><div className={s.labelLine}><label htmlFor={id}>{label}</label><output htmlFor={id}>{Number(value.toFixed(2))}{suffix}</output></div><input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}

export function NumberField({ label, value, onChange, min = 0, max, step = 1, suffix, disabled }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; suffix?: string; disabled?: boolean }) {
  const id = useId();
  return <div className={s.field}><label htmlFor={id} className={s.fieldLabel}>{label}</label><div className={s.numberWrap}><input id={id} type="number" min={min} max={max} step={step} value={Number(value.toFixed(3))} disabled={disabled} onChange={(event) => { if (event.target.value === "") return; const number = Number(event.target.value); if (Number.isFinite(number)) onChange(Math.max(min, Math.min(max ?? Number.MAX_SAFE_INTEGER, number))); }} />{suffix && <span>{suffix}</span>}</div></div>;
}

export function Switch({ label, description, value, onChange, disabled }: { label: string; description?: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return <div className={s.switchLine}><div><label id={`${id}-label`} htmlFor={id}>{label}</label>{description && <p id={`${id}-description`} className={s.hint}>{description}</p>}</div><Toggle id={id} aria-labelledby={`${id}-label`} aria-describedby={description ? `${id}-description` : undefined} checked={value} onChange={onChange} disabled={disabled} /></div>;
}

export function bytes(value: number) { if (!value) return "0 B"; const unit = Math.min(3, Math.floor(Math.log(value) / Math.log(1024))); return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${["B", "KB", "MB", "GB"][unit]}`; }
export function time(value: number) { if (!Number.isFinite(value)) return "0:00"; const total = Math.max(0, value); const hours = Math.floor(total / 3600); return `${hours ? `${hours}:` : ""}${Math.floor(total % 3600 / 60).toString().padStart(hours ? 2 : 1, "0")}:${Math.floor(total % 60).toString().padStart(2, "0")}`; }
