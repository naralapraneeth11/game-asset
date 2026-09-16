'use client';

import { useMemo, useState } from 'react';
import { ToolShell, OutputPanel, ActionBar, Button, Field, OptionToggle, Notice } from '@/components/dev';
import s from '@/components/dev/dev.module.css';
import { generatePasswords, passwordDetails, type PasswordOptions } from '@/lib/dev/password';
import { errorMessage } from '@/lib/dev/browser';

const initial: PasswordOptions = { length: 20, count: 1, lowercase: true, uppercase: true, numbers: true, symbols: true, excludeAmbiguous: false };
export default function PasswordTool() {
  const [options, setOptions] = useState(initial), [length, setLength] = useState('20'), [count, setCount] = useState('1');
  const [output, setOutput] = useState(''), [error, setError] = useState(''), [revealed, setRevealed] = useState(false), [generatedBits, setGeneratedBits] = useState<number | null>(null);
  const current = useMemo(() => ({ ...options, length: Number(length), count: Number(count) }), [options, length, count]);
  const details = useMemo(() => passwordDetails(current), [current]);
  function generate() {
    try { setOutput(generatePasswords(current).join('\n')); setGeneratedBits(details.entropyBits); setError(''); }
    catch (err) { setError(errorMessage(err)); }
  }
  const clear = () => { setOutput(''); setError(''); setGeneratedBits(null); setRevealed(false); };
  function toggle(key: keyof Pick<PasswordOptions, 'lowercase' | 'uppercase' | 'numbers' | 'symbols' | 'excludeAmbiguous'>, checked: boolean) { setOptions(previous => ({ ...previous, [key]: checked })); }
  return <ToolShell toolId="password-generator" onProcess={generate} onClear={clear} actions={<ActionBar onClear={clear} output={output} filename="passwords.txt" />}>
    <div className={s.options}>
      <Field label="Password length" hint="4–128 characters"><input aria-label="Password length" className={s.input} type="number" min={4} max={128} value={length} onChange={event => setLength(event.target.value)} /></Field>
      <Field label="Batch size" hint="1–100 passwords"><input aria-label="Number of passwords" className={s.input} type="number" min={1} max={100} value={count} onChange={event => setCount(event.target.value)} /></Field>
      <Button variant="primary" onClick={generate}>Generate passwords</Button>
    </div>
    <div className={s.options}>
      <OptionToggle label="Lowercase a–z" checked={options.lowercase} onChange={value => toggle('lowercase', value)} />
      <OptionToggle label="Uppercase A–Z" checked={options.uppercase} onChange={value => toggle('uppercase', value)} />
      <OptionToggle label="Numbers 0–9" checked={options.numbers} onChange={value => toggle('numbers', value)} />
      <OptionToggle label="Symbols !@#" checked={options.symbols} onChange={value => toggle('symbols', value)} />
      <OptionToggle label="Exclude ambiguous characters" description="Removes I, l, 1, O, 0, and o" checked={options.excludeAmbiguous} onChange={value => toggle('excludeAmbiguous', value)} />
    </div>
    {error && <Notice tone="error">{error}</Notice>}
    <div className={s.row}><span className={s.muted}>{details.alphabetSize} possible characters · {Math.floor(details.entropyBits)} bits for the selected settings</span><OptionToggle label="Reveal passwords" checked={revealed} onChange={setRevealed} /></div>
    {revealed || !output ? <OutputPanel label="Generated passwords" value={output} filename="passwords.txt" /> : <section className={s.panel} aria-label="Generated passwords hidden"><div className={s.panelBody}><p>{output.split('\n').length} password{output.includes('\n') ? 's' : ''} generated. Values are hidden.</p><p className={s.muted}>Use Copy Result to copy the actual passwords, or turn on Reveal passwords.</p></div></section>}
    <Notice>{generatedBits === null ? 'Every selected group appears at least once. ' : `Generated passwords have approximately ${Math.floor(generatedBits)} bits of entropy each. `}Uniform cryptographic sampling; values are kept only in this page’s memory. Copy and download are explicit actions; downloaded files are plain text.</Notice>
  </ToolShell>;
}
