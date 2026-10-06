import { FFmpeg, type FFFSType } from "@ffmpeg/ffmpeg";
import { AUDIO_LIMITS, type AudioInfo, type AudioResult, type AudioSettings, type WorkerReply, type WorkerRequest } from "../types";

const scope = self as unknown as { location: Location; crossOriginIsolated: boolean; postMessage: (message: WorkerReply) => void; onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null };
const assets = "/tools/video-editor/vendor";
let engine: FFmpeg | null = null;
let busy = false;
let generation = 0;
let encoderAvailable = false;
let logs: string[] = [];
const absolute = (path: string) => new URL(path, scope.location.origin).href;
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

function checkGeneration(value: number) { if (value !== generation) throw new Error("Cancelled"); }

async function load(id: string, version: number): Promise<FFmpeg> {
  if (engine?.loaded) return engine;
  scope.postMessage({ type: "progress", id, phase: "Loading local audio engine · files stay on this device", progress: null });
  for (const multi of scope.crossOriginIsolated && typeof SharedArrayBuffer !== "undefined" ? [true, false] : [false]) {
    checkGeneration(version);
    const current = new FFmpeg();
    engine = current;
    current.on("log", ({ message: line }) => { logs.push(line); if (logs.length > 30) logs.shift(); });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const directory = multi ? "multi" : "single";
      await Promise.race([
        current.load({ classWorkerURL: absolute(`${assets}/ffmpeg/worker.js`), coreURL: absolute(`${assets}/${directory}/ffmpeg-core.js`), wasmURL: absolute(`${assets}/${directory}/ffmpeg-core.wasm`), ...(multi ? { workerURL: absolute(`${assets}/multi/ffmpeg-core.worker.js`) } : {}) }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => { current.terminate(); reject(new Error("Audio engine loading timed out.")); }, 90_000); }),
      ]);
      checkGeneration(version);
      const available: string[] = [];
      const capture = ({ message: line }: { message: string }) => available.push(line);
      current.on("log", capture);
      try { await current.exec(["-hide_banner", "-encoders"], 10_000); }
      finally { current.off("log", capture); }
      encoderAvailable = available.some((line) => /\blibvorbis\b/.test(line));
      if (!encoderAvailable) throw new Error("The installed FFmpeg assets do not include libvorbis, the required OGG encoder. Prepare the pinned video-engine assets again; changing the file extension cannot convert audio.");
      return current;
    } catch (error) {
      current.terminate();
      engine = null;
      checkGeneration(version);
      if (!multi) throw new Error(`The local audio engine is unavailable. Confirm the video-engine assets were prepared. ${message(error)}`);
    } finally { clearTimeout(timer); }
  }
  throw new Error("The audio engine is unavailable.");
}

interface ProbeData {
  format?: { duration?: string };
  streams?: { codec_type?: string; codec_name?: string; duration?: string; channels?: number; sample_rate?: string }[];
}

async function inspect(current: FFmpeg, path: string): Promise<AudioInfo> {
  await current.deleteFile("/audio-probe.json").catch(() => undefined);
  // This pinned core can report -1 on a successful ffprobe; validate its report.
  await current.ffprobe(["-v", "error", "-protocol_whitelist", "file,pipe", "-show_format", "-show_streams", "-of", "json", path, "-o", "/audio-probe.json"], 30_000);
  let data: ProbeData;
  try {
    const report = await current.readFile("/audio-probe.json", "utf8");
    data = JSON.parse(typeof report === "string" ? report : new TextDecoder().decode(report)) as ProbeData;
  } catch { throw new Error("This file could not be read. Choose an unencrypted WAV, MP3, OGG, AAC, M4A or FLAC file."); }
  const audio = data.streams?.filter((stream) => stream.codec_type === "audio") ?? [];
  const primary = audio[0];
  if (!primary) throw new Error("This file has no readable audio track.");
  const streamDuration = Number(primary.duration);
  const duration = Number.isFinite(streamDuration) && streamDuration > 0 ? streamDuration : Number(data.format?.duration);
  const sampleRate = Number(primary.sample_rate);
  const channels = Number(primary.channels);
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(sampleRate) || sampleRate <= 0 || !Number.isInteger(channels) || channels < 1) throw new Error("Audio duration, sample rate or channel information is missing. Re-export the source file and try again.");
  return { duration, sampleRate, channels, codec: primary.codec_name ?? "unknown", tracks: audio.length };
}

function validate(settings: AudioSettings, info: AudioInfo) {
  if (![settings.quality, settings.start, settings.end, settings.volume].every(Number.isFinite)) throw new Error("Enter valid numeric audio settings.");
  if (!Number.isInteger(settings.quality) || settings.quality < 0 || settings.quality > 10) throw new Error("Vorbis quality must be between 0 and 10.");
  if (![0, 44100, 48000].includes(settings.sampleRate) || ![0, 1, 2].includes(settings.channels)) throw new Error("Choose a supported sample rate and channel setting.");
  if (settings.volume < 0 || settings.volume > 2) throw new Error("Volume must be between 0 and 200%.");
  const start = settings.start;
  const end = settings.end === 0 ? info.duration : settings.end;
  if (start < 0 || start >= info.duration || end > info.duration + 0.02 || end - start < 0.02) throw new Error(`Choose a trim range within this file's ${info.duration.toFixed(2)} seconds, with the end after the start.`);
  const channels = settings.channels || info.channels;
  const sampleRate = settings.sampleRate || info.sampleRate;
  if (channels > 8) throw new Error("Vorbis export supports up to eight channels. Choose mono or stereo for this source.");
  if (sampleRate < 8000 || sampleRate > 192000) throw new Error("The source sample rate is outside this encoder's supported range. Choose 44.1 or 48 kHz.");
  return { start, end, duration: end - start, channels, sampleRate };
}

