'use client';

import { useEffect, useRef, useState } from 'react';
import { ToolShell, CodeEditor, OutputPanel, ActionBar, CopyButton, FileDropzone, Button, Field, OptionToggle, Notice, Segments } from '@/components/dev';
import s from '@/components/dev/dev.module.css';
import { JSON_MAX_BYTES, type JsonTreeNode } from '@/lib/dev/json';
import { errorMessage, useDebouncedValue } from '@/lib/dev/browser';
import type { JsonRequest } from './json.worker';

interface Result { output?: string; error?: string; conversionError?: string; tree?: JsonTreeNode; nodeCount?: number; duplicateKeys?: number; unsafeIntegers?: number }
function TreeNode({ node, root = false }: { node: JsonTreeNode; root?: boolean }) {
  const [open, setOpen] = useState(root);
  const expandable = !!node.children?.length;
  return <li style={{ listStyle: 'none', minWidth: 0 }}>
    <div className={s.row} style={{ gap: 8, flexWrap: 'nowrap', paddingBlock: 5 }}>
      <button type="button" aria-expanded={expandable ? open : undefined} onClick={() => expandable && setOpen(!open)} disabled={!expandable} aria-label={`${open ? 'Collapse' : 'Expand'} ${node.label}`} style={{ width: 20, flexShrink: 0, opacity: expandable ? 1 : 0, cursor: expandable ? 'pointer' : 'default' }}>{open ? '▾' : '▸'}</button>
      <span style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={node.label}>{node.label}</span>
      <span className={s.muted} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{node.preview}</span>
      <CopyButton text={node.path} label="Copy path" />
    </div>
    {open && expandable && <ul style={{ paddingLeft: 20, margin: 0, borderLeft: '1px solid var(--border)' }}>{node.children!.map((child, index) => <TreeNode node={child} key={index} />)}{(node.omitted ?? 0) > 0 && <li className={s.muted} style={{ listStyle: 'none', padding: 8 }}>{node.omitted!.toLocaleString()} more entries. The complete data is preserved in output.</li>}</ul>}
  </li>;
}

