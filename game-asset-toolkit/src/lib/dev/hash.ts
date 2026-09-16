import { md5 } from './md5';

export const HASH_ALGORITHMS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];
export const HASH_FILE_LIMIT = 64 * 1024 * 1024;
export const HASH_TEXT_LIMIT = 2 * 1024 * 1024;
export const HASH_LENGTHS: Record<HashAlgorithm, number> = {
  MD5: 32,
  'SHA-1': 40,
  'SHA-256': 64,
  'SHA-384': 96,
  'SHA-512': 128,
};

export async function hashBytes(bytes: Uint8Array<ArrayBuffer>, algorithm: HashAlgorithm): Promise<string> {
  if (!(HASH_ALGORITHMS as readonly string[]).includes(algorithm)) throw new Error('Unsupported hash algorithm.');
  if (algorithm === 'MD5') return md5(bytes);
  if (!globalThis.crypto?.subtle) throw new Error('SHA hashing requires Web Crypto. Open this site over HTTPS or localhost in a current browser.');
  const digest = await crypto.subtle.digest(algorithm, bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Keep the original API available to existing tool clients.
export async function hashText(algorithm: HashAlgorithm, text: string): Promise<string> {
  if (text.length > HASH_TEXT_LIMIT) throw new Error('Text input is limited to 2 MiB characters. Use file input for larger values.');
  return hashBytes(new TextEncoder().encode(text), algorithm);
}

export async function hashFile(algorithm: HashAlgorithm, file: File): Promise<string> {
  if (file.size > HASH_FILE_LIMIT) throw new Error('File hashing is limited to 64 MiB to protect browser memory.');
  return hashBytes(new Uint8Array(await file.arrayBuffer()), algorithm);
}

export function compareHash(actual: string, expected: string, algorithm: HashAlgorithm): 'empty' | 'invalid' | 'match' | 'mismatch' {
  const normalized = expected.trim();
  if (!normalized) return 'empty';
  if (normalized.length !== HASH_LENGTHS[algorithm] || !/^[a-f\d]+$/i.test(normalized)) return 'invalid';
  return actual.toLowerCase() === normalized.toLowerCase() ? 'match' : 'mismatch';
}
