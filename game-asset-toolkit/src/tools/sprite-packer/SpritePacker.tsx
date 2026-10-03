"use client";

import { useState } from "react";
import { zipSync, strToU8 } from "fflate";
import { AlertCircle, Download, Grid3X3, Loader2, Trash2 } from "lucide-react";
import { DropZone } from "@/components/tool/DropZone";
import { AdvancedPanel } from "@/components/tool/AdvancedPanel";
import { buttonClass } from "@/components/tool/buttons";
import Toggle from "@/components/ui/Toggle";
import { formatBytes, plural } from "@/lib/format";
import { useObjectUrl } from "@/lib/useObjectUrl";
import { cn } from "@/lib/utils";
import { DEFAULT_CONFIG, createSpritePacker, type Heuristic, type OutputFormat, type PackResult, type PackerConfig, type ProgressInfo } from "./engine";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp";
const IMAGE = /\.(png|jpe?g|webp|gif|bmp)$/i;
const ATLAS_SIZES = [512, 1024, 2048, 4096] as const;
const HEURISTICS: Record<Heuristic, string> = { BSSF: "Best short side fit (default)", BAF: "Best area fit", CP: "Contact point" };

type Options = Pick<PackerConfig, "maxWidth" | "padding" | "extrusion" | "rotation" | "powerOfTwo" | "heuristic" | "alphaThreshold" | "format">;
const defaults: Options = {
  maxWidth: DEFAULT_CONFIG.maxWidth,
  padding: DEFAULT_CONFIG.padding,
  extrusion: DEFAULT_CONFIG.extrusion,
  rotation: DEFAULT_CONFIG.rotation,
  powerOfTwo: DEFAULT_CONFIG.powerOfTwo,
  heuristic: DEFAULT_CONFIG.heuristic,
  alphaThreshold: DEFAULT_CONFIG.alphaThreshold,
  format: DEFAULT_CONFIG.format,
};

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const jsonName = (imageName: string) => imageName.replace(/\.[^.]+$/, ".json");

