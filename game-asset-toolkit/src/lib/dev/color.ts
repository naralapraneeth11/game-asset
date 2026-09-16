export type Rgba = { r: number; g: number; b: number; a: number };
export type ColorResult = { hex: string; rgb: string; hsl: string; oklch: string; color: Rgba; gamutMapped: boolean };
const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const round = (n: number, digits = 3) => Number(n.toFixed(digits));
const hue = (n: number) => ((n % 360) + 360) % 360;
const toLinear = (n: number) => n <= .04045 ? n / 12.92 : Math.pow((n + .055) / 1.055, 2.4);
const toSrgb = (n: number) => n <= .0031308 ? 12.92 * n : 1.055 * Math.pow(n, 1 / 2.4) - .055;

function numeric(text: string): number {
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) throw new Error('A color component is not a valid number.');
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error('Color components must be finite numbers.');
  return value;
}
function ratio(text: string): number { return text.endsWith('%') ? numeric(text.slice(0, -1)) / 100 : numeric(text); }
function angle(text: string): number {
  const match = /^(.*?)(deg|grad|rad|turn)?$/.exec(text);
  if (!match) throw new Error('Use a hue in degrees, radians, grads, or turns.');
  const scales: Record<string, number> = { deg: 1, grad: .9, rad: 180 / Math.PI, turn: 360 };
  const scale = scales[match[2] || 'deg'] ?? 1;
  return hue((numeric(match[1]) % (360 / scale)) * scale);
}
function bounded(value: number, name: string, max = 1): number {
  if (value < 0 || value > max) throw new Error(`${name} must be between 0 and ${max}.`);
  return value;
}
function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const radians = h * Math.PI / 180, a = c * Math.cos(radians), b = c * Math.sin(radians);
  const ll = Math.pow(l + .3963377774 * a + .2158037573 * b, 3);
  const mm = Math.pow(l - .1055613458 * a - .0638541728 * b, 3);
  const ss = Math.pow(l - .0894841775 * a - 1.291485548 * b, 3);
  return [4.0767416621 * ll - 3.3077115913 * mm + .2309699292 * ss, -1.2684380046 * ll + 2.6097574011 * mm - .3413193965 * ss, -.0041960863 * ll - .7034186147 * mm + 1.707614701 * ss].map(toSrgb) as [number, number, number];
}
const inGamut = (rgb: number[]) => rgb.every(n => n >= -1e-7 && n <= 1 + 1e-7);

