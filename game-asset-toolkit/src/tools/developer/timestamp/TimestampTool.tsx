'use client';

import { useMemo, useState } from 'react';
import { ToolShell, OutputPanel, ActionBar, Button, CopyButton, Field, Notice, Segments } from '@/components/dev';
import s from '@/components/dev/dev.module.css';
import { parseTimestamp, parseCalendar, calendarString, describeDate, type TimestampUnit, type CalendarZone } from '@/lib/dev/timestamp';
import { errorMessage } from '@/lib/dev/browser';

export default function TimestampTool() {
  const [direction, setDirection] = useState<'timestamp' | 'calendar'>('timestamp');
  const [timestamp, setTimestamp] = useState(''), [calendar, setCalendar] = useState('');
  const [unit, setUnit] = useState<TimestampUnit>('seconds'), [inputZone, setInputZone] = useState<CalendarZone>('utc');
  const [displayZone, setDisplayZone] = useState('UTC'), [zoneMode, setZoneMode] = useState<'UTC' | 'local' | 'custom'>('UTC');
  const value = direction === 'timestamp' ? timestamp : calendar;
  const result = useMemo(() => {
    if (!value.trim()) return { data: null, error: '' };
    try {
      const date = direction === 'timestamp' ? parseTimestamp(value, unit) : parseCalendar(value, inputZone);
      return { data: describeDate(date, zoneMode === 'custom' ? displayZone.trim() : zoneMode), error: '' };
    } catch (error) { return { data: null, error: errorMessage(error) }; }
  }, [value, direction, unit, inputZone, zoneMode, displayZone]);
  const output = result.data ? `Unix seconds: ${result.data.seconds}\nUnix milliseconds: ${result.data.milliseconds}\nISO 8601 (UTC): ${result.data.iso}\nUTC: ${result.data.utc}\nSelected time zone: ${result.data.zoned}` : '';
  function useNow() {
    const now = new Date();
    setTimestamp(String(now.getTime() / (unit === 'seconds' ? 1000 : 1)));
    setCalendar(calendarString(now, inputZone));
  }
  const clear = () => { setTimestamp(''); setCalendar(''); };
  const rows = result.data ? [
    ['Unix seconds', result.data.seconds], ['Unix milliseconds', result.data.milliseconds],
    ['ISO 8601 · UTC', result.data.iso], ['Selected time zone', result.data.zoned],
  ] : [];
  return <ToolShell toolId="timestamp" onClear={clear} onProcess={useNow} actions={<ActionBar onClear={clear} output={output} filename="timestamp.txt" />}>
    <div className={s.options}>
      <Segments label="Convert from" value={direction} onChange={setDirection} options={[{ value: 'timestamp', label: 'Unix timestamp' }, { value: 'calendar', label: 'Calendar date' }]} />
      <Button onClick={useNow}>Use current time</Button>
    </div>
    <div className={s.split}>
      <section className={s.panel} aria-label="Date input"><div className={`${s.panelBody} ${s.stack}`}>
        {direction === 'timestamp' ? <>
          <Field label="Unix timestamp" hint="Negative and fractional values are supported. Resolution: 1 millisecond."><input className={s.input} aria-label="Unix timestamp" aria-invalid={!!result.error} inputMode="decimal" value={timestamp} onChange={event => setTimestamp(event.target.value)} placeholder="1704067200" maxLength={40} /></Field>
          <Segments label="Timestamp unit" value={unit} onChange={setUnit} options={[{ value: 'seconds', label: 'Seconds' }, { value: 'milliseconds', label: 'Milliseconds' }]} />
        </> : <>
          <Field label="Calendar date and time" hint="YYYY-MM-DD HH:mm:ss.SSS · Fractional seconds are optional."><input className={s.input} aria-label="Calendar date and time" aria-invalid={!!result.error} value={calendar} onChange={event => setCalendar(event.target.value)} placeholder="2024-01-01 00:00:00.000" maxLength={30} /></Field>
          <Segments label="Interpret calendar input in" value={inputZone} onChange={setInputZone} options={[{ value: 'utc', label: 'UTC' }, { value: 'local', label: 'Device time zone' }]} />
          {inputZone === 'local' && <p className={s.muted}>A repeated time during a daylight-saving fallback uses its earlier occurrence. A skipped time is rejected. Use a Unix timestamp to identify the later occurrence precisely.</p>}
        </>}
        <Segments label="Display time zone" value={zoneMode} onChange={setZoneMode} options={[{ value: 'UTC', label: 'UTC' }, { value: 'local', label: 'Device' }, { value: 'custom', label: 'Other zone' }]} />
        {zoneMode === 'custom' && <Field label="IANA time zone"><input className={s.input} aria-label="IANA time zone" value={displayZone} onChange={event => setDisplayZone(event.target.value)} placeholder="America/New_York" maxLength={80} /></Field>}
        {result.error && <Notice tone="error">{result.error}</Notice>}
      </div></section>
      <div className={s.stack}>
        {rows.length ? rows.map(([label, content]) => <section key={label} className={s.panel}><div className={s.panelHeader}><strong>{label}</strong><CopyButton text={content} /></div><div className={s.panelBody}><code className={s.code} style={{ overflowWrap: 'anywhere' }}>{content}</code></div></section>) : <OutputPanel label="Converted date" value="" />}
      </div>
    </div>
    <Notice>Units are explicit to prevent seconds/milliseconds mistakes. Unix time does not include leap seconds. “Use current time” captures a fixed instant; it does not keep ticking.</Notice>
  </ToolShell>;
}
