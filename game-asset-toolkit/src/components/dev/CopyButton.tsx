"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "@/lib/dev/browser";
import { Button } from "./Button";
import s from "./dev.module.css";

export function CopyButton({ text, label = "Copy", disabled = false, className }: { text: string; label?: string; disabled?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (timeout.current) clearTimeout(timeout.current); }; }, []);
  useEffect(() => { setCopied(false); setError(""); }, [text]);
  const copy = async () => {
    try {
      await copyText(text);
      if (!mounted.current) return;
      setCopied(true); setError("");
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), 1800);
    } catch { if (mounted.current) setError("Copy was blocked. Select the result and copy with your keyboard."); }
  };
  return <span className={s.stack} style={{ gap: 4 }}><Button className={className} onClick={copy} disabled={disabled} aria-label={copied ? "Copied to clipboard" : label}>{copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}{copied ? "Copied" : label}</Button><span role="status" className={error ? s.muted : s.srOnly}>{error || (copied ? "Copied to clipboard" : "")}</span></span>;
}
