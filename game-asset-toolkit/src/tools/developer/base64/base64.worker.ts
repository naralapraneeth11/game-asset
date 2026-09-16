import { BASE64_FILE_LIMIT, BASE64_PREVIEW_LIMIT, BASE64_TEXT_LIMIT, bytesToBase64, decodeBase64, rasterInfo } from '@/lib/dev/base64';

export interface Base64Request { mode: 'encode' | 'decode'; text: string; file: File | null; urlSafe: boolean; padding: boolean; dataUri: boolean }
export interface Base64Result { output: string; preview: string; byteLength: number; textValid: boolean; download: Blob | null; filename: string; image: Blob | null; imageWidth: number; imageHeight: number; imageNote: string }

self.onmessage = async ({ data }: MessageEvent<Base64Request>) => {
  try {
    if (data.text.length > BASE64_TEXT_LIMIT) throw new Error('Text input is limited to 2 MiB characters. Use a file for larger input.');
    if (data.file && data.file.size > (data.mode === 'encode' ? BASE64_FILE_LIMIT : Math.ceil(BASE64_FILE_LIMIT / 3) * 4 + 1024 * 1024)) throw new Error('The file exceeds the supported size for this mode.');
    let bytes: Uint8Array<ArrayBuffer>;
    let output = '', mime = 'application/octet-stream', textValid = true;
    if (data.mode === 'encode') {
      bytes = data.file ? new Uint8Array(await data.file.arrayBuffer()) : new TextEncoder().encode(data.text);
      mime = data.file?.type && /^[\w!#$&^.+-]+\/[\w!#$&^.+-]+$/.test(data.file.type) ? data.file.type : data.file ? 'application/octet-stream' : 'text/plain;charset=utf-8';
      output = bytesToBase64(bytes, data.urlSafe && !data.dataUri, data.dataUri || data.padding);
      if (data.dataUri) output = `data:${mime};base64,${output}`;
    } else {
      const decoded = decodeBase64(data.file ? await data.file.text() : data.text);
      bytes = decoded.bytes as Uint8Array<ArrayBuffer>;
      mime = decoded.mimeType;
      try { output = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { textValid = false; }
      // NUL-heavy raster/binary data should not fill an editor even if it happens to be valid UTF-8.
      if (textValid && /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(output)) { textValid = false; output = ''; }
    }
    const raster = rasterInfo(bytes);
    const canPreview = !!raster && bytes.length <= 8 * 1024 * 1024 && raster.width * raster.height <= 8_000_000 && raster.width <= 8192 && raster.height <= 8192;
    // Animated files can contain many frames despite small dimensions. APNG uses PNG's signature.
    let animatedPng = false;
    if (raster?.mime === 'image/png') {
      const view = new DataView(bytes.buffer);
      for (let offset = 8; offset + 12 <= bytes.length;) {
        const length = view.getUint32(offset);
        if (bytes[offset + 4] === 97 && bytes[offset + 5] === 99 && bytes[offset + 6] === 84 && bytes[offset + 7] === 76) { animatedPng = true; break; }
        if (length > bytes.length - offset - 12) break;
        offset += length + 12;
      }
    }
    const safeStaticPreview = canPreview && !animatedPng && (raster?.mime === 'image/png' || raster?.mime === 'image/jpeg');
    const extension = raster?.extension ?? (mime === 'text/plain' || (textValid && data.mode === 'decode') ? 'txt' : 'bin');
    const result: Base64Result = {
      output,
      preview: output.slice(0, BASE64_PREVIEW_LIMIT),
      byteLength: bytes.length,
      textValid,
      download: data.mode === 'decode' ? new Blob([bytes], { type: raster?.mime ?? 'application/octet-stream' }) : null,
      filename: data.mode === 'encode' ? `${data.file?.name || 'encoded'}.base64.txt` : `decoded.${extension}`,
      image: safeStaticPreview ? new Blob([bytes], { type: raster!.mime }) : null,
      imageWidth: safeStaticPreview ? raster!.width : 0,
      imageHeight: safeStaticPreview ? raster!.height : 0,
      imageNote: raster && !safeStaticPreview ? 'The image is ready to download. Inline previews are limited to static PNG/JPEG up to 8 MiB and 8 megapixels.' : '',
    };
    self.postMessage({ result });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Base64 conversion failed.' }); }
};
