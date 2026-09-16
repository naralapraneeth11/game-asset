import { evaluateRegex, type RegexJob } from "@/lib/dev/regex";

self.onmessage = (event: MessageEvent<RegexJob>) => {
  try { self.postMessage({ result: evaluateRegex(event.data) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : "This pattern could not be evaluated." }); }
};
