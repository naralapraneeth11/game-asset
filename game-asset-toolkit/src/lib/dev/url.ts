export type UrlMode = 'component' | 'uri';

export function transformUrl(value: string, direction: 'encode' | 'decode', mode: UrlMode, formSpaces = false): string {
  if (value.length > 1_000_000) throw new Error('Use up to 1 million characters at a time.');
  try {
    if (direction === 'decode') {
      const input = formSpaces && mode === 'component' ? value.replace(/\+/g, ' ') : value;
      return mode === 'component' ? decodeURIComponent(input) : decodeURI(input);
    }
    const encoded = mode === 'component' ? encodeURIComponent(value) : encodeURI(value);
    return formSpaces && mode === 'component'
      ? encoded.replace(/[!'()~]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%20/g, '+')
      : encoded;
  } catch {
    throw new Error(direction === 'decode'
      ? 'This input has an invalid percent escape or invalid UTF-8 bytes. Each % must be followed by two hexadecimal digits.'
      : 'This text contains an incomplete Unicode character. Replace it before encoding.');
  }
}
