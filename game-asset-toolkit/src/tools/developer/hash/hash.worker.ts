import { HASH_ALGORITHMS, HASH_FILE_LIMIT, HASH_TEXT_LIMIT, hashBytes, type HashAlgorithm } from '@/lib/dev/hash';
import { MD5 } from '@/lib/dev/md5';

export interface HashRequest { algorithm: HashAlgorithm; text: string; file: File | null }
self.onmessage = async ({ data }: MessageEvent<HashRequest>) => {
  try {
    if (!(HASH_ALGORITHMS as readonly string[]).includes(data.algorithm)) throw new Error('Unsupported algorithm.');
    if (data.text.length > HASH_TEXT_LIMIT) throw new Error('Text input is limited to 2 MiB characters. Use file input for larger values.');
    if (data.file && data.file.size > HASH_FILE_LIMIT) throw new Error('File hashing is limited to 64 MiB to protect browser memory.');
    let result: string;
    if (data.file && data.algorithm === 'MD5') {
      const digest = new MD5();
      for (let offset = 0; offset < data.file.size; offset += 1024 * 1024) {
        digest.update(new Uint8Array(await data.file.slice(offset, offset + 1024 * 1024).arrayBuffer()));
        self.postMessage({ progress: Math.min(95, Math.round((offset + 1024 * 1024) / data.file.size * 95)) });
      }
      result = digest.digest();
    } else {
      self.postMessage({ progress: 10 });
      const bytes = data.file ? new Uint8Array(await data.file.arrayBuffer()) : new TextEncoder().encode(data.text);
      self.postMessage({ progress: 35 });
      result = await hashBytes(bytes, data.algorithm);
    }
    self.postMessage({ result });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Hashing failed.' }); }
};
