'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionBar, Button, CodeEditor, Field, FileDropzone, Notice, OptionToggle, OutputPanel, Segments, ToolShell } from '@/components/dev';
import { errorMessage, formatBytes } from '@/lib/dev/browser';
import { compareHash, HASH_ALGORITHMS, HASH_FILE_LIMIT, HASH_LENGTHS, HASH_TEXT_LIMIT, type HashAlgorithm } from '@/lib/dev/hash';
import type { HashRequest } from './hash.worker';
import s from '@/components/dev/dev.module.css';

export default function HashTool() {
  const [source, setSource] = useState<'text' | 'file'>('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-256');
  const [uppercase, setUppercase] = useState(false);
  const [expected, setExpected] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);
  const [revision, setRevision] = useState(0);
  const stop = useRef<() => void>(() => {});
  const output = uppercase ? result.toUpperCase() : result;
  const comparison = result ? compareHash(result, expected, algorithm) : 'empty';

  useEffect(() => {
    let disposed = false;
    let worker: Worker | null = null;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    setResult(''); setError(''); setProgress(0);
    if (!active || (source === 'file' && !file)) { setBusy(false); return; }
    setBusy(true);
    const timer = setTimeout(() => {
      try {
        worker = new Worker(new URL('./hash.worker.ts', import.meta.url), { type: 'module' });
        const finish = () => { clearTimeout(watchdog); worker?.terminate(); if (!disposed) setBusy(false); };
        worker.onmessage = ({ data }: MessageEvent<{ result?: string; progress?: number; error?: string }>) => {
          if (disposed) return;
          if (typeof data.progress === 'number') { setProgress(data.progress); return; }
          if (data.error) setError(data.error);
          else if (data.result) { setResult(data.result); setProgress(100); }
          finish();
        };
        worker.onerror = event => { event.preventDefault(); if (!disposed) setError('The hash worker could not run. Reload this page and try again.'); finish(); };
        watchdog = setTimeout(() => { if (!disposed) setError('Hashing took too long and was stopped. Try a smaller file.'); finish(); }, 60_000);
        worker.postMessage({ algorithm, text: source === 'text' ? text : '', file: source === 'file' ? file : null } satisfies HashRequest);
      } catch (cause) { if (!disposed) { setError(errorMessage(cause)); setBusy(false); } worker?.terminate(); }
    }, 180);
    const cleanup = () => { disposed = true; clearTimeout(timer); clearTimeout(watchdog); worker?.terminate(); };
    stop.current = cleanup;
    return cleanup;
  }, [source, text, file, algorithm, active, revision]);

  const clear = useCallback(() => { stop.current(); setText(''); setFile(null); setExpected(''); setResult(''); setError(''); setBusy(false); setActive(false); }, []);
  const process = () => { setActive(true); setRevision(value => value + 1); };
  return <ToolShell toolId="hash-generator" onClear={clear} onProcess={process} actions={<ActionBar onClear={clear} output={output} filename={`${algorithm.toLowerCase()}.txt`} />}>
    <div className={s.options}>
      <Segments label="Input source" value={source} onChange={setSource} options={[{ value: 'text', label: 'Text' }, { value: 'file', label: 'File' }]} />
      <Field label="Algorithm"><select className={s.select} value={algorithm} onChange={event => setAlgorithm(event.target.value as HashAlgorithm)}>{HASH_ALGORITHMS.map(value => <option key={value} value={value}>{value}</option>)}</select></Field>
      <OptionToggle label="Uppercase hex" checked={uppercase} onChange={setUppercase} />
    </div>
    {(algorithm === 'MD5' || algorithm === 'SHA-1') && <Notice tone="warning">{algorithm} is for legacy checksums. It has known collision weaknesses and should not be used for signatures or security-sensitive integrity checks.</Notice>}
    <div className={s.split}>
      <div className={s.stack}>
        {source === 'text' ? <CodeEditor label="Text to hash" value={text} onChange={value => { setText(value); setActive(true); }} minHeight={300} maxLength={HASH_TEXT_LIMIT} placeholder="Type or paste text…" description="Exact UTF-8 bytes are hashed, including whitespace and line breaks. Use a file to preserve its original bytes." /> : <>
          <FileDropzone key={file ? 'loaded' : 'empty'} onFile={value => { setFile(value); setActive(true); }} maxBytes={HASH_FILE_LIMIT} label="Choose or drop a file to hash" description="Any file up to 64 MiB. Read and hashed in an isolated browser worker." onError={setError} />
          {file && <section className={s.panel} aria-label="Selected file"><div className={s.panelHeader}><strong style={{ overflowWrap: 'anywhere' }}>{file.name}</strong><Button variant="ghost" onClick={() => setFile(null)}>Remove</Button></div><div className={s.panelBody}>{formatBytes(file.size)} · Ready for {algorithm}</div></section>}
        </>}
        <div className={s.row}><Button onClick={process} disabled={busy || (source === 'file' && !file)}>{source === 'text' && !text ? 'Hash empty text' : 'Generate hash'}</Button>{busy && <Button variant="ghost" onClick={() => { stop.current(); setBusy(false); setError('Hashing cancelled. Choose Generate hash to try again.'); }}>Cancel</Button>}</div>
        {busy && <div className={s.stack} role="status"><span>{progress < 35 ? 'Reading input locally…' : 'Computing checksum…'}</span><progress max={100} value={progress} aria-label="Hash progress" style={{ width: '100%', accentColor: '#FF6B00' }} /></div>}
      </div>
      <div className={s.stack}>
        <OutputPanel label={`${algorithm} checksum`} value={output} filename={`${algorithm.toLowerCase()}.txt`} busy={busy} />
        {result && <p className={s.muted}>{HASH_LENGTHS[algorithm] * 4}-bit digest · {HASH_LENGTHS[algorithm]} hexadecimal characters</p>}
        <section className={s.panel}>
          <div className={s.panelHeader}><strong>Compare checksum</strong></div>
          <div className={s.panelBody}>
            <Field label="Expected hash" hint={`Paste a ${HASH_LENGTHS[algorithm]}-character ${algorithm} hexadecimal checksum. Comparison ignores letter case and surrounding whitespace.`}>
              <input className={s.input} value={expected} onChange={event => setExpected(event.target.value)} spellCheck={false} autoCapitalize="off" autoComplete="off" maxLength={1024} placeholder="Paste an expected checksum…" />
            </Field>
            {comparison === 'match' && <Notice tone="success">Checksums match.</Notice>}
            {comparison === 'mismatch' && <Notice tone="error">Checksums do not match. The input differs from the expected checksum.</Notice>}
            {comparison === 'invalid' && <Notice tone="warning">Enter exactly {HASH_LENGTHS[algorithm]} hexadecimal characters for {algorithm}.</Notice>}
          </div>
        </section>
      </div>
    </div>
    {error && <Notice tone="error">{error}</Notice>}
    <p className={s.muted}>SHA algorithms use the browser’s Web Crypto API. MD5 is computed incrementally. Only one hashing job runs at a time; changing the input cancels the previous job.</p>
  </ToolShell>;
}
