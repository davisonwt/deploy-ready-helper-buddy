/**
 * transcodeToMp4 — converts a browser-recorded WebM Blob into a universally
 * playable MP4 (H.264 + AAC) using ffmpeg.wasm.
 *
 * Background
 * ----------
 * MediaRecorder on Chromium only reliably outputs WebM (VP8/VP9/Opus). WebM
 * cannot be opened by Windows' default media player, iPhone Photos, most
 * SmartTVs, or shared into iMessage. Transcoding to MP4 (H.264 + AAC) makes
 * the file play "on any phone or PC."
 *
 * The ffmpeg-core wasm bundle is ~25 MB and is loaded lazily on first use.
 */
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const ff = new FFmpeg();
    if (onLog) ff.on("log", ({ message }) => onLog(message));
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ff;
    return ff;
  })();

  return loadingPromise;
}

export interface TranscodeOptions {
  /** Optional progress callback (0–1). */
  onProgress?: (ratio: number) => void;
  /** Optional log callback (raw ffmpeg log lines). */
  onLog?: (msg: string) => void;
}

/**
 * Convert a WebM (or any browser-recorded) Blob into MP4 (H.264 + AAC).
 * Returns a new Blob with `type: video/mp4`.
 */
export async function transcodeToMp4(
  source: Blob,
  opts: TranscodeOptions = {},
): Promise<Blob> {
  const ff = await getFFmpeg(opts.onLog);

  const inputName = "input.webm";
  const outputName = "output.mp4";

  const handleProgress = ({ progress }: { progress: number }) => {
    if (opts.onProgress) opts.onProgress(Math.max(0, Math.min(1, progress)));
  };
  ff.on("progress", handleProgress);

  try {
    await ff.writeFile(inputName, await fetchFile(source));

    // -movflags +faststart  → moov atom up front so phones can stream / open instantly
    // -preset ultrafast      → fastest CPU encode (we're in the browser, so prioritise speed)
    // -crf 23                → good visual quality, reasonable file size
    // -pix_fmt yuv420p       → required for QuickTime / iOS / WhatsApp compatibility
    // -c:a aac -b:a 128k     → AAC audio (the ONLY audio codec all phones agree on)
    await ff.exec([
      "-i", inputName,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-c:a", "aac",
      "-b:a", "128k",
      outputName,
    ]);

    const data = await ff.readFile(outputName);
    // data may be Uint8Array or string — copy into a fresh ArrayBuffer-backed
    // Uint8Array so the resulting Blob is portable across browsers (avoids
    // SharedArrayBuffer typing issues on some TS lib targets).
    const raw = typeof data === "string" ? new TextEncoder().encode(data) : (data as Uint8Array);
    const buf = new ArrayBuffer(raw.byteLength);
    new Uint8Array(buf).set(raw);
    return new Blob([buf], { type: "video/mp4" });
  } finally {
    ff.off("progress", handleProgress);
    // Best-effort cleanup
    try { await ff.deleteFile(inputName); } catch { /* ignore */ }
    try { await ff.deleteFile(outputName); } catch { /* ignore */ }
  }
}

/** True if the given MIME type / blob is already an MP4 — no transcode needed. */
export function isAlreadyMp4(mimeOrBlob: string | Blob): boolean {
  const m = typeof mimeOrBlob === "string" ? mimeOrBlob : mimeOrBlob.type;
  return /video\/mp4/i.test(m);
}
