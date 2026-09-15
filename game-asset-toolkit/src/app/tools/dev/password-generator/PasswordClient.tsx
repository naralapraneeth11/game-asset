"use client";

import { useState } from "react";
import { ToolShell, CopyButton } from "@/components/dev";

function generatePassword(length: number, opts: { upper: boolean; lower: boolean; numbers: boolean; symbols: boolean }) {
  let chars = "";
  if (opts.lower) chars += "abcdefghijklmnopqrstuvwxyz";
  if (opts.upper) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (opts.numbers) chars += "0123456789";
  if (opts.symbols) chars += "!@#$%^&*()-_=+[]{}|;:,.<>?";
  if (!chars) chars = "abcdefghijklmnopqrstuvwxyz";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join("");
}

export function PasswordClient() {
  const [length, setLength] = useState(16);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(false);
  const [password, setPassword] = useState("");

  const generate = () => {
    setPassword(generatePassword(length, { upper, lower, numbers, symbols }));
  };

  return (
    <ToolShell title="Password Generator" description="Cryptographically secure passwords generated with Web Crypto." actions={<CopyButton text={password} />}>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          Length
          <input type="number" min={4} max={128} value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} /> Uppercase</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={lower} onChange={(e) => setLower(e.target.checked)} /> Lowercase</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={numbers} onChange={(e) => setNumbers(e.target.checked)} /> Numbers</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={symbols} onChange={(e) => setSymbols(e.target.checked)} /> Symbols</label>
        <button type="button" onClick={generate} className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-neutral-900">Generate</button>
      </div>
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 font-mono text-lg break-all">
        {password || "Click Generate"}
      </div>
    </ToolShell>
  );
}
