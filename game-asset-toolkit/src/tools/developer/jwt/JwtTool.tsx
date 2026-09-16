'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ToolShell, CodeEditor, OutputPanel, ActionBar, Button, Field, Notice, CopyButton } from '@/components/dev';
import s from '@/components/dev/dev.module.css';
import { decodeJwt, JWT_ALGORITHMS, JWT_MAX_LENGTH, jwtTiming, verifyJwt, type JwtAlgorithm } from '@/lib/dev/jwt';
import { errorMessage, useDebouncedValue } from '@/lib/dev/browser';

const claims: Record<string, string> = {
  iss: 'Issuer — identifies the service that issued the token.',
  sub: 'Subject — identifies the user or entity represented by the token.',
  aud: 'Audience — identifies the intended recipient(s). Your application must check it.',
  exp: 'Expiration — time after which the token must not be accepted.',
  nbf: 'Not before — earliest time the token may be accepted.',
  iat: 'Issued at — time the token was issued. It is not an expiration time.',
  jti: 'JWT ID — unique identifier that can support replay protection.',
};
type Verification = { state: 'idle' | 'working' | 'verified' | 'failed' | 'error'; message?: string; token?: string; key?: string; algorithm?: string };
export default function JwtTool() {
  const [input, setInput] = useState('');
  const [key, setKey] = useState('');
  const [algorithm, setAlgorithm] = useState<JwtAlgorithm>('HS256');
  const [verification, setVerification] = useState<Verification>({ state: 'idle' });
  const [now, setNow] = useState(0);
  const version = useRef(0);
  const inputRef = useRef(input); inputRef.current = input;
  const keyRef = useRef(key); keyRef.current = key;
  const algorithmRef = useRef(algorithm); algorithmRef.current = algorithm;
  const debounced = useDebouncedValue(input, 140);
  const decoded = useMemo(() => {
    if (!debounced.trim()) return { token: undefined, error: '' };
    try { return { token: decodeJwt(debounced), error: '' }; }
    catch (error) { return { token: undefined, error: errorMessage(error) }; }
  }, [debounced]);
  useEffect(() => { setNow(Date.now() / 1000); const interval = setInterval(() => setNow(Date.now() / 1000), 1000); return () => { clearInterval(interval); version.current++; }; }, []);
  const token = input === debounced ? decoded.token : undefined;
  const timing = token && now ? jwtTiming(token.payload, now) : undefined;
  const state = verification.token === input && verification.key === key && verification.algorithm === algorithm ? verification : { state: 'idle' } as Verification;
  const verify = async () => {
    if (!token) return;
    const job = ++version.current;
    const provenance = { token: input, key, algorithm };
    setVerification({ ...provenance, state: 'working' });
    try {
      const valid = await verifyJwt(token, algorithm, key);
      if (job !== version.current || inputRef.current !== input || keyRef.current !== key || algorithmRef.current !== algorithm) return;
      setVerification({ ...provenance, state: valid ? 'verified' : 'failed', message: valid ? 'Signature matches the supplied key. Issuer, audience, time claims, and application policy still need validation.' : 'Signature does not match the supplied key.' });
    } catch (error) { if (job === version.current && inputRef.current === input && keyRef.current === key && algorithmRef.current === algorithm) setVerification({ ...provenance, state: 'error', message: errorMessage(error) }); }
  };
  const clear = () => { version.current++; setInput(''); setKey(''); setVerification({ state: 'idle' }); };
  const output = token ? `Header\n${token.headerText}\n\nPayload\n${token.payloadText}` : '';
  return <ToolShell toolId="jwt-decoder" onClear={clear} onProcess={verify} actions={<ActionBar onClear={clear} output={output} filename="decoded-jwt.txt" />}>
    <CodeEditor label="JSON Web Token" value={input} onChange={setInput} placeholder="Paste a token or Bearer token…" minHeight={130} maxLength={JWT_MAX_LENGTH + 7} error={input === debounced ? decoded.error : undefined} description="Three-part JWT / JWS · up to 256 KiB · token and keys remain in this page's memory" />
    {token && <>
      <Notice tone={token.header.alg === 'none' || !token.signature ? 'warning' : state.state === 'verified' ? 'success' : 'info'}>{token.header.alg === 'none' || !token.signature ? 'Unsigned token. There is no cryptographic proof of its contents.' : state.state === 'verified' ? 'Signature verified with your supplied key.' : 'Decoded, not verified. Anyone can create or modify a token payload.'} Algorithm: <code>{String(token.header.alg)}</code>.</Notice>
      {timing && <Notice tone={timing.state === 'expired' || timing.state === 'invalid' ? 'error' : timing.state === 'not-yet-valid' || timing.state === 'no-expiry' ? 'warning' : 'info'}>{timing.message} Time checks use your device clock with no clock-skew allowance.</Notice>}
    </>}
    <div className={s.split}>
      <OutputPanel label="Header" value={token?.headerText ?? ''} language="json" filename="jwt-header.json" />
      <OutputPanel label="Payload" value={token?.payloadText ?? ''} language="json" filename="jwt-payload.json" />
    </div>
    {token && <section className={s.panel} aria-label="Registered claims"><div className={s.panelHeader}>Registered claims</div><div className={s.panelBody}>
      {Object.entries(claims).filter(([claim]) => Object.hasOwn(token.payload, claim)).length === 0 ? <p className={s.muted}>No registered claims are present. Custom claims are shown in the payload.</p> : <dl className={s.stack}>{Object.entries(claims).filter(([claim]) => Object.hasOwn(token.payload, claim)).map(([claim, description]) => <div key={claim}><dt><code>{claim}</code> <span className={s.muted}>{description}</span></dt><dd style={{ margin: '6px 0 0', overflowWrap: 'anywhere', fontFamily: 'monospace' }}>{['exp', 'iat', 'nbf'].includes(claim) && typeof token.payload[claim] === 'number' && Number.isFinite(token.payload[claim]) && Math.abs((token.payload[claim] as number) * 1000) <= 8.64e15 ? `${new Date((token.payload[claim] as number) * 1000).toISOString()} · ${token.payload[claim]} seconds` : JSON.stringify(token.payload[claim])}</dd></div>)}</dl>}
    </div></section>}
    <details className={s.panel}>
      <summary className={s.panelHeader} style={{ cursor: 'pointer' }}>Verify a signature <span className={s.muted}>Optional · local Web Crypto</span></summary>
      <div className={`${s.panelBody} ${s.stack}`}>
        <Notice>Select the algorithm you expect from the issuer. This tool never fetches keys from token URLs. Verification checks the signature only; it does not establish the issuer&apos;s identity.</Notice>
        <Field label="Expected algorithm"><select className={s.select} value={algorithm} onChange={event => { version.current++; setAlgorithm(event.target.value as JwtAlgorithm); }}>{JWT_ALGORITHMS.map(value => <option value={value} key={value}>{value}</option>)}</select></Field>
        {algorithm.startsWith('HS') ? <Field label="Shared secret (literal UTF-8 text)" hint="Used exactly as entered, including whitespace. Clear the page when finished."><input className={s.input} type="password" value={key} onChange={event => { version.current++; setKey(event.target.value); }} autoComplete="off" spellCheck={false} autoCapitalize="off" maxLength={65536} placeholder="Enter the shared secret" /></Field> : <CodeEditor label="Public key" value={key} onChange={value => { version.current++; setKey(value); }} placeholder="-----BEGIN PUBLIC KEY----- or a public JWK object" minHeight={150} maxLength={65536} description="RSA: at least 2048 bits. ES256: P-256. Private keys are not accepted." />}
        {algorithm.startsWith('HS') && key.length > 0 && new TextEncoder().encode(key).length < Number(algorithm.slice(2)) / 8 && <Notice tone="warning">This secret is shorter than the recommended {Number(algorithm.slice(2))} bits for {algorithm}. A matching signature does not make a weak secret safe.</Notice>}
        <div className={s.row}><Button variant="primary" onClick={verify} disabled={!token || !key || state.state === 'working'}>{state.state === 'working' ? 'Verifying…' : 'Verify signature'}</Button><Button variant="ghost" onClick={() => { version.current++; setKey(''); setVerification({ state: 'idle' }); }} disabled={!key}>Clear key</Button>{token?.signature && <CopyButton text={token.signature} label="Copy signature" />}</div>
        {state.message && <Notice tone={state.state === 'verified' ? 'success' : 'error'}>{state.message}</Notice>}
      </div>
    </details>
  </ToolShell>;
}