export function convertColor(input: string): ColorResult {
  const text = input.trim().toLowerCase();
  if (text.length > 200) throw new Error('Enter one color value, up to 200 characters.');
  let color: Rgba, gamutMapped = false;
  if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/.test(text)) {
    let hex = text.slice(1);
    if (hex.length <= 4) hex = Array.from(hex, n => n + n).join('');
    color = { r: parseInt(hex.slice(0, 2), 16) / 255, g: parseInt(hex.slice(2, 4), 16) / 255, b: parseInt(hex.slice(4, 6), 16) / 255, a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1 };
  } else if (text === 'transparent') {
    color = { r: 0, g: 0, b: 0, a: 0 };
  } else {
    const match = /^(rgb|rgba|hsl|hsla|oklch)\((.*)\)$/.exec(text);
    if (!match) throw new Error('Enter HEX, rgb(), hsl(), or oklch(). Example: #ff6b00');
    const kind = match[1], body = match[2].trim();
    let parts: string[], alpha = '1';
    if (body.includes(',')) {
      if (body.includes('/') || kind === 'oklch') throw new Error('Use spaces and / for modern color syntax.');
      parts = body.split(',').map(n => n.trim());
      if (parts.length === 4) alpha = parts.pop()!;
    } else {
      const sections = body.split('/');
      if (sections.length > 2) throw new Error('Use only one / before the alpha value.');
      parts = sections[0].trim().split(/\s+/);
      if (sections[1] !== undefined) alpha = sections[1].trim();
    }
    if (parts.length !== 3) throw new Error('A color needs three components, with optional alpha.');
    const a = bounded(ratio(alpha), 'Alpha');
    if (kind.startsWith('rgb')) {
      const rgb = parts.map(n => bounded(n.endsWith('%') ? ratio(n) : numeric(n) / 255, 'RGB channels (normalized)'));
      color = { r: rgb[0], g: rgb[1], b: rgb[2], a };
    } else if (kind.startsWith('hsl')) {
      if (!parts[1].endsWith('%') || !parts[2].endsWith('%')) throw new Error('HSL saturation and lightness need percent signs.');
      const h = angle(parts[0]), s = bounded(ratio(parts[1]), 'Saturation'), l = bounded(ratio(parts[2]), 'Lightness');
      const chroma = (1 - Math.abs(2 * l - 1)) * s, x = chroma * (1 - Math.abs((h / 60) % 2 - 1)), offset = l - chroma / 2;
      const rgb = h < 60 ? [chroma, x, 0] : h < 120 ? [x, chroma, 0] : h < 180 ? [0, chroma, x] : h < 240 ? [0, x, chroma] : h < 300 ? [x, 0, chroma] : [chroma, 0, x];
      color = { r: rgb[0] + offset, g: rgb[1] + offset, b: rgb[2] + offset, a };
    } else {
      const l = bounded(ratio(parts[0]), 'Lightness'), c = parts[1].endsWith('%') ? ratio(parts[1]) * .4 : numeric(parts[1]), h = angle(parts[2]);
      if (c < 0 || c > 4) throw new Error('Use an OKLCH chroma between 0 and 4.');
      let rgb = oklchToRgb(l, c, h);
      if (!inGamut(rgb)) {
        gamutMapped = true;
        let low = 0, high = c;
        for (let iteration = 0; iteration < 28; iteration++) {
          const middle = (low + high) / 2;
          if (inGamut(oklchToRgb(l, middle, h))) low = middle; else high = middle;
        }
        rgb = oklchToRgb(l, low, h);
      }
      color = { r: clamp(rgb[0]), g: clamp(rgb[1]), b: clamp(rgb[2]), a };
    }
  }
  const { r, g, b, a } = color;
  const hex = '#' + [r, g, b, ...(a < 1 ? [a] : [])].map(n => Math.round(clamp(n) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  const rgb = `rgb(${[r, g, b].map(n => round(n * 255, 3)).join(' ')}${a < 1 ? ` / ${round(a, 4)}` : ''})`;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min, light = (max + min) / 2;
  const sat = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1));
  const h = delta < 1e-10 ? 0 : hue(60 * (max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4));
  const hsl = `hsl(${round(h)} ${round(sat * 100)}% ${round(light * 100)}%${a < 1 ? ` / ${round(a, 4)}` : ''})`;
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const ll = Math.cbrt(.4122214708 * lr + .5363325363 * lg + .0514459929 * lb);
  const mm = Math.cbrt(.2119034982 * lr + .6806995451 * lg + .1073969566 * lb);
  const ss = Math.cbrt(.0883024619 * lr + .2817188376 * lg + .6299787005 * lb);
  const ol = .2104542553 * ll + .793617785 * mm - .0040720468 * ss;
  const oa = 1.9779984951 * ll - 2.428592205 * mm + .4505937099 * ss;
  const ob = .0259040371 * ll + .7827717662 * mm - .808675766 * ss;
  const oc = Math.hypot(oa, ob), oh = oc < 1e-7 ? 0 : hue(Math.atan2(ob, oa) * 180 / Math.PI);
  const oklch = `oklch(${round(ol, 5)} ${round(oc, 5)} ${round(oh)}${a < 1 ? ` / ${round(a, 4)}` : ''})`;
  return { hex, rgb, hsl, oklch, color, gamutMapped };
}