export default function SpritePacker() {
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<Options>(defaults);
  const [packing, setPacking] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [result, setResult] = useState<PackResult | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [snippet, setSnippet] = useState<"phaser" | "pixi">("phaser");

  const atlas = result?.atlases[page];
  const previewUrl = useObjectUrl(atlas?.image);

  const set = <K extends keyof Options>(key: K, value: Options[K]) => {
    setOptions((old) => ({ ...old, [key]: value, ...(key === "padding" ? { extrusion: Math.min(old.extrusion, value as number) } : {}) }));
  };
  const reset = () => { setResult(null); setPage(0); setError(null); };

  const accept = (list: File[]) => {
    const images = list.filter((file) => file.type.startsWith("image/") || IMAGE.test(file.name));
    if (!images.length) { setError("No images found. Drop PNG, JPEG, WebP, GIF or BMP sprites."); return; }
    const seen = new Set(files.map((file) => `${file.name}:${file.size}`));
    setFiles([...files, ...images.filter((file) => !seen.has(`${file.name}:${file.size}`))]);
    reset();
  };

  const pack = async () => {
    if (!files.length || packing) return;
    setPacking(true); reset(); setProgress(null);
    const packer = createSpritePacker({ ...options, maxHeight: options.maxWidth, extrusion: Math.min(options.extrusion, options.padding) });
    packer.onProgress(setProgress);
    try {
      setResult(await packer.pack(files));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Packing failed.";
      setError(/too large for atlas/.test(message) ? `${message}. Raise the maximum atlas size in Advanced, or scale the sprite down.` : message);
    } finally {
      packer.destroy(); setPacking(false); setProgress(null);
    }
  };

  const downloadZip = async () => {
    if (!result) return;
    const entries: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
    for (const sheet of result.atlases) {
      entries[sheet.imageName] = [new Uint8Array(await sheet.image.arrayBuffer()), { level: 0 }];
      entries[jsonName(sheet.imageName)] = [strToU8(JSON.stringify(sheet.metadata, null, 2)), { level: 6 }];
    }
    download(new Blob([zipSync(entries) as Uint8Array<ArrayBuffer>], { type: "application/zip" }), "sprite-atlas.zip");
  };

  const fill = result ? result.atlases.reduce((sum, sheet) => sum + sheet.efficiency, 0) / result.atlases.length : 0;
  const summary = [`${options.maxWidth} px max`, `${options.padding} px padding`, options.extrusion && options.padding ? `${Math.min(options.extrusion, options.padding)} px extrude` : "", options.rotation ? "rotation" : "", options.powerOfTwo ? "power of two" : "", options.format.toUpperCase()].filter(Boolean).join(" · ");
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const first = result?.atlases[0];
  const frame = first?.frames[0]?.name ?? "frame.png";
  const code = !result || !first ? "" : snippet === "phaser"
    ? `// preload()\n${result.atlases.map((sheet, index) => `this.load.atlas("sprites${result.atlases.length > 1 ? index + 1 : ""}", "${sheet.imageName}", "${jsonName(sheet.imageName)}");`).join("\n")}\n\n// create()\nthis.add.sprite(400, 300, "sprites${result.atlases.length > 1 ? 1 : ""}", "${frame}");`
    : `import { Assets, Sprite } from "pixi.js";\n\n${result.atlases.map((sheet) => `await Assets.load("${jsonName(sheet.imageName)}");`).join("\n")}\nconst sprite = Sprite.from("${frame}");`;

  return (
    <div className="space-y-5">
      {!files.length ? (
        <DropZone
          accept={ACCEPT}
          onFiles={accept}
          title="Drop your sprites"
          hint="PNG, JPEG, WebP, GIF or BMP. Transparent edges are trimmed automatically."
          icon={<Grid3X3 className="h-6 w-6" strokeWidth={1.6} aria-hidden />}
          buttonLabel="Choose sprites"
        />
      ) : (
        <section aria-label="Your sprites" className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-medium">{plural(files.length, "sprite")}</h2>
              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{formatBytes(total)} · {files.slice(0, 4).map((file) => file.name).join(", ")}{files.length > 4 ? ` and ${files.length - 4} more` : ""}</p>
            </div>
            <button type="button" className={buttonClass("ghost", "sm")} disabled={packing} onClick={() => { setFiles([]); reset(); }}><Trash2 className="h-3.5 w-3.5" aria-hidden />Clear</button>
          </div>
          <DropZone accept={ACCEPT} compact disabled={packing} onFiles={accept} title="Add sprites" hint="Drop more sprites here" className="rounded-none border-0 border-t border-solid" />
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={buttonClass("primary", "lg", "min-w-[200px]")} disabled={!files.length || packing} onClick={pack}>
          {packing ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Packing…</> : files.length ? `Pack ${plural(files.length, "sprite")}` : "Pack sprites"}
        </button>
        {packing && progress && (
          <span className="text-[13px] text-muted-foreground" role="status">
            {progress.phase === "loading" ? "Reading" : `Packing page ${progress.page ?? 1}`} · {Math.round(progress.progress * 100)}%
          </span>
        )}
      </div>

      {error && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_45%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_6%,var(--card))] px-4 py-3.5 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      {result && atlas && (
        <section aria-label="Atlas" className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border px-5 py-4">
            <dl className="flex min-w-0 flex-1 flex-wrap gap-x-6 gap-y-1 text-sm">
              <div><dt className="text-xs text-muted-foreground">Pages</dt><dd className="text-lg font-semibold tabular-nums">{result.totalPages}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Fill</dt><dd className="text-lg font-semibold tabular-nums">{fill.toFixed(0)}%</dd></div>
              <div><dt className="text-xs text-muted-foreground">Sprites</dt><dd className="text-lg font-semibold tabular-nums">{result.totalSprites}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Size</dt><dd className="text-lg font-semibold tabular-nums">{atlas.metadata.meta.size.w} × {atlas.metadata.meta.size.h}</dd></div>
            </dl>
            <button type="button" className={buttonClass("primary", "lg")} onClick={() => void downloadZip()}>
              <Download className="h-4 w-4" aria-hidden />Download PNG + JSON
            </button>
          </div>

          {result.atlases.length > 1 && (
            <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3" role="group" aria-label="Atlas page">
              {result.atlases.map((sheet, index) => (
                <button key={sheet.imageName} type="button" aria-pressed={index === page} onClick={() => setPage(index)} className={cn("h-8 rounded-full border px-3 text-[13px]", index === page ? "border-accent bg-accent text-accent-foreground" : "border-border hover:bg-hover")}>
                  {sheet.imageName}
                </button>
              ))}
            </div>
          )}

          <div className="bg-[conic-gradient(var(--muted)_25%,transparent_0_50%,var(--muted)_0_75%,transparent_0)] bg-[length:16px_16px] p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {previewUrl && <img src={previewUrl} alt={`Packed atlas ${atlas.imageName}`} className="mx-auto max-h-[420px] w-auto max-w-full object-contain [image-rendering:pixelated]" />}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3 text-[13px] text-muted-foreground">
            <span className="mr-auto">Packed in {result.duration} s on your device. The ZIP holds one PNG and one JSON per page.</span>
            {result.atlases.map((sheet) => (
              <span key={sheet.imageName} className="flex gap-1">
                <button type="button" className={buttonClass("ghost", "sm")} onClick={() => download(sheet.image, sheet.imageName)}>{sheet.imageName}</button>
                <button type="button" className={buttonClass("ghost", "sm")} onClick={() => download(new Blob([JSON.stringify(sheet.metadata, null, 2)], { type: "application/json" }), jsonName(sheet.imageName))}>{jsonName(sheet.imageName)}</button>
              </span>
            ))}
          </div>

          <div className="border-t border-border px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">Load it in your game</h3>
              <div className="flex gap-1 rounded-lg bg-muted p-0.5" role="group" aria-label="Engine">
                {(["phaser", "pixi"] as const).map((engine) => (
                  <button key={engine} type="button" aria-pressed={snippet === engine} onClick={() => setSnippet(engine)} className={cn("h-7 rounded-md px-3 text-xs font-medium", snippet === engine ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    {engine === "phaser" ? "Phaser" : "PixiJS"}
                  </button>
                ))}
              </div>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed"><code>{code}</code></pre>
          </div>
        </section>
      )}

      <AdvancedPanel summary={summary}>
        <fieldset disabled={packing} className="grid gap-6 sm:grid-cols-2">
          <legend className="sr-only">Packing options</legend>
          <div>
            <p className="mb-2 text-sm font-medium" id="sp-size">Maximum atlas size</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="sp-size">
              {ATLAS_SIZES.map((size) => (
                <button key={size} type="button" role="radio" aria-checked={options.maxWidth === size} onClick={() => set("maxWidth", size)} className={cn("h-9 rounded-full border px-3.5 text-[13px] tabular-nums", options.maxWidth === size ? "border-accent bg-accent font-medium text-accent-foreground" : "border-border hover:bg-hover")}>
                  {size}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Sprites that do not fit start a new page.</p>
          </div>
          <label className="block">
            <span className="text-sm font-medium">Packing heuristic</span>
            <select className="mt-2 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" value={options.heuristic} onChange={(event) => set("heuristic", event.target.value as Heuristic)}>
              {(Object.keys(HEURISTICS) as Heuristic[]).map((key) => <option key={key} value={key}>{HEURISTICS[key]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="flex justify-between text-sm font-medium">Padding <output className="font-normal tabular-nums text-muted-foreground">{options.padding} px</output></span>
            <input className="mt-2 w-full" type="range" min={0} max={8} value={options.padding} onChange={(event) => set("padding", Number(event.target.value))} />
            <span className="text-xs text-muted-foreground">Empty pixels between sprites, so filtering does not bleed.</span>
          </label>
          <label className="block">
            <span className="flex justify-between text-sm font-medium">Extrusion <output className="font-normal tabular-nums text-muted-foreground">{Math.min(options.extrusion, options.padding)} px</output></span>
            <input className="mt-2 w-full" type="range" min={0} max={Math.max(options.padding, 1)} value={Math.min(options.extrusion, options.padding)} disabled={options.padding === 0} onChange={(event) => set("extrusion", Number(event.target.value))} />
            <span className="text-xs text-muted-foreground">Repeats edge pixels into the padding to hide seams between tiles.</span>
          </label>
          <label className="block">
            <span className="flex justify-between text-sm font-medium">Alpha trim threshold <output className="font-normal tabular-nums text-muted-foreground">{options.alphaThreshold}</output></span>
            <input className="mt-2 w-full" type="range" min={0} max={254} value={options.alphaThreshold} onChange={(event) => set("alphaThreshold", Number(event.target.value))} />
            <span className="text-xs text-muted-foreground">Pixels at or below this alpha count as empty when trimming. 0 trims only fully transparent pixels.</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Image format</span>
            <select className="mt-2 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" value={options.format} onChange={(event) => set("format", event.target.value as OutputFormat)}>
              <option value="png">PNG · lossless</option>
              <option value="webp">WebP · smaller download</option>
            </select>
          </label>
          <div className="flex items-start justify-between gap-4">
            <span><span className="block text-sm font-medium" id="sp-rotation">Allow 90° rotation</span><span className="text-xs text-muted-foreground">Packs tighter; the JSON marks rotated frames.</span></span>
            <Toggle checked={options.rotation} onChange={(value) => set("rotation", value)} aria-labelledby="sp-rotation" />
          </div>
          <div className="flex items-start justify-between gap-4">
            <span><span className="block text-sm font-medium" id="sp-pot">Power-of-two size</span><span className="text-xs text-muted-foreground">Only for old GPUs or formats such as PVRTC.</span></span>
            <Toggle checked={options.powerOfTwo} onChange={(value) => set("powerOfTwo", value)} aria-labelledby="sp-pot" />
          </div>
          <div className="sm:col-span-2">
            <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setOptions(defaults)}>Reset options</button>
          </div>
        </fieldset>
      </AdvancedPanel>
    </div>
  );
}
