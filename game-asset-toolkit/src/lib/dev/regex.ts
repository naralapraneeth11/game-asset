export const REGEX_LIMITS = { input: 1_000_000, pattern: 10_000, replacement: 16_000, matches: 2000, output: 4_000_000, timeout: 1500 } as const;
export interface RegexMatch { index: number; end: number; value: string; groups: (string | null)[]; named: Record<string, string | null> | null; }
export interface RegexJob { pattern: string; flags: string; text: string; replacement: string; replace: boolean; }
export interface RegexResult { matches: RegexMatch[]; truncated: boolean; truncationReason?: 'matches' | 'size'; replaced: string | null; elapsed: number; }

function nextIndex(text: string, index: number, unicode: boolean): number {
  if (!unicode) return index + 1;
  const point = text.codePointAt(index);
  return index + (point !== undefined && point > 0xffff ? 2 : 1);
}

// ECMAScript replacement tokens, without executing user code or building unbounded strings.
function substitution(template: string, match: RegExpExecArray, text: string, maxLength: number): string {
  const pieces: string[] = [];
  let length = 0, cursor = 0;
  const append = (value: string) => {
    length += value.length;
    if (length > maxLength) throw new Error("Replacement output exceeds 4,000,000 characters. Reduce prefix, suffix or capture substitutions.");
    pieces.push(value);
  };
  for (const token of template.matchAll(/\$([$&`']|\d{1,2}|<[^>]*>)/g)) {
    append(template.slice(cursor, token.index));
    const part = token[1];
    let value = token[0];
    if (part === "$") value = "$";
    else if (part === "&") value = match[0];
    else if (part === "`") value = text.slice(0, match.index);
    else if (part === "'") value = text.slice(match.index + match[0].length);
    else if (part[0] === "<") value = match.groups ? match.groups[part.slice(1, -1)] ?? "" : token[0];
    else {
      const number = Number(part);
      if (number > 0 && number < match.length) value = match[number] ?? "";
      else {
        const first = Number(part[0]);
        if (part.length === 2 && first > 0 && first < match.length) value = (match[first] ?? "") + part[1];
      }
    }
    append(value);
    cursor = token.index + token[0].length;
  }
  append(template.slice(cursor));
  return pieces.join("");
}

// Budget serialized capture data before cloning it to the UI. A zero-width lookahead can
// otherwise return the entire input in thousands of overlapping capture groups.
function matchCost(match: RegExpExecArray, remaining: number): number {
  let total = 160;
  const add = (value: string | undefined) => {
    total += value === undefined ? 16 : 16 + value.length;
    if (total > remaining || value === undefined) return;
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (code === 34 || code === 92) total++;
      else if (code < 32) total += [8, 9, 10, 12, 13].includes(code) ? 1 : 5;
      else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length && value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) i++;
      else if (code >= 0xd800 && code <= 0xdfff) total += 5;
      if (total > remaining) break;
    }
  };
  for (const value of match) { add(value); if (total > remaining) return total; }
  if (match.groups) for (const [key, value] of Object.entries(match.groups)) { add(key); add(value); if (total > remaining) return total; }
  return total;
}

/** Must run inside a disposable worker: JavaScript RegExp itself cannot be interrupted. */
export function evaluateRegex(job: RegexJob): RegexResult {
  const start = performance.now();
  if (job.text.length > REGEX_LIMITS.input) throw new Error("Sample text is limited to 1,000,000 characters.");
  if (job.pattern.length > REGEX_LIMITS.pattern) throw new Error("Patterns are limited to 10,000 characters.");
  if (job.replacement.length > REGEX_LIMITS.replacement) throw new Error("Replacement text is limited to 16,000 characters.");
  if (!/^[gimsuy]*$/.test(job.flags) || new Set(job.flags).size !== job.flags.length) throw new Error("Use each supported flag at most once: g, i, m, s, u, y.");
  const expression = new RegExp(job.pattern, job.flags);
  const matches: RegexMatch[] = [];
  const output: string[] = [];
  let outputLength = 0;
  let cursor = 0;
  let truncated = false;
  let truncationReason: RegexResult['truncationReason'];
  let storedLength = 0;
  function append(value: string) {
    outputLength += value.length;
    if (outputLength > REGEX_LIMITS.output) throw new Error("Replacement output exceeds 4,000,000 characters. Use a smaller sample or replacement.");
    output.push(value);
  }
  let match: RegExpExecArray | null;
  while ((match = expression.exec(job.text)) !== null) {
    if (matches.length === REGEX_LIMITS.matches) { truncated = true; truncationReason = 'matches'; break; }
    const cost = matchCost(match, REGEX_LIMITS.output - storedLength);
    if (storedLength + cost > REGEX_LIMITS.output) { truncated = true; truncationReason = 'size'; break; }
    storedLength += cost;
    matches.push({ index: match.index, end: match.index + match[0].length, value: match[0], groups: match.slice(1).map((value) => value ?? null), named: match.groups ? Object.fromEntries(Object.entries(match.groups).map(([key, value]) => [key, value ?? null])) : null });
    if (job.replace) {
      append(job.text.slice(cursor, match.index));
      append(substitution(job.replacement, match, job.text, REGEX_LIMITS.output - outputLength));
      cursor = match.index + match[0].length;
    }
    if (!expression.global) break;
    if (!match[0].length) expression.lastIndex = nextIndex(job.text, expression.lastIndex, expression.unicode);
  }
  if (job.replace && !truncated) append(job.text.slice(cursor));
  return { matches, truncated, truncationReason, replaced: job.replace && !truncated ? output.join("") : null, elapsed: Math.round((performance.now() - start) * 10) / 10 };
}

export const regexPatterns = [
  { name: "Email shape", pattern: "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", flags: "gi", note: "A practical shape check, not complete email-address validation." },
  { name: "HTTP URLs", pattern: "https?://[^\\s<>\\\"]+", flags: "gi", note: "Finds URL-like text. Use the URL tool to inspect escaping." },
  { name: "Named captures", pattern: "(?<key>[\\w-]+)=(?<value>[^\\s]+)", flags: "g", note: "Captures key=value pairs into named groups." },
  { name: "Hex colors", pattern: "#(?:[\\da-f]{8}|[\\da-f]{6}|[\\da-f]{4}|[\\da-f]{3})\\b", flags: "gi", note: "Finds CSS hexadecimal colors, with optional alpha." },
  { name: "Line endings", pattern: "\\r\\n|\\r|\\n", flags: "g", note: "Matches Windows, classic Mac and Unix line endings." },
] as const;