async function convert(id: string, file: File, settings: AudioSettings, version: number): Promise<AudioResult> {
  if (!file.size) throw new Error("The selected file is empty.");
  if (file.size > AUDIO_LIMITS.input) throw new Error("Choose a source file under 256 MiB. Large audio is decoded and encoded locally within browser memory limits.");
  const current = await load(id, version);
  if (!encoderAvailable) throw new Error("The required libvorbis encoder is not available.");
  let mounted = false;
  let expectedDuration = 0;
  const onProgress = ({ time }: { time: number }) => scope.postMessage({ type: "progress", id, phase: "Encoding OGG / Vorbis", progress: expectedDuration ? Math.min(0.97, Math.max(0, time / 1_000_000 / expectedDuration)) : null });
  current.on("progress", onProgress);
  try {
    await current.createDir("/audio-input").catch(() => undefined);
    mounted = await current.mount("WORKERFS" as FFFSType, { blobs: [{ name: "source", data: file }] }, "/audio-input");
    if (!mounted) throw new Error("The audio engine cannot read local files. Re-prepare the video-engine assets.");
    scope.postMessage({ type: "progress", id, phase: "Reading audio information", progress: null });
    const info = await inspect(current, "/audio-input/source");
    checkGeneration(version);
    const selected = validate(settings, info);
    expectedDuration = selected.duration;
    logs = [];
    const filters = ["asetpts=PTS-STARTPTS"];
    if (settings.volume !== 1) filters.push(`volume=${settings.volume}`);
    if (settings.normalize) filters.push("loudnorm=I=-16:TP=-1.5:LRA=11");
    const args = ["-hide_banner", "-protocol_whitelist", "file,pipe", "-filter_threads", "2", "-ss", String(selected.start), "-t", String(selected.duration), "-i", "/audio-input/source", "-map", "0:a:0", "-vn", "-sn", "-dn", "-af", filters.join(","), "-c:a", "libvorbis", "-q:a", String(settings.quality), "-ar", String(selected.sampleRate), "-ac", String(selected.channels), "-t", String(selected.duration), "-map_metadata", "-1", "-map_chapters", "-1", "-threads", "2", "-fs", String(AUDIO_LIMITS.output), "-y", "/converted.ogg"];
    scope.postMessage({ type: "progress", id, phase: "Encoding OGG / Vorbis", progress: 0 });
    const code = await current.exec(args, 30 * 60_000);
    checkGeneration(version);
    if (code !== 0) throw new Error(`Audio encoding stopped. ${logs.slice(-4).join(" ").slice(-600) || "Try a shorter source file."}`);
    const bytes = await current.readFile("/converted.ogg");
    if (typeof bytes === "string" || !bytes.byteLength) throw new Error("The audio encoder returned no output.");
    if (bytes.byteLength >= AUDIO_LIMITS.output * 0.98) throw new Error("The output reached the 128 MiB memory limit. Shorten the trim or lower quality, then convert again.");
    scope.postMessage({ type: "progress", id, phase: "Finalizing OGG", progress: 0.98 });
    const output = await inspect(current, "/converted.ogg");
    if (output.codec !== "vorbis" || Math.abs(output.duration - selected.duration) > Math.max(0.25, selected.duration * 0.002)) throw new Error("The result was incomplete or had an unexpected audio format. Try a shorter source file.");
    const warnings = [
      ...(info.tracks > 1 ? ["Only the first audio track was exported."] : []),
      ...(info.channels > 2 && settings.channels === 0 ? ["Surround channels preserved. Confirm channel mapping in your game engine before shipping."] : []),
      ...(settings.normalize ? ["Loudness normalization is applied dynamically toward −16 LUFS; short clips may not reach that target."] : []),
      ...(settings.volume > 1 && !settings.normalize ? ["Boosted gain may clip peaks. Listen to the result before use."] : []),
    ];
    return { blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "audio/ogg; codecs=vorbis" }), name: `${file.name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 170) || "audio"}.ogg`, info: output, warnings };
  } finally {
    current.off("progress", onProgress);
    if (current.loaded) {
      if (mounted) await current.unmount("/audio-input").catch(() => undefined);
      for (const path of ["/converted.ogg", "/audio-probe.json"]) await current.deleteFile(path).catch(() => undefined);
    }
  }
}

scope.onmessage = (event) => {
  const request = event.data;
  if (request.type === "cancel") {
    generation++;
    engine?.terminate(); engine = null; encoderAvailable = false;
    scope.postMessage({ type: "cancelled" });
    return;
  }
  if (busy) { scope.postMessage({ type: "error", id: request.id, message: "An audio job is already running." }); return; }
  busy = true;
  const version = generation;
  void convert(request.id, request.file, request.settings, version).then((result) => {
    if (version === generation) scope.postMessage({ type: "result", id: request.id, result });
  }).catch((error: unknown) => {
    if (version === generation) scope.postMessage({ type: "error", id: request.id, message: message(error) });
  }).finally(() => { busy = false; });
};
