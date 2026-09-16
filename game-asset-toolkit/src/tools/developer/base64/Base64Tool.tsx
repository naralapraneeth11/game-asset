'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionBar, Button, CodeEditor, CopyButton, FileDropzone, Notice, OptionToggle, Segments, ToolShell } from '@/components/dev';
import { download, errorMessage, formatBytes } from '@/lib/dev/browser';
import { BASE64_FILE_LIMIT, BASE64_PREVIEW_LIMIT, BASE64_TEXT_LIMIT } from '@/lib/dev/base64';
import type { Base64Request, Base64Result } from './base64.worker';
import s from '@/components/dev/dev.module.css';

export default function Base64Tool() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [urlSafe, setUrlSafe] = useState(false);
  const [padding, setPadding] = useState(true);
  const [dataUri, setDataUri] = useState(false);
  const [result, setResult] = useState<Base64Result | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [revision, setRevision] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  const stop = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let worker: Worker | null = null;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    setResult(null); setError('');
    if (!active) { setBusy(false); return; }
    setBusy(true);
    const timer = setTimeout(() => {
      try {
        worker = new Worker(new URL('./base64.worker.ts', import.meta.url), { type: 'module' });
        const finish = () => { clearTimeout(watchdog); worker?.terminate(); if (!disposed) setBusy(false); };
        worker.onmessage = ({ data }: MessageEvent<{ result?: Base64Result; error?: string }>) => {
          if (disposed) return;
          if (data.error) setError(data.error);
          else if (data.result) setResult(data.result);
          finish();
        };
        worker.onerror = event => { event.preventDefault(); if (!disposed) setError('The conversion worker could not run. Reload this page and try again.'); finish(); };
        watchdog = setTimeout(() => { if (!disposed) setError('Conversion took too long and was stopped. Try a smaller input.'); finish(); }, 30_000);
        worker.postMessage({ mode, text, file, urlSafe, padding, dataUri } satisfies Base64Request);
      } catch (cause) { if (!disposed) { setError(errorMessage(cause)); setBusy(false); } worker?.terminate(); }
    }, 160);
    const cleanup = () => { disposed = true; clearTimeout(timer); clearTimeout(watchdog); worker?.terminate(); };
    stop.current = cleanup;
    return cleanup;
  }, [mode, text, file, urlSafe, padding, dataUri, active, revision]);

  useEffect(() => {
    setPreviewFailed(false);
    if (!result?.image) { setImageUrl(''); return; }
    const url = URL.createObjectURL(result.image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);

  const clear = useCallback(() => { stop.current(); setText(''); setFile(null); setActive(false); setResult(null); setError(''); setBusy(false); }, []);
  const process = () => { setActive(true); setRevision(value => value + 1); };
  const updateText = (value: string) => { setText(value); setFile(null); setActive(true); };
  const loadFile = (value: File) => { setFile(value); setText(''); setActive(true); };
  const changeMode = (value: 'encode' | 'decode') => { clear(); setMode(value); };
  const outputDownload = () => {
    if (!result) return;
    try { download(result.download ?? result.output, result.filename); }
    catch (cause) { setError(errorMessage(cause)); }
  };

  return <ToolShell toolId="base64" onClear={clear} onProcess={process} actions={<ActionBar onClear={clear}>
    <CopyButton text={result?.output ?? ''} disabled={!result?.textValid || busy} label="Copy result" />
    <Button onClick={outputDownload} disabled={!result || busy}>Download result</Button>
  </ActionBar>}>
    <div className={s.options}>
      <Segments label="Operation" value={mode} onChange={changeMode} options={[{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }]} />
      {mode === 'encode' && <div className={s.row}>
        <OptionToggle label="URL-safe" checked={urlSafe} onChange={value => { setUrlSafe(value); if (value) setDataUri(false); }} description="Use - and _ instead of + and /." />
        <OptionToggle label="Include padding" checked={padding} onChange={setPadding} description="Data URIs always include padding." />
        <OptionToggle label="Data URI" checked={dataUri} onChange={value => { setDataUri(value); if (value) setUrlSafe(false); }} description="Include the file's media type and standard Base64." />
      </div>}
      {mode === 'decode' && <p className={s.muted}>Standard Base64, URL-safe Base64 and Base64 Data URIs are detected automatically. Missing padding is accepted.</p>}
    </div>
    <div className={s.split}>
      <div className={s.stack}>
        {file ? <section className={s.panel} aria-label="Selected input file">
          <div className={s.panelHeader}><strong style={{ overflowWrap: 'anywhere' }}>{file.name}</strong><Button variant="ghost" onClick={() => { setFile(null); setActive(false); }}>Remove</Button></div>
          <div className={s.panelBody}><p>{formatBytes(file.size)} · {mode === 'encode' ? 'Binary file → Base64' : 'Base64 file → decoded bytes'}</p><p className={s.muted}>Your file is attached and processed locally.</p></div>
        </section> : <CodeEditor label={mode === 'encode' ? 'Text to encode' : 'Base64 to decode'} value={text} onChange={updateText} maxLength={BASE64_TEXT_LIMIT} minHeight={320} placeholder={mode === 'encode' ? 'Type or paste any Unicode text…' : 'Paste Base64 or a data:…;base64,… URI…'} description="Text is encoded as UTF-8. Up to 2 Mi characters; larger values can be loaded as a file." />}
        <FileDropzone key={`${mode}-${file ? 'loaded' : 'empty'}`} onFile={loadFile} maxBytes={mode === 'encode' ? BASE64_FILE_LIMIT : Math.ceil(BASE64_FILE_LIMIT / 3) * 4 + 1024 * 1024} label={mode === 'encode' ? 'Choose or drop a file to encode' : 'Choose or drop a Base64 text file'} description={mode === 'encode' ? 'Any file up to 16 MiB. Files stay in your browser.' : 'Up to 22.3 MiB of encoded text, producing at most 16 MiB.'} onError={setError} />
      </div>
      <div className={s.stack}>
        <CodeEditor label={mode === 'encode' ? 'Base64 result' : 'Decoded text'} value={result?.preview ?? ''} readOnly minHeight={320} placeholder={busy ? 'Processing locally…' : result && !result.textValid ? 'Binary result. Download the original bytes using Download result.' : 'Your result appears here.'} actions={<CopyButton text={result?.output ?? ''} disabled={!result?.textValid || busy} />} description={result ? `${formatBytes(result.byteLength)} ${mode === 'encode' ? 'source' : 'decoded'} · ${result.textValid ? `${result.output.length.toLocaleString()} output characters` : 'Binary data, exact bytes preserved'}` : 'Results update as you type.'} />
        {result && result.output.length > BASE64_PREVIEW_LIMIT && <Notice>Showing the first 64 Ki characters to keep the editor responsive. Copy and download include the complete result.</Notice>}
        {result?.image && imageUrl && !previewFailed && <section className={s.panel} aria-label="Image preview">
          <div className={s.panelHeader}><strong>Image preview</strong><span className={s.muted}>{result.imageWidth} × {result.imageHeight}</span></div>
          <div className={s.panelBody}>
            {/* Native blob preview: never routed through the image optimization server. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Preview of your local image" width={result.imageWidth} height={result.imageHeight} style={{ display: 'block', width: 'auto', maxWidth: '100%', height: 'auto', maxHeight: 260, margin: '0 auto', objectFit: 'contain' }} onError={() => setPreviewFailed(true)} />
          </div>
        </section>}
        {previewFailed && <Notice tone="warning">The browser could not display this image. The exact converted bytes are still available to download.</Notice>}
        {result?.imageNote && <Notice>{result.imageNote}</Notice>}
      </div>
    </div>
    {busy && <div className={s.row} role="status"><span>Converting locally…</span><Button variant="ghost" onClick={() => { stop.current(); setBusy(false); setError('Conversion cancelled. Choose Process to try again.'); }}>Cancel</Button></div>}
    {error && <Notice tone="error">{error}</Notice>}
    <div className={s.row}><Button onClick={process} disabled={busy}>Process</Button><p className={s.muted}>Base64 is an encoding, not encryption.</p></div>
  </ToolShell>;
}
