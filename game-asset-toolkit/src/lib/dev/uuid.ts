export function generateUuids(count: number, uppercase = false): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('Choose between 1 and 1,000 UUIDs.');
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure randomness is unavailable in this browser.');
  return Array.from({ length: count }, () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
    const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    return uppercase ? uuid.toUpperCase() : uuid;
  });
}
