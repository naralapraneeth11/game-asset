/** Strict, lossless JSON: numbers and duplicate object members retain their source lexemes. */
export const JSON_MAX_BYTES = 10 * 1024 * 1024;
export const JSON_MAX_NODES = 250_000;
export const JSON_MAX_DEPTH = 128;
const OUTPUT_LIMIT = 32 * 1024 * 1024;
export type JsonKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
export interface JsonNode {
  kind: JsonKind;
  raw?: string;
  members?: { key: string; keyRaw: string; node: JsonNode }[];
  items?: JsonNode[];
}
export interface JsonIssue { message: string; line: number; column: number; offset: number }
export class JsonSyntaxError extends Error {
  readonly issue: JsonIssue;
  constructor(message: string, source: string, offset: number) {
    const prefix = source.slice(0, offset);
    const line = prefix.split('\n').length;
    const column = offset - prefix.lastIndexOf('\n');
    super(`${message} (line ${line}, column ${column})`);
    this.name = 'JsonSyntaxError';
    this.issue = { message, line, column, offset };
  }
}
export interface ParsedJson { node: JsonNode; nodeCount: number; duplicateKeys: number; unsafeIntegers: number }
export function parseLosslessJson(source: string): ParsedJson {
  if (new TextEncoder().encode(source).byteLength > JSON_MAX_BYTES) throw new Error('JSON exceeds the 10 MiB input limit. Split it into smaller documents.');
  let cursor = 0;
  let count = 0;
  let duplicates = 0;
  let unsafeIntegers = 0;
  const fail = (message: string): never => { throw new JsonSyntaxError(message, source, cursor); };
  const skip = () => { while (cursor < source.length && /[\x20\t\r\n]/.test(source[cursor])) cursor++; };
  const string = (): string => {
    const start = cursor++;
    while (cursor < source.length) {
      const code = source.charCodeAt(cursor++);
      if (code === 34) return source.slice(start, cursor);
      if (code < 32) fail('A JSON string cannot contain an unescaped control character');
      if (code === 92) {
        const escape = source[cursor++];
        if (escape === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(source.slice(cursor, cursor + 4))) fail('Use exactly four hexadecimal digits after \\u');
          cursor += 4;
        } else if (!escape || !'"\\/bfnrt'.includes(escape)) fail('Invalid string escape');
      }
    }
    return fail('Unterminated string; add a closing double quote');
  };
  const value = (depth: number): JsonNode => {
    if (depth > JSON_MAX_DEPTH) fail(`Nesting exceeds the ${JSON_MAX_DEPTH}-level limit`);
    if (++count > JSON_MAX_NODES) fail('JSON exceeds the 250,000-value limit');
    skip();
    const c = source[cursor];
    if (c === '{') {
      cursor++; skip();
      const members: NonNullable<JsonNode['members']> = [];
      const seen = new Set<string>();
      if (source[cursor] === '}') { cursor++; return { kind: 'object', members }; }
      while (cursor < source.length) {
        if (source[cursor] !== '"') fail('Object keys must be enclosed in double quotes');
        const keyRaw = string(); const key: string = JSON.parse(keyRaw);
        if (seen.has(key)) duplicates++; else seen.add(key);
        skip(); if (source[cursor++] !== ':') { cursor--; fail('Expected a colon after the object key'); }
        members.push({ key, keyRaw, node: value(depth + 1) });
        skip();
        if (source[cursor] === '}') { cursor++; return { kind: 'object', members }; }
        if (source[cursor++] !== ',') { cursor--; fail('Expected a comma or closing brace'); }
        skip(); if (source[cursor] === '}') fail('Trailing commas are not valid JSON; remove the final comma');
      }
      return fail('Unterminated object; add a closing brace');
    }
    if (c === '[') {
      cursor++; skip();
      const items: JsonNode[] = [];
      if (source[cursor] === ']') { cursor++; return { kind: 'array', items }; }
      while (cursor < source.length) {
        items.push(value(depth + 1)); skip();
        if (source[cursor] === ']') { cursor++; return { kind: 'array', items }; }
        if (source[cursor++] !== ',') { cursor--; fail('Expected a comma or closing bracket'); }
        skip(); if (source[cursor] === ']') fail('Trailing commas are not valid JSON; remove the final comma');
      }
      return fail('Unterminated array; add a closing bracket');
    }
    if (c === '"') return { kind: 'string', raw: string() };
    for (const literal of ['true', 'false', 'null']) if (source.startsWith(literal, cursor)) {
      cursor += literal.length;
      return { kind: literal === 'null' ? 'null' : 'boolean', raw: literal };
    }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(source.slice(cursor));
    if (number) {
      cursor += number[0].length;
      if (!Number.isFinite(Number(number[0])) || (Number.isInteger(Number(number[0])) && !Number.isSafeInteger(Number(number[0])))) unsafeIntegers++;
      return { kind: 'number', raw: number[0] };
    }
    if (c === "'") fail('JSON uses double quotes, not single quotes');
    if (c === '/') fail('Comments are not allowed in strict JSON');
    return fail(cursor >= source.length ? 'Expected a JSON value' : 'Expected an object, array, string, number, true, false, or null');
  };
  const node = value(0); skip();
  if (cursor !== source.length) fail('Unexpected content after the JSON value; check for a missing comma or an invalid number');
  return { node, nodeCount: count, duplicateKeys: duplicates, unsafeIntegers };
}
function ordered(node: JsonNode, sort: boolean) {
  const members = node.members ?? [];
  return sort ? [...members].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0) : members;
}
export function formatJson(node: JsonNode, indent: string = '  ', sort = false): string {
  const parts: string[] = []; let size = 0;
  const append = (value: string) => { size += value.length; if (size > OUTPUT_LIMIT) throw new Error('Formatted output exceeds 32 MiB. Choose Minify or reduce the input.'); parts.push(value); };
  const render = (current: JsonNode, depth: number) => {
    if (current.kind !== 'object' && current.kind !== 'array') { append(current.raw!); return; }
    const object = current.kind === 'object';
    const children = object ? ordered(current, sort).map(member => ({ key: member.keyRaw, node: member.node })) : (current.items ?? []).map(item => ({ key: '', node: item }));
    append(object ? '{' : '[');
    children.forEach((child, index) => {
      if (index) append(',');
      if (indent) append('\n' + indent.repeat(depth + 1));
      if (object) append(child.key + ':' + (indent ? ' ' : ''));
      render(child.node, depth + 1);
    });
    if (children.length && indent) append('\n' + indent.repeat(depth));
    append(object ? '}' : ']');
  };
  render(node, 0); return parts.join('');
}
export interface JsonTreeNode { kind: JsonKind; label: string; path: string; preview: string; children?: JsonTreeNode[]; omitted?: number }
export function jsonTree(node: JsonNode): JsonTreeNode {
  let budget = 3000;
  const visit = (current: JsonNode, label: string, path: string): JsonTreeNode => {
    budget--;
    const children = current.kind === 'object' ? (current.members ?? []).map(m => ({ label: m.key, path: `${path}[${JSON.stringify(m.key)}]`, node: m.node })) : (current.items ?? []).map((item, i) => ({ label: String(i), path: `${path}[${i}]`, node: item }));
    const preview = current.kind === 'object' ? `${children.length} properties` : current.kind === 'array' ? `${children.length} items` : (current.raw ?? '').slice(0, 240) + ((current.raw?.length ?? 0) > 240 ? '…' : '');
    const result: JsonTreeNode = { kind: current.kind, label, path, preview };
    if (children.length) {
      result.children = [];
      for (const child of children.slice(0, 100)) {
        if (budget <= 0) break;
        result.children.push(visit(child.node, child.label, child.path));
      }
      result.omitted = children.length - result.children.length;
    }
    return result;
  };
  return visit(node, '$', '$');
}
export function jsonToYaml(node: JsonNode, sort = false): string {
  const parts: string[] = []; let size = 0;
  const append = (value: string) => { size += value.length; if (size > OUTPUT_LIMIT) throw new Error('YAML output exceeds 32 MiB.'); parts.push(value); };
  const render = (current: JsonNode, depth: number): void => {
    if (current.kind !== 'object' && current.kind !== 'array') { append(current.raw!); return; }
    if (current.members && new Set(current.members.map(member => member.key)).size !== current.members.length) throw new Error('YAML mappings require unique keys. Remove duplicate JSON properties before exporting to YAML.');
    const children = current.kind === 'object' ? ordered(current, sort).map(m => ({ prefix: m.keyRaw + ':', node: m.node })) : (current.items ?? []).map(node => ({ prefix: '-', node }));
    if (!children.length) { append(current.kind === 'object' ? '{}' : '[]'); return; }
    children.forEach((child, index) => {
      if (index) append('\n');
      const nested = (child.node.members?.length ?? child.node.items?.length ?? 0) > 0;
      append('  '.repeat(depth) + child.prefix + (nested ? '\n' : ' '));
      render(child.node, nested ? depth + 1 : 0);
    });
  };
  render(node, 0); append('\n'); return parts.join('');
}
export function jsonToCsv(node: JsonNode, protectFormulas = true): string {
  if (node.kind !== 'array' || !node.items?.every(item => item.kind === 'object')) throw new Error('CSV export requires a JSON array of objects. Nested values become compact JSON cells.');
  const keys: string[] = []; const known = new Set<string>();
  for (const item of node.items) {
    const rowKeys = new Set<string>();
    for (const member of item.members!) {
      if (rowKeys.has(member.key)) throw new Error('CSV export cannot preserve duplicate keys. Remove duplicate properties first.');
      rowKeys.add(member.key);
      if (!known.has(member.key)) { known.add(member.key); keys.push(member.key); }
    }
  }
  if (keys.length * node.items.length > 1_000_000) throw new Error('CSV export is limited to one million cells.');
  const cell = (value: string, text = true) => '"' + ((protectFormulas && text && /^[=+\-@\t\r\n]/.test(value)) ? "'" + value : value).replace(/"/g, '""') + '"';
  const output = [keys.map(key => cell(key)).join(','), ...node.items.map(item => {
    const row = new Map(item.members!.map(member => [member.key, member.node]));
    return keys.map(key => { const value = row.get(key); return !value ? '""' : cell(value.kind === 'string' ? JSON.parse(value.raw!) : formatJson(value, ''), value.kind === 'string'); }).join(',');
  })].join('\r\n');
  if (output.length > OUTPUT_LIMIT) throw new Error('CSV output exceeds 32 MiB.');
  return output;
}
export function jsonToXml(node: JsonNode): string {
  const parts: string[] = []; let size = 0;
  const append = (value: string) => { size += value.length; if (size > OUTPUT_LIMIT) throw new Error('XML output exceeds 32 MiB.'); parts.push(value); };
  const escape = (value: string) => {
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) throw new Error('A JSON string contains characters that XML 1.0 cannot represent.');
    return value.replace(/[<>&"'\r\n\t]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;', '\r': '&#13;', '\n': '&#10;', '\t': '&#9;' })[c]!);
  };
  const render = (current: JsonNode, depth: number): void => {
    const pad = '  '.repeat(depth);
    if (current.kind === 'object') {
      append(`${pad}<object>`);
      current.members!.forEach(member => { append(`\n${pad}  <property name="${escape(member.key)}">\n`); render(member.node, depth + 2); append(`\n${pad}  </property>`); });
      append(`\n${pad}</object>`); return;
    }
    if (current.kind === 'array') {
      append(`${pad}<array>`);
      current.items!.forEach(item => { append('\n'); render(item, depth + 1); });
      append(`\n${pad}</array>`); return;
    }
    const text: string = current.kind === 'string' ? JSON.parse(current.raw!) : current.raw!;
    append(`${pad}<${current.kind}>${current.kind === 'null' ? '' : escape(text)}</${current.kind}>`);
  };
  append('<?xml version="1.0" encoding="UTF-8"?>\n'); render(node, 0); return parts.join('');
}
