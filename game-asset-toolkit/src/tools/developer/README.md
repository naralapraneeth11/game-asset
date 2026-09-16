# Developer Tools

Eleven native Next.js routes share the existing Game Asset Toolkit theme and registry.
All input processing is browser-side. There are no API routes, server actions,
external processing calls, analytics or user-content storage added by this suite.

## Structure

```
src/lib/tools.ts                    Registry, discovery, categories and developer groups
src/lib/dev/                       Pure parsers, transformations and cryptographic helpers
src/components/dev/                Shared shell, editors, output, actions and controls
src/tools/developer/<tool>/         Each tool's client and optional worker
src/app/tools/dev/<route>/page.tsx  Thin server route with static metadata
```

The common controls reuse the existing orange Toggle. The sidebar keeps the existing
SegmentedControl for appearance. CSS uses the application's semantic theme variables.
Panels adapt to available viewport width, with bounded code previews and scrollable output.
Tools provide labeled controls and keyboard focus; Ctrl/Cmd+Enter processes where relevant,
and Escape clears the focused tool. Tab always remains available for navigation.

## Routes and behavior

| Route under `/tools/dev/` | Features |
| --- | --- |
| `json-formatter` | 2 spaces / 4 spaces / tab / minify, stable key sorting, lossless numeric tokens, lazy tree, JSONPath copy, drag/drop, YAML/CSV/XML |
| `json-validator` | Same strict worker parser, line/column diagnostics, tree and validated JSON |
| `jwt-decoder` | Header/payload, registered claims, device-clock expiry, HS256/384/512, RS256/384/512, PS256 and ES256 signature verification |
| `base64` | UTF-8, standard/URL-safe alphabet, optional padding, data URIs, exact decoded bytes, bounded raster preview |
| `hash-generator` | MD5, SHA-1, SHA-256, SHA-384, SHA-512, text/file, comparison and cancellation |
| `regex-tester` | JavaScript g/i/m/s/u/y, named/numbered captures, replacement tokens, highlights, pattern library, worker timeout |
| `url-encode` | Component/full URI and form encoding, decoding and malformed-input errors |
| `uuid-generator` | Cryptographically random UUID v4, up to 1,000 identifiers, text/JSON/CSV output |
| `password-generator` | Secure unbiased random sampling, selected-group requirements, length/bulk controls and explicit reveal |
| `timestamp` | Explicit seconds/milliseconds, UTC/local date parsing, current time, IANA display timezone |
| `color-converter` | HEX/RGB/HSL/OKLCH, alpha, picker, copy each representation and sRGB gamut mapping |

## Engineering decisions

JSON processing uses a bounded lossless parser in a worker. Standard `JSON.parse`
would silently round large integers when re-serializing. This implementation preserves
numeric lexemes and duplicate object keys in JSON output; duplicate keys are reported.
Conversions that cannot preserve the document's shape fail explicitly. CSV uses a
spreadsheet-formula protection option. XML uses a documented typed element structure.

JWT decoding is not authentication. The UI distinguishes signature verification from
time-claim checks, and never retrieves keys from token-provided URLs. An expected
algorithm must be chosen independently. PEM public keys and public JWKs are supported
for asymmetric algorithms; HMAC accepts a literal UTF-8 secret. Invalid signatures,
unsupported critical extensions, mismatched algorithms and unsigned tokens are handled
explicitly. Issuer, audience and application policy remain the caller's responsibility.

SHA uses Web Crypto. MD5 uses the included incremental RFC 1321 implementation because
Web Crypto does not provide MD5. MD5 and SHA-1 are labeled for legacy checksums rather
than security-sensitive use. SHA file hashing reads a bounded buffer; Web Crypto digest
does not expose streaming. Workers prevent these operations from blocking the UI.

Regex runs only in disposable workers, with hard termination. No user JavaScript is
evaluated. Replacements implement JavaScript substitution tokens with bounded output.
Capture results also have a storage budget to avoid overlapping-lookahead memory growth.

UUID and password generators use Web Crypto randomness, never Math.random. Password
sampling rejects biased byte values and whole candidates that do not meet requirements.
Entropy describes the selected character space, not a guess at real-world cracking time.

Rust/Wasm adds no demonstrated benefit for these bounded text utilities and was optional
in the specification. This implementation adds no dependencies or extra toolchains.
The existing image codec pipeline is retained.

## Limits

| Tool | Guardrail |
| --- | --- |
| JSON | 10 MiB input, 250,000 values, depth 128, 15-second worker timeout; bounded formatted/export output |
| JSON tree | 100 children per node, 3,000 preview values; complete source remains in formatted output |
| JWT | 256 KiB token, 64 KiB key; RSA keys at least 2048 bits |
| Base64 | 2 Mi text characters; 16 MiB binary input/output; file loading for larger encoded text; 64 Ki-character visible preview |
| Hash | 2 Mi text characters, 64 MiB file |
| Regex | 1,000,000 sample characters; 10,000 pattern characters; 2,000 matches; bounded captures/output; 1.5 seconds |
| URL | 1,000,000 characters |
| UUID | 1,000 per batch |
| Password | 4–128 characters, 1–100 per batch |
| Color | 200-character color expression |

Large results retain complete copy/download data where indicated; preview limits do
not silently truncate downloaded files. A regex run exceeding result limits does not
offer an incomplete replacement as a complete answer.

## Privacy and offline scope

Inputs remain in component/worker memory and are discarded on clear or navigation.
Files use browser File/Blob APIs; raster previews use local object URLs and are revoked.
Copy/download are user-triggered actions. Downloaded passwords are plain text.
The existing app stores only its appearance preference; these tools add no content history.
Browser extensions and clipboard history are outside the application's control.

Calculations can operate without a connection once the page and relevant worker assets
have loaded. Automatic offline revisits, pre-caching all tools and an installable PWA
are not included in this release; the specification's later PWA work remains separate.
The existing Image Compressor offline feature is not modified.

## SEO

Every tool has a unique title, description and keywords. Canonical URLs use
`NEXT_PUBLIC_SITE_URL` or Vercel's `VERCEL_PROJECT_PRODUCTION_URL`. Set the former for
a custom domain. If neither exists, canonical URLs are omitted instead of publishing
an invented domain or localhost URL. The developer index and related links provide
internal discovery. The home page continues to read the central registry automatically.

## Adding another tool

1. Add pure logic to `src/lib/dev/` and a focused client folder under this directory.
2. Use `ToolShell`, shared controls and browser helpers; use a worker for expensive logic.
3. Register the tool with a stable ID, exact route, icon, developer group and keywords.
4. Add a thin route importing the client and `developerMetadata(id)`.
5. Define memory/output bounds, errors, cancellation and download semantics before adding UI.

Local history, saved presets, suite split views, CLI/CI counterparts, YAML/XML input
helpers and Pro features remain the future expansion items from the specification.

## References and delivery status

- Web Crypto algorithms and buffering: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
- Browser workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
- JWT claims and terminology: https://www.rfc-editor.org/rfc/rfc7519
- MD5 algorithm: https://www.rfc-editor.org/rfc/rfc1321

No builds, lint/type-checks, automated tests or browser validation were run, following
the user's final delivery instruction. Review these implementation files and run your
release checks before publishing. No GitHub commits or deployments were made.