export default function JsonTool({ validatorOnly = false }: { validatorOnly?: boolean }) {
  const [source, setSource] = useState('');
  const [indent, setIndent] = useState('  ');
  const [sort, setSort] = useState(false);
  const [format, setFormat] = useState<JsonRequest['format']>('json');
  const [view, setView] = useState('text');
  const [protectFormulas, setProtectFormulas] = useState(true);
  const [result, setResult] = useState<Result>({});
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState('');
  const [revision, setRevision] = useState(0);
  const debounced = useDebouncedValue(source, source.length > 200_000 ? 450 : 160);
  const id = useRef(0);
  const current = useRef(source); current.current = source;
  useEffect(() => {
    if (!debounced.trim()) { setResult({}); setBusy(false); return; }
    const task = ++id.current;
    let worker: Worker | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setBusy(true); setResult({});
    try {
      worker = new Worker(new URL('./json.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<Result & { id: number }>) => {
        if (event.data.id !== task || current.current !== debounced) return;
        clearTimeout(timeout); setResult(event.data); setBusy(false); worker?.terminate();
      };
      worker.onerror = () => { if (current.current === debounced) { setResult({ error: 'The JSON worker could not start or ran out of memory. Reload this page, or reduce the input.' }); setBusy(false); } worker?.terminate(); clearTimeout(timeout); };
      worker.postMessage({ id: task, source: debounced, indent, sort, format, protectFormulas } satisfies JsonRequest);
      timeout = setTimeout(() => { worker?.terminate(); if (current.current === debounced) { setResult({ error: 'Processing exceeded 15 seconds. Reduce the input or choose Minify.' }); setBusy(false); } }, 15_000);
    } catch (error) { setResult({ error: errorMessage(error) }); setBusy(false); }
    return () => { worker?.terminate(); clearTimeout(timeout); };
  }, [debounced, indent, sort, format, protectFormulas, revision]);
  const pending = busy || source !== debounced;
  const clear = () => { setSource(''); setResult({}); setFileError(''); };
  const filename = `formatted.${format}`;
  return <ToolShell toolId={validatorOnly ? 'json-validator' : 'json-formatter'} onClear={clear} onProcess={() => setRevision(value => value + 1)} actions={<ActionBar onClear={clear} output={pending ? '' : result.output} filename={filename} />}>
    <div className={s.options}>
      <Field label="Whitespace"><Segments label="Whitespace" value={indent} onChange={setIndent} options={[{ value: '  ', label: '2 spaces' }, { value: '    ', label: '4 spaces' }, { value: '\t', label: 'Tab' }, { value: '', label: 'Minify' }]} /></Field>
      <OptionToggle label="Sort object keys" checked={sort} onChange={setSort} description="Stable, case-sensitive ordering. Arrays retain their order." />
      {!validatorOnly && <Field label="Output format"><select className={s.select} value={format} onChange={event => { setFormat(event.target.value as JsonRequest['format']); setView('text'); }}><option value="json">JSON</option><option value="yaml">YAML 1.2</option><option value="csv">CSV</option><option value="xml">XML</option></select></Field>}
      {format === 'csv' && <OptionToggle label="Protect spreadsheet formulas" checked={protectFormulas} onChange={setProtectFormulas} description="Prefix potentially executable text cells with an apostrophe." />}
    </div>
    <FileDropzone onFile={async file => { try { const text = await file.text(); setFileError(''); setSource(text.replace(/^\uFEFF/, '')); } catch (error) { setFileError(errorMessage(error)); } }} onError={setFileError} accept=".json,application/json,text/plain" maxBytes={JSON_MAX_BYTES} label="Open or drop a JSON file" description="Up to 10 MiB · processed in a dedicated browser worker" />
    {fileError && <Notice tone="error">{fileError}</Notice>}
    <div className={s.split}>
      <CodeEditor label="JSON input" value={source} onChange={value => { setSource(value); setFileError(''); }} placeholder={'{\n  "project": "Game Asset Toolkit",\n  "local": true\n}'} minHeight={460} error={!pending ? result.error : undefined} description="Strict JSON. Numbers retain their exact source representation." actions={<Button variant="ghost" onClick={() => setSource('{\n  "project": "Game Asset Toolkit",\n  "assets": [{ "name": "hero.png", "scale": 2 }],\n  "local": true\n}')}>Example</Button>} />
      <div className={s.stack}>
        <Segments label="Result view" value={view} onChange={setView} options={[{ value: 'text', label: 'Output' }, { value: 'tree', label: 'Tree' }]} />
        {view === 'text' ? <OutputPanel label={validatorOnly ? 'Validated JSON' : `${format.toUpperCase()} output`} value={pending ? '' : result.output ?? ''} filename={filename} language={format === 'json' ? 'json' : 'text'} busy={pending} /> : <section className={s.panel} aria-label="JSON tree"><div className={s.panelHeader}>Explore JSON <span className={s.muted}>Copy a JSONPath from any row</span></div><div className={s.panelBody} style={{ minHeight: 390, maxHeight: 660, overflow: 'auto' }}>{pending ? <p className={s.muted}>Parsing…</p> : result.tree ? <ul className={s.tree} style={{ padding: 0, margin: 0 }}><TreeNode node={result.tree} root /></ul> : <p className={s.muted}>Enter valid JSON to explore its structure.</p>}</div></section>}
      </div>
    </div>
    {!pending && result.nodeCount !== undefined && <Notice tone="success">Valid JSON · {result.nodeCount.toLocaleString()} values. Tree previews show up to 100 children per node and 3,000 values overall.</Notice>}
    {!pending && result.conversionError && <Notice tone="error">{result.conversionError}</Notice>}
    {!pending && !!result.duplicateKeys && <Notice tone="warning">{result.duplicateKeys} duplicate object key(s) are preserved. Other JSON consumers may keep only the last value; paths with repeated keys are ambiguous.</Notice>}
    {!pending && !!result.unsafeIntegers && <Notice tone="info">Large numeric values are preserved exactly, including values JavaScript cannot represent safely.</Notice>}
    {format === 'xml' && <Notice>XML uses explicit object, property, array, and scalar elements to preserve JSON types. It does not infer a domain-specific XML schema.</Notice>}
    {format === 'yaml' && <Notice>YAML 1.2 output uses quoted strings and keys to avoid implicit type coercion.</Notice>}
  </ToolShell>;
}
