"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActionBar, Button, CodeEditor, Field, FileDropzone, Notice, OutputPanel, Segments, ToolShell } from "@/components/dev";
import s from "@/components/dev/dev.module.css";
import { REGEX_LIMITS, regexPatterns, type RegexResult } from "@/lib/dev/regex";
import { errorMessage } from "@/lib/dev/browser";

const flagNames = { g: "Global", i: "Ignore case", m: "Multiline", s: "Dot matches newline", u: "Unicode", y: "Sticky" };

export default function RegexTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [input, setInput] = useState("");
  const [replacement, setReplacement] = useState("");
  const [mode, setMode] = useState<"match" | "replace">("match");
  const [result, setResult] = useState<RegexResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [revision, setRevision] = useState(0);
  const [visibleMatches, setVisibleMatches] = useState(50);
  const worker = useRef<Worker | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    const current = ++generation.current;
    setResult(null); setError(""); setVisibleMatches(50);
    if (!pattern && !input) { setBusy(false); return; }
    setBusy(true);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const debounce = setTimeout(() => {
      if (generation.current !== current) return;
      try {
        const instance = new Worker(new URL("./regex.worker.ts", import.meta.url));
        worker.current = instance;
        const end = () => { instance.terminate(); if (worker.current === instance) worker.current = null; if (timeout) clearTimeout(timeout); };
        instance.onmessage = (event: MessageEvent<{ result?: RegexResult; error?: string }>) => {
          if (generation.current === current) { setBusy(false); setError(event.data.error || ""); setResult(event.data.result || null); }
          end();
        };
        instance.onerror = (event) => {
          event.preventDefault();
          if (generation.current === current) { setBusy(false); setError("The regex worker could not start. Reload the page and check that your browser allows this site's worker scripts."); }
          end();
        };
        timeout = setTimeout(() => {
          if (generation.current === current) { setBusy(false); setError("Pattern stopped after 1.5 seconds. Reduce the sample size or simplify nested repetition to avoid excessive backtracking."); }
          end();
        }, REGEX_LIMITS.timeout);
        instance.postMessage({ pattern, flags, text: input, replacement, replace: mode === "replace" });
      } catch (cause) { if (generation.current === current) { setError(errorMessage(cause)); setBusy(false); } }
    }, 200);
    return () => { clearTimeout(debounce); if (timeout) clearTimeout(timeout); worker.current?.terminate(); worker.current = null; };
  }, [pattern, flags, input, replacement, mode, revision]);

  function clear() { generation.current++; worker.current?.terminate(); worker.current = null; setPattern(""); setInput(""); setReplacement(""); setError(""); setResult(null); setBusy(false); setNote(""); }
  function cancel() { generation.current++; worker.current?.terminate(); worker.current = null; setBusy(false); setResult(null); setError("Matching cancelled. Edit the pattern or choose Run to try again."); }
  const output = result ? mode === "replace" ? result.replaced ?? "" : JSON.stringify(result.matches, null, 2) : "";
  const highlights = useMemo(() => {
    if (!result || input.length > 100_000) return null;
    const parts: ReactNode[] = [];
    let offset = 0;
    result.matches.forEach((match, index) => {
      parts.push(input.slice(offset, match.index));
      parts.push(<mark key={index} className={s.highlight} title={`Match ${index + 1} · index ${match.index}`}>{match.value || <span aria-label="Zero-length match">▏</span>}</mark>);
      offset = match.end;
    });
    parts.push(input.slice(offset));
    return parts;
  }, [result, input]);

  return <ToolShell toolId="regex-tester" onClear={clear} onProcess={() => setRevision((value) => value + 1)} actions={<ActionBar onClear={clear} output={output} filename={mode === "replace" ? "replacement.txt" : "matches.json"} />}>
    <div className={s.options}><Segments label="Regex mode" value={mode} onChange={setMode} options={[{ value: "match", label: "Match" }, { value: "replace", label: "Replace" }]} /><Field label="Pattern library"><select className={s.select} value="" onChange={(event) => { const item = regexPatterns.find((item) => item.name === event.target.value); if (item) { setPattern(item.pattern); setFlags(item.flags); setNote(item.note); } }}><option value="" disabled>Choose a pattern…</option>{regexPatterns.map((item) => <option key={item.name}>{item.name}</option>)}</select></Field><Button variant="primary" onClick={() => setRevision((value) => value + 1)}>Run</Button>{busy && <Button onClick={cancel}>Cancel</Button>}</div>
    <div className={s.panel}><div className={s.panelBody}><div className={s.stack}><Field label="Regular expression" hint="JavaScript syntax. Enter the pattern without surrounding /slashes/."><input className={`${s.input} ${s.code}`} value={pattern} onChange={(event) => { setPattern(event.target.value); setNote(""); }} maxLength={REGEX_LIMITS.pattern} placeholder="(?<name>\w+)" spellCheck={false} autoComplete="off" autoCapitalize="off" /></Field><div className={s.row} role="group" aria-label="Regex flags">{Object.entries(flagNames).map(([flag, name]) => <Button key={flag} aria-pressed={flags.includes(flag)} title={name} variant={flags.includes(flag) ? "primary" : "secondary"} onClick={() => setFlags((value) => value.includes(flag) ? value.replace(flag, "") : value + flag)}><span className={s.code}>{flag}</span><span className={s.srOnly}> {name}</span></Button>)}<span className={s.muted}>g global · i case-insensitive · m multiline · s dotAll · u Unicode · y sticky</span></div>{note && <p className={s.muted}>{note}</p>}{mode === "replace" && <Field label="Replacement" hint="Supports $$, $&, $1–$99, $<name>, $` and $'. Replacement text is literal; no code is evaluated."><input className={`${s.input} ${s.code}`} value={replacement} onChange={(event) => setReplacement(event.target.value)} maxLength={REGEX_LIMITS.replacement} placeholder="$<name>" spellCheck={false} /></Field>}</div></div></div>
    <FileDropzone label="Load sample text" accept="text/*,.txt,.log,.json,.csv" maxBytes={REGEX_LIMITS.input} onError={setError} onFile={async (file) => { const task = generation.current; const value = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()); if (value.length > REGEX_LIMITS.input) throw new Error("Sample text exceeds 1,000,000 characters."); if (task === generation.current) setInput(value); }} />
    {error && <Notice tone="error">{error}</Notice>}
    <div className={s.split}><CodeEditor label="Sample text" value={input} onChange={setInput} maxLength={REGEX_LIMITS.input} placeholder="Paste text to inspect matches as you type." description="Up to 1,000,000 characters · Positions use UTF-16 offsets" /><OutputPanel label={mode === "replace" ? "Replacement preview" : "Matches"} value={output} filename={mode === "replace" ? "replacement.txt" : "matches.json"} busy={busy} language={mode === "match" ? "json" : "text"} /></div>
    {result && <><Notice tone={result.truncated ? "warning" : "success"}>{result.truncated ? `Showing the first ${REGEX_LIMITS.matches.toLocaleString("en-US")} matches. Replacement output is withheld until the full result fits this limit.` : `${result.matches.length.toLocaleString("en-US")} ${result.matches.length === 1 ? "match" : "matches"} · ${result.elapsed} ms in the worker.`}{!flags.includes("g") && " Global is off: only the first match is returned."}</Notice>{highlights && <div className={s.panel}><div className={s.panelHeader}>Highlighted matches</div><pre className={s.syntax} tabIndex={0}>{highlights}</pre></div>}{input.length > 100_000 && <p className={s.muted}>Highlighting is paused above 100,000 characters. Match positions and downloads remain available.</p>}{result.matches.length > 0 && <div className={s.panel}><div className={s.panelHeader}>Capture groups<span className={s.muted}>Zero-based indices · null means unmatched</span></div><div className={s.panelBody}><div className={s.stack}>{result.matches.slice(0, visibleMatches).map((match, index) => <details key={index}><summary className={s.code} style={{ cursor: "pointer" }}>Match {index + 1} · [{match.index}, {match.end}) · {match.value ? JSON.stringify(match.value.slice(0, 100)) : "empty match"}</summary><pre className={s.code} style={{ padding: "12px 0" }}>{JSON.stringify({ value: match.value, numbered: match.groups, named: match.named }, null, 2)}</pre></details>)}{visibleMatches < result.matches.length && <Button onClick={() => setVisibleMatches((count) => count + 50)}>Show 50 more matches</Button>}</div></div></div>}</>}
    <p className={s.muted}>Each run is isolated and stopped after 1.5 seconds. Limits: 1 million sample characters, 2,000 matches and 4 million replacement characters.</p>
  </ToolShell>;
}
