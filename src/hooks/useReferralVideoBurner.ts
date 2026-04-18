/**
 * useReferralVideoBurner
 * --------------------------------------------------------------
 * Personalizes a marketing banner MP4 in the browser by burning a
 * full-width bottom banner ("Join {name}'s tribe — sow2growapp.com/?ref=CODE")
 * into the video pixels using ffmpeg.wasm. Result is a true, shareable MP4
 * that carries the referral attribution wherever it travels.
 *
 * Design notes:
 *  - ffmpeg.wasm is loaded ONCE per session and cached in module scope.
 *  - We render the overlay strip on a 1920×120 transparent PNG via canvas,
 *    then ask ffmpeg to overlay it on the bottom of the source video and
 *    re-encode (libx264, ultrafast preset, AAC audio passthrough).
 *  - All work is client-side: zero backend cost, no rate limits, offline-safe
 *    after the first ffmpeg load.
 */
import { useCallback, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const FFMPEG_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

let ffmpegSingleton: FFmpeg | null = null;
async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegSingleton) return ffmpegSingleton;
  const ffmpeg = new FFmpeg();
  if (onLog) ffmpeg.on("log", ({ message }) => onLog(message));
  await ffmpeg.load({
    coreURL: await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.wasm`, "application/wasm"),
  });
  ffmpegSingleton = ffmpeg;
  return ffmpeg;
}

/** Render the referral banner strip as a 1920×120 PNG */
async function renderBannerPng(
  inviterName: string,
  referralCode: string,
  shareUrl: string,
): Promise<Uint8Array> {
  const W = 1920;
  const H = 120;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Warm gradient strip (matches S2G terracotta → ochre brand bar)
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "rgba(184, 80, 66, 0.92)");   // terracotta
  grad.addColorStop(1, "rgba(212, 168, 67, 0.92)");  // ochre
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle top hairline
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(0, 0, W, 2);

  // Left side: "Join {inviter}'s tribe"
  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "middle";
  ctx.font = "700 44px Inter, system-ui, -apple-system, sans-serif";
  const leftText = inviterName ? `Join ${inviterName}'s tribe` : "Join the S2G tribe";
  ctx.fillText(leftText, 60, H / 2);

  // Right side: short link + code chip
  ctx.font = "600 38px Inter, system-ui, -apple-system, sans-serif";
  const linkText = shareUrl;
  const linkMetrics = ctx.measureText(linkText);

  // Code chip (right-most)
  const chipPadX = 28;
  const chipH = 64;
  ctx.font = "800 36px 'JetBrains Mono', ui-monospace, monospace";
  const codeMetrics = ctx.measureText(referralCode);
  const chipW = codeMetrics.width + chipPadX * 2;
  const chipX = W - chipW - 60;
  const chipY = (H - chipH) / 2;

  // Chip background
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  roundRect(ctx, chipX, chipY, chipW, chipH, 14);
  ctx.fill();
  ctx.fillStyle = "#B85042";
  ctx.fillText(referralCode, chipX + chipPadX, H / 2);

  // Link text just left of chip
  ctx.font = "600 38px Inter, system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(linkText, chipX - linkMetrics.width - 32, H / 2);

  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png"),
  );
  const buf = new Uint8Array(await blob.arrayBuffer());
  return buf;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface BurnOptions {
  /** Source MP4 URL (same-origin or CORS-enabled). */
  sourceUrl: string;
  /** Friendly file name suggested to the user (without extension). */
  fileBaseName: string;
  /** Inviter display name (e.g. "Sarah"). Used in "Join Sarah's tribe". */
  inviterName: string;
  /** Referral code burned into the strip and used in the share URL. */
  referralCode: string;
  /** Short share URL displayed on the strip (without protocol prefix is fine). */
  shareUrl: string;
}

export function useReferralVideoBurner() {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "loading" | "burning" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const burnAndDownload = useCallback(async (opts: BurnOptions) => {
    setError(null);
    setProgress(0);
    cancelRef.current = false;
    try {
      setStage("loading");
      const ffmpeg = await getFFmpeg();
      ffmpeg.on("progress", ({ progress: p }) => {
        if (!cancelRef.current) setProgress(Math.min(99, Math.round(p * 100)));
      });

      setStage("burning");
      const [videoBytes, overlayBytes] = await Promise.all([
        fetchFile(opts.sourceUrl),
        renderBannerPng(opts.inviterName, opts.referralCode, opts.shareUrl),
      ]);

      await ffmpeg.writeFile("input.mp4", videoBytes);
      await ffmpeg.writeFile("overlay.png", overlayBytes);

      // Overlay at the very bottom, full width.
      // libx264 ultrafast keeps render time low; AAC re-encode preserves audio.
      await ffmpeg.exec([
        "-i", "input.mp4",
        "-i", "overlay.png",
        "-filter_complex", "[0:v][1:v]overlay=0:main_h-overlay_h:format=auto",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        "output.mp4",
      ]);

      const data = (await ffmpeg.readFile("output.mp4")) as Uint8Array;
      // Copy into a fresh ArrayBuffer-backed Uint8Array to satisfy strict BlobPart typing.
      const out = new Uint8Array(data.byteLength);
      out.set(data);
      const blob = new Blob([out.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `${opts.fileBaseName}-${opts.referralCode}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      // Cleanup ffmpeg FS
      try { await ffmpeg.deleteFile("input.mp4"); } catch {}
      try { await ffmpeg.deleteFile("overlay.png"); } catch {}
      try { await ffmpeg.deleteFile("output.mp4"); } catch {}

      setProgress(100);
      setStage("done");
    } catch (e: any) {
      console.error("[referral-video-burner] failed", e);
      setError(e?.message || "Failed to personalize video.");
      setStage("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStage("idle");
    setProgress(0);
    setError(null);
  }, []);

  return { burnAndDownload, progress, stage, error, reset };
}
