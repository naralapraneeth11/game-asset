import { formatJson, parseLosslessJson } from './json';

export const JWT_MAX_LENGTH = 256 * 1024;
export const JWT_ALGORITHMS = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'PS256', 'ES256'] as const;
export type JwtAlgorithm = typeof JWT_ALGORITHMS[number];
export interface DecodedJwt {
  token: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  headerText: string;
  payloadText: string;
  signature: string;
  signingInput: string;
}
export function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) throw new Error('Invalid base64url segment. JWT segments must use URL-safe characters without padding.');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  let binary: string;
  try { binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4)); }
  catch { throw new Error('A token segment contains invalid Base64.'); }
  if (btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_') !== value) throw new Error('A token segment contains non-canonical Base64 padding bits.');
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
function decodePart(value: string, name: string) {
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(decodeBase64Url(value)); }
  catch (error) { throw new Error(`${name}: ${error instanceof Error ? error.message : 'Invalid UTF-8.'}`); }
  const parsed = parseLosslessJson(text);
  if (parsed.node.kind !== 'object') throw new Error(`${name} must be a JSON object.`);
  if (parsed.duplicateKeys) throw new Error(`${name} contains duplicate JSON keys, which makes interpretation ambiguous.`);
  return { object: JSON.parse(text) as Record<string, unknown>, pretty: formatJson(parsed.node) };
}
export function decodeJwt(input: string): DecodedJwt {
  const token = input.trim().replace(/^Bearer\s+/i, '');
  if (token.length > JWT_MAX_LENGTH) throw new Error('Token exceeds the 256 KiB limit.');
  const parts = token.split('.');
  if (parts.length === 5) throw new Error('This is an encrypted JWE token. This tool decodes three-part signed JWS/JWT tokens; it cannot decrypt JWE.');
  if (parts.length !== 3 || !parts[0] || !parts[1]) throw new Error('Expected three dot-separated parts: header.payload.signature.');
  const header = decodePart(parts[0], 'Header');
  const payload = decodePart(parts[1], 'Payload');
  if (typeof header.object.alg !== 'string' || !header.object.alg) throw new Error('The header must contain a nonempty alg string.');
  if (header.object.b64 === false) throw new Error('Unencoded JWS payloads are not supported for JWT decoding.');
  decodeBase64Url(parts[2]);
  return { token, header: header.object, payload: payload.object, headerText: header.pretty, payloadText: payload.pretty, signature: parts[2], signingInput: `${parts[0]}.${parts[1]}` };
}
export interface JwtTiming { state: 'expired' | 'not-yet-valid' | 'within-window' | 'no-expiry' | 'invalid'; message: string }
export function jwtTiming(payload: Record<string, unknown>, now = Date.now() / 1000): JwtTiming {
  for (const claim of ['exp', 'nbf', 'iat']) {
    const value = payload[claim];
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value * 1000) > 8.64e15)) return { state: 'invalid', message: `${claim} must be a finite NumericDate (seconds since the Unix epoch).` };
  }
  if (typeof payload.exp === 'number' && payload.exp <= now) return { state: 'expired', message: 'Expired according to the exp claim.' };
  if (typeof payload.nbf === 'number' && payload.nbf > now) return { state: 'not-yet-valid', message: 'The nbf claim is in the future.' };
  if (payload.exp === undefined) return { state: 'no-expiry', message: 'No expiry claim. The token does not declare an expiration time.' };
  return { state: 'within-window', message: 'Within the declared time window. This does not verify the signature or authorize the token.' };
}
function pemBytes(value: string): Uint8Array<ArrayBuffer> {
  if (!/^\s*-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----\s*$/.test(value)) throw new Error('Use a PEM SubjectPublicKeyInfo public key (BEGIN PUBLIC KEY), or a public JWK. Certificates and private keys are not accepted.');
  const body = value.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body)) throw new Error('The PEM key contains invalid Base64.');
  try { return Uint8Array.from(atob(body), character => character.charCodeAt(0)); }
  catch { throw new Error('The PEM public key could not be decoded.'); }
}
export async function verifyJwt(token: DecodedJwt, algorithm: JwtAlgorithm, keyInput: string): Promise<boolean> {
  if (!globalThis.crypto?.subtle) throw new Error('Signature verification requires a secure browser context (HTTPS or localhost).');
  if (!JWT_ALGORITHMS.includes(algorithm)) throw new Error('Unsupported verification algorithm.');
  if (token.header.alg !== algorithm) throw new Error('The selected algorithm does not match the token header. Choose the algorithm you expect from the issuer.');
  if (!token.signature || token.header.alg === 'none') throw new Error('Unsigned tokens cannot be verified.');
  if (token.header.crit !== undefined && (!Array.isArray(token.header.crit) || token.header.crit.length > 0)) throw new Error('This token declares critical extensions that this verifier does not support.');
  if (!keyInput.trim()) throw new Error(algorithm.startsWith('HS') ? 'Enter the UTF-8 shared secret.' : 'Enter a public key.');
  if (keyInput.length > 64 * 1024) throw new Error('Key input exceeds the 64 KiB limit.');
  const hash = `SHA-${algorithm.slice(2)}`;
  const signature = decodeBase64Url(token.signature);
  const data = new TextEncoder().encode(token.signingInput);
  let key: CryptoKey;
  let verifyAlgorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams;
  try {
    if (algorithm.startsWith('HS')) {
      key = await crypto.subtle.importKey('raw', new TextEncoder().encode(keyInput), { name: 'HMAC', hash }, false, ['verify']);
      verifyAlgorithm = 'HMAC';
    } else {
      const name = algorithm.startsWith('ES') ? 'ECDSA' : algorithm.startsWith('PS') ? 'RSA-PSS' : 'RSASSA-PKCS1-v1_5';
      const importAlgorithm = name === 'ECDSA' ? { name, namedCurve: 'P-256' } : { name, hash };
      if (keyInput.trim().startsWith('{')) {
        const jwk = JSON.parse(keyInput) as JsonWebKey;
        if (!jwk || typeof jwk !== 'object' || Array.isArray(jwk)) throw new Error('The JWK must be an object.');
        if (jwk.d || jwk.k) throw new Error('Use a public JWK without private key material.');
        if (jwk.alg && jwk.alg !== algorithm) throw new Error('The JWK algorithm does not match your selection.');
        if (jwk.use && jwk.use !== 'sig') throw new Error('The JWK is not designated for signatures.');
        key = await crypto.subtle.importKey('jwk', jwk, importAlgorithm, false, ['verify']);
      } else key = await crypto.subtle.importKey('spki', pemBytes(keyInput), importAlgorithm, false, ['verify']);
      if (name !== 'ECDSA' && (key.algorithm as RsaHashedKeyAlgorithm).modulusLength < 2048) throw new Error('RSA keys smaller than 2048 bits are not accepted.');
      verifyAlgorithm = name === 'ECDSA' ? { name, hash: 'SHA-256' } : name === 'RSA-PSS' ? { name, saltLength: 32 } : name;
      if (name === 'ECDSA' && signature.byteLength !== 64) throw new Error('ES256 JWT signatures must be 64-byte JOSE (R || S) values.');
    }
    return await crypto.subtle.verify(verifyAlgorithm, key, signature, data);
  } catch (error) {
    if (error instanceof DOMException) throw new Error(`The browser could not use this key or algorithm (${error.name}). Check the public key format and algorithm.`);
    throw error;
  }
}
