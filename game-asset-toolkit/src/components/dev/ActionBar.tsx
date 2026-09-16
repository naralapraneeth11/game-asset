"use client";

import type { ReactNode } from "react";
import { Download, Trash2 } from "lucide-react";
import { download } from "@/lib/dev/browser";
import { Button } from "./Button";
import { CopyButton } from "./CopyButton";
import s from "./dev.module.css";

export function ActionBar({ onClear, output, filename = "result.txt", children }: { onClear?: () => void; output?: string; filename?: string; children?: ReactNode }) {
  return <div className={s.actions} aria-label="Tool actions">{onClear && <Button onClick={onClear}><Trash2 size={13} aria-hidden />Clear</Button>}{children}{output !== undefined && <><CopyButton text={output} label="Copy result" disabled={!output} /><Button disabled={!output} onClick={() => download(output, filename)}><Download size={13} aria-hidden />Download</Button></>}</div>;
}

