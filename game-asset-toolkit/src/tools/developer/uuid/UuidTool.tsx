'use client';

import { useState } from 'react';
import { ToolShell, OutputPanel, ActionBar, Button, Field, OptionToggle, Notice, Segments } from '@/components/dev';
import s from '@/components/dev/dev.module.css';
import { generateUuids } from '@/lib/dev/uuid';
import { errorMessage } from '@/lib/dev/browser';

export default function UuidTool() {
  const [count, setCount] = useState('1'), [uppercase, setUppercase] = useState(false);
  const [format, setFormat] = useState<'lines' | 'json' | 'csv'>('lines');
  const [values, setValues] = useState<string[]>([]), [error, setError] = useState('');
  const normalized = values.map(value => uppercase ? value.toUpperCase() : value.toLowerCase());
  const output = !values.length ? '' : format === 'json' ? JSON.stringify(normalized, null, 2) : normalized.join(format === 'csv' ? ',' : '\n');
  const filename = `uuids.${format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'txt'}`;
  function generate() { try { setValues(generateUuids(Number(count))); setError(''); } catch (err) { setError(errorMessage(err)); } }
  const clear = () => { setValues([]); setError(''); };
  return <ToolShell toolId="uuid-generator" onProcess={generate} onClear={clear} actions={<ActionBar onClear={clear} output={output} filename={filename} />}>
    <div className={s.options}>
      <Field label="How many?" hint="1–1,000 UUIDs per batch"><input className={s.input} aria-label="Number of UUIDs" type="number" min={1} max={1000} step={1} value={count} onChange={event => setCount(event.target.value)} /></Field>
      <Segments label="Output format" value={format} onChange={setFormat} options={[{ value: 'lines', label: 'Lines' }, { value: 'json', label: 'JSON' }, { value: 'csv', label: 'CSV' }]} />
      <OptionToggle label="Uppercase" checked={uppercase} onChange={setUppercase} />
      <Button variant="primary" onClick={generate}>Generate UUIDs</Button>
    </div>
    {error && <Notice tone="error">{error}</Notice>}
    <OutputPanel label={values.length ? `${values.length.toLocaleString()} UUID${values.length === 1 ? '' : 's'} · version 4` : 'Your UUIDs'} value={output} filename={filename} language={format === 'json' ? 'json' : 'text'} />
    <Notice>UUID v4 uses 122 random bits from your browser’s cryptographically secure random generator. Generate a new batch with ⌘/Ctrl + Enter.</Notice>
  </ToolShell>;
}
