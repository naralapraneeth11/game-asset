/** Incremental RFC 1321 MD5 for legacy checksums, never authentication. */
const ROTATION = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
const CONSTANTS = Uint32Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000));

export class MD5 {
  private state = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
  private tail = new Uint8Array(64);
  private tailLength = 0;
  private byteLength = 0;
  private finalized = false;

  update(input: Uint8Array): this {
    if (this.finalized) throw new Error('This MD5 calculation has already finished.');
    this.byteLength += input.length;
    let offset = 0;
    if (this.tailLength) {
      const count = Math.min(64 - this.tailLength, input.length);
      this.tail.set(input.subarray(0, count), this.tailLength);
      this.tailLength += count;
      offset = count;
      if (this.tailLength === 64) { this.block(this.tail, 0); this.tailLength = 0; }
    }
    while (offset + 64 <= input.length) { this.block(input, offset); offset += 64; }
    if (offset < input.length) { this.tail.set(input.subarray(offset), 0); this.tailLength = input.length - offset; }
    return this;
  }

  private block(bytes: Uint8Array, offset: number) {
    const words = new DataView(bytes.buffer, bytes.byteOffset + offset, 64);
    let [a, b, c, d] = this.state;
    for (let i = 0; i < 64; i++) {
      let f: number, word: number;
      if (i < 16) { f = (b & c) | (~b & d); word = i; }
      else if (i < 32) { f = (d & b) | (~d & c); word = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; word = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); word = (7 * i) % 16; }
      const shift = ROTATION[(i >>> 4) * 4 + (i % 4)];
      const sum = (a + f + CONSTANTS[i] + words.getUint32(word * 4, true)) | 0;
      const previousD = d;
      d = c; c = b;
      b = (b + ((sum << shift) | (sum >>> (32 - shift)))) | 0;
      a = previousD;
    }
    this.state[0] += a; this.state[1] += b; this.state[2] += c; this.state[3] += d;
  }

  digest(): string {
    if (this.finalized) throw new Error('This MD5 calculation has already finished.');
    const originalLength = this.byteLength;
    const paddingLength = this.tailLength < 56 ? 64 - this.tailLength : 128 - this.tailLength;
    const padding = new Uint8Array(paddingLength);
    padding[0] = 128;
    const view = new DataView(padding.buffer);
    view.setUint32(paddingLength - 8, (originalLength * 8) >>> 0, true);
    view.setUint32(paddingLength - 4, Math.floor(originalLength / 0x20000000), true);
    this.update(padding);
    this.finalized = true;
    let hex = '';
    for (const word of this.state) for (let i = 0; i < 4; i++) hex += ((word >>> (i * 8)) & 255).toString(16).padStart(2, '0');
    return hex;
  }
}

export const md5 = (bytes: Uint8Array): string => new MD5().update(bytes).digest();
