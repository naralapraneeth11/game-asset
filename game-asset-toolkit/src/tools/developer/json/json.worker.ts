import { parseLosslessJson, formatJson, jsonTree, jsonToYaml, jsonToCsv, jsonToXml, JsonSyntaxError } from '../../../lib/dev/json';

export interface JsonRequest { id: number; source: string; indent: string; sort: boolean; format: 'json' | 'yaml' | 'csv' | 'xml'; protectFormulas: boolean }
self.onmessage = (event: MessageEvent<JsonRequest>) => {
  const request = event.data;
  try {
    const parsed = parseLosslessJson(request.source);
    let output = ''; let conversionError = '';
    try {
      output = request.format === 'yaml' ? jsonToYaml(parsed.node, request.sort) : request.format === 'csv' ? jsonToCsv(parsed.node, request.protectFormulas) : request.format === 'xml' ? jsonToXml(parsed.node) : formatJson(parsed.node, request.indent, request.sort);
    } catch (error) { conversionError = error instanceof Error ? error.message : 'Conversion failed.'; }
    self.postMessage({ id: request.id, output, conversionError, tree: jsonTree(parsed.node), nodeCount: parsed.nodeCount, duplicateKeys: parsed.duplicateKeys, unsafeIntegers: parsed.unsafeIntegers });
  } catch (error) {
    self.postMessage({ id: request.id, error: error instanceof Error ? error.message : 'Unable to parse JSON.', issue: error instanceof JsonSyntaxError ? error.issue : undefined });
  }
};
