import { md5 } from './md5';

export const HASH_ALGORITHMS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

const WEB_CRYPTO: Record<string, string> = {
  'SHA-1': 'SHA-1',
  'SHA-256': 'SHA-256',
  'SHA-384': 'SHA-384',
  'SHA-512': 'SHA-512',
};

export async function hashText(algorithm: HashAlgorithm, text: string): Promise<string> {
  if (algorithm === 'MD5') return md5(text);
  const algo = WEB_CRYPTO[algorithm];
  if (!algo) throw new Error(`Unsupported algorithm: ${algorithm}`);
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(algo, data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashFile(algorithm: HashAlgorithm, file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  if (algorithm === 'MD5') {
    const text = new TextDecoder().decode(buffer);
    return md5(text);
  }
  const algo = WEB_CRYPTO[algorithm];
  if (!algo) throw new Error(`Unsupported algorithm: ${algorithm}`);
  const digest = await crypto.subtle.digest(algo, buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
