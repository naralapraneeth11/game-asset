'use client';

import { useMemo, useState } from 'react';
import { ToolShell, CodeEditor, OutputPanel, ActionBar, OptionToggle, Notice, Segments, Button } from '@/components/dev';
import s from '@/components/dev/dev.module.css';
import { transformUrl, type UrlMode } from '@/lib/dev/url';
import { errorMessage, useDebouncedValue } from '@/lib/dev/browser';

export default function UrlTool() {
  const [input, setInput] = useState('');
  const [direction, setDirection] = useState<'encode' | 'decode'>('encode');
  const [mode, setMode] = useState<UrlMode>('component');
  const [plus, setPlus] = useState(false);
  const deferred = useDebouncedValue(input, input.length > 50000 ? 180 : 0);
  const result = useMemo(() => {
    try { return { value: transformUrl(deferred, direction, mode, plus), error: '' }; }
    catch (error) { return { value: '', error: errorMessage(error) }; }
  }, [deferred, direction, mode, plus]);
  const clear = () => setInput('');
  return <ToolShell toolId="url-encode" onClear={clear} actions={<ActionBar onClear={clear} output={result.value} filename="url-result.txt" />}>
    <div className={s.options}>
      <Segments label="Operation" value={direction} onChange={setDirection} options={[{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }]} />
      <Segments label="Encoding scope" value={mode} onChange={setMode} options={[{ value: 'component', label: 'Component' }, { value: 'uri', label: 'Full URL' }]} />
      <OptionToggle label="Use + for spaces" description="Form encoding applies to components only." checked={plus} onChange={setPlus} />
    </div>
    <p className={s.muted}>{mode === 'component' ? 'Encode a query value, path segment, or arbitrary text. Reserved URL characters are escaped.' : 'Preserve URL separators such as :, /, ?, and #. Decoding keeps escapes for reserved characters, following decodeURI.'}</p>
    {result.error && <Notice tone="error">{result.error}</Notice>}
    <div className={s.split}>
      <CodeEditor label={direction === 'encode' ? 'Text to encode' : 'URL-encoded input'} value={input} onChange={setInput} placeholder={direction === 'encode' ? 'Hello world & game assets' : 'Hello%20world%20%26%20game%20assets'} maxLength={1000000} />
      <OutputPanel label={direction === 'encode' ? 'Encoded result' : 'Decoded result'} value={result.value} filename="url-result.txt" busy={deferred !== input} />
    </div>
    <div className={s.row}><Button disabled={!result.value || !!result.error || deferred !== input} onClick={() => { setInput(result.value); setDirection(direction === 'encode' ? 'decode' : 'encode'); }}>Use result as input</Button><span className={s.muted}>Local UTF-8 processing · Up to 1 million characters</span></div>
  </ToolShell>;
}
