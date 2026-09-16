'use client';

import { useMemo, useState } from 'react';
import { ToolShell, ActionBar, CopyButton, Field, Notice, Button } from '@/components/dev';
import s from '@/components/dev/dev.module.css';
import { convertColor } from '@/lib/dev/color';
import { errorMessage } from '@/lib/dev/browser';

export default function ColorTool() {
  const [input, setInput] = useState('#FF6B00');
  const result = useMemo(() => {
    if (!input.trim()) return { data: null, error: '' };
    try { return { data: convertColor(input), error: '' }; }
    catch (error) { return { data: null, error: errorMessage(error) }; }
  }, [input]);
  const data = result.data;
  const formats = data ? [['HEX', data.hex], ['RGB', data.rgb], ['HSL', data.hsl], ['OKLCH', data.oklch]] : [];
  const output = formats.map(([label, value]) => `${label}: ${value}`).join('\n');
  function alpha(value: string) {
    if (!data) return;
    const { r, g, b } = data.color;
    setInput(`rgb(${[r, g, b].map(n => Number((n * 255).toFixed(4))).join(' ')} / ${Number(value) / 100})`);
  }
  const clear = () => setInput('');
  return <ToolShell toolId="color-converter" onClear={clear} actions={<ActionBar onClear={clear} output={output} filename="color.txt" />}>
    <div className={s.split}>
      <section className={s.panel} aria-label="Color input"><div className={`${s.panelBody} ${s.stack}`}>
        <Field label="Color value" hint="HEX, RGB, HSL, or OKLCH · Alpha supported in every format"><input className={s.input} aria-label="Color value" aria-invalid={!!result.error} spellCheck={false} value={input} onChange={event => setInput(event.target.value)} maxLength={200} placeholder="#FF6B00 or oklch(0.7 0.2 40)" /></Field>
        {result.error && <Notice tone="error">{result.error}</Notice>}
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', backgroundImage: 'conic-gradient(var(--muted) 25%, var(--card) 0 50%, var(--muted) 0 75%, var(--card) 0)', backgroundSize: '20px 20px' }}>
          <div role="img" aria-label={data ? `Color preview: ${data.rgb}` : 'No color selected'} style={{ height: 160, backgroundColor: data?.rgb ?? 'transparent' }} />
        </div>
        <div className={s.row}>
          <Field label="Choose a color"><input type="color" aria-label="Choose a color" value={data?.hex.slice(0, 7) ?? '#000000'} onChange={event => { const a = data?.color.a ?? 1; setInput(event.target.value + (a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : '')); }} style={{ width: 64, height: 42, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, cursor: 'pointer' }} /></Field>
          <Field label={`Opacity · ${Math.round((data?.color.a ?? 1) * 100)}%`}><input aria-label="Color opacity" type="range" min={0} max={100} step={1} disabled={!data} value={Math.round((data?.color.a ?? 1) * 100)} onChange={event => alpha(event.target.value)} style={{ accentColor: '#FF6B00', width: '100%' }} /></Field>
        </div>
        <div className={s.row}>{['#FF6B00', '#747AEE80', 'oklch(0.72 0.25 150)'].map(example => <Button key={example} variant="ghost" onClick={() => setInput(example)}>{example}</Button>)}</div>
      </div></section>
      <div className={s.stack}>
        {formats.length ? formats.map(([label, value]) => <section className={s.panel} key={label}><div className={s.panelHeader}><strong>{label}</strong><CopyButton text={value} /></div><div className={s.panelBody}><code className={s.code} style={{ overflowWrap: 'anywhere' }}>{value}</code></div></section>) : <section className={s.panel}><div className={s.panelBody}><p className={s.muted}>Enter a color to see all four formats.</p></div></section>}
      </div>
    </div>
    {data?.gamutMapped && <Notice tone="warning">This OKLCH color is outside sRGB. Chroma was reduced while preserving lightness and hue. The preview and all converted values show the mapped color.</Notice>}
    <Notice>HEX uses 8-bit channels; RGB, HSL, and OKLCH retain fractional precision. Alpha represents opacity. Colors are converted to sRGB for consistent cross-format output.</Notice>
  </ToolShell>;
}
