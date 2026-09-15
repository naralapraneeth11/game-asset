"use client";

import { useMemo, useState } from "react";
import { ToolShell, CodeEditor, CopyButton } from "@/components/dev";

function base64UrlDecode(str: string): string {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return atob(base64);
  }
}

function parseJwt(token: string) {
  const parts = token.trim().split(".");
  if (parts.length < 2) return null;
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return { header, payload, signature: parts[2] || "" };
  } catch {
    return null;
  }
}

export function JwtDecoderClient() {
  const [token, setToken] = useState("");

  const decoded = useMemo(() => {
    if (!token.trim()) return null;
    return parseJwt(token);
  }, [token]);

  const headerStr = decoded ? JSON.stringify(decoded.header, null, 2) : "";
  const payloadStr = decoded ? JSON.stringify(decoded.payload, null, 2) : "";

  return (
    <ToolShell
      title="JWT Decoder"
      description="Decode and inspect JSON Web Tokens entirely in your browser. Nothing is sent anywhere."
      actions={
        <button
          type="button"
          onClick={() => setToken("")}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          Clear
        </button>
      }
    >
      <div className="mb-6">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Token
        </div>
        <CodeEditor
          value={token}
          onChange={setToken}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          rows={4}
        />
      </div>

      {token.trim() && !decoded && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          Invalid JWT format
        </div>
      )}

      {decoded && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Header
              </span>
              <CopyButton text={headerStr} />
            </div>
            <CodeEditor value={headerStr} readOnly rows={10} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Payload
              </span>
              <CopyButton text={payloadStr} />
            </div>
            <CodeEditor value={payloadStr} readOnly rows={10} />
          </div>
        </div>
      )}
    </ToolShell>
  );
}
