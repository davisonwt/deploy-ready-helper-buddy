/**
 * useReferralVideoBurner
 * --------------------------------------------------------------
 * Personalizes a marketing banner MP4 in the browser by burning a
 * full-width bottom banner ("Join {name}'s tribe — sow2growapp.com/?ref=CODE")
 * directly into the video pixels.
 *
 * Implementation: Canvas + MediaRecorder (native browser APIs, no WASM,
 * no SharedArrayBuffer, no external CDN dependency, no CORS issues).
 * The result is a real, shareable video file (WebM with VP9, or MP4 where
 * supported) carrying the referral attribution wherever it travels.
 *
 * Why not ffmpeg.wasm?
 *  - Requires loading ~25MB of WASM from a public CDN (CSP/network risk)
 *  - Slow on large clips and prone to OOM in the browser tab
 *  - Some hosting environments block SharedArrayBuffer
 *  - MediaRecorder is supported in every evergreen browser and "just works"
 */
import { useCallback, useRef, useState } from "react";

/** Render the referral banner strip onto a canvas context (full width × 120px). */
function paintBanner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  inviterName: string,
  referralCode: string,
  shareUrl: string,
) {
  // Warm gradient strip (S2G terracotta → ochre)
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, "rgba(184, 80, 66, 0.94)");
  grad.addColorStop(1, "rgba(212, 168, 67, 0.94)");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Top hairline
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(x, y, w, 2);

  const cy = y + h / 2;

  // Left text: "Join {inviter}'s tribe"
  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(h * 0.36)}px Inter, system-ui, -apple-system, sans-serif`;
  const leftText = inviterName ? `Join ${inviterName}'s tribe` : "Join the S2G tribe";
  ctx.fillText(leftText, x + 32, cy);

  // Code chip on the right
  const chipFontSize = Math.round(h * 0.32);
  ctx.font = `800 ${chipFontSize}px 'JetBrains Mono', ui-monospace, monospace`;
  const codeMetrics = ctx.measureText(referralCode);
  const chipPadX = 22;
  const chipH = Math.round(h * 0.6);
  const chipW = codeMetrics.width + chipPadX * 2;
  const chipX = x + w - chipW - 32;
  const chipY = cy - chipH / 2;

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  roundRect(ctx, chipX, chipY, chipW, chipH, 12);
  ctx.fill();
  ctx.fillStyle = "#B85042";
  ctx.fillText(referralCode, chipX + chipPadX, cy);

  // Share URL just left of chip
  ctx.font = `600 ${Math.round(h * 0.3)}px Inter, system-ui, -apple-system, sans-serif`;
  const linkMetrics = ctx.measureText(shareUrl);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(shareUrl, chipX - linkMetrics.width - 24, cy);
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

/** Pick the best supported MediaRecorder MIME type. */
function pickMimeType(): { mime: string; ext: string } {
  const candidates: Array<{ mime: string; ext: string }> = [
    { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) {
      return c;
    }
  }
  return { mime: "video/webm", ext: "webm" };
}

export interface BurnOptions {
  sourceUrl: string;
  fileBaseName: string;
  inviterName: string;
  referralCode: string;
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

    if (typeof MediaRecorder === "undefined") {
      setStage("error");
      setError("Your browser doesn't support in-page video recording. Try Chrome, Edge, or Firefox.");
      return;
    }

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.muted = false;
    video.preload = "auto";
    video.src = opts.sourceUrl;

    try {
      setStage("loading");
      // Wait for metadata
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => { cleanup(); resolve(); };
        const onErr = () => { cleanup(); reject(new Error("Could not load source video.")); };
        const cleanup = () => {
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("error", onErr);
        };
        video.addEventListener("loadedmetadata", onLoaded);
        video.addEventListener("error", onErr);
      });

      const W = video.videoWidth || 1280;
      const H = video.videoHeight || 720;
      const bannerH = Math.max(80, Math.round(H * 0.11));
      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) {
        throw new Error("Source video has no duration.");
      }

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available.");

      const fps = 30;
      const stream = (canvas as HTMLCanvasElement).captureStream(fps);

      // Try to attach audio from the source video using captureStream
      try {
        // @ts-expect-error: captureStream exists on HTMLMediaElement in modern browsers
        const vStream: MediaStream | undefined = video.captureStream?.() ?? video.mozCaptureStream?.();
        if (vStream) {
          vStream.getAudioTracks().forEach((t) => stream.addTrack(t));
        }
      } catch {
        // audio-less output is fine
      }

      const { mime, ext } = pickMimeType();
      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 4_000_000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

      const recordingDone = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
        recorder.onerror = (e: any) => reject(new Error(e?.error?.message || "Recording failed."));
      });

      setStage("burning");
      recorder.start(250);

      // Drive playback and draw frames onto canvas
      video.currentTime = 0;
      await video.play().catch(() => {
        // Some browsers require user gesture; the click that started this counts.
      });

      let raf = 0;
      const draw = () => {
        if (cancelRef.current) return;
        ctx.drawImage(video, 0, 0, W, H);
        paintBanner(ctx, 0, H - bannerH, W, bannerH, opts.inviterName, opts.referralCode, opts.shareUrl);
        const p = Math.min(99, Math.round((video.currentTime / duration) * 100));
        setProgress(p);
        if (!video.ended && !video.paused) {
          raf = requestAnimationFrame(draw);
        }
      };
      raf = requestAnimationFrame(draw);

      await new Promise<void>((resolve) => {
        const onEnd = () => { video.removeEventListener("ended", onEnd); resolve(); };
        video.addEventListener("ended", onEnd);
      });
      cancelAnimationFrame(raf);

      // Tiny tail to flush the last frame into the recorder
      await new Promise((r) => setTimeout(r, 250));
      recorder.stop();
      const blob = await recordingDone;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${opts.fileBaseName}-${opts.referralCode}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      setProgress(100);
      setStage("done");
    } catch (e: any) {
      console.error("[referral-video-burner] failed", e);
      setError(e?.message || "Failed to personalize video.");
      setStage("error");
    } finally {
      try { video.pause(); } catch {}
      video.removeAttribute("src");
      video.load();
    }
  }, []);

  const reset = useCallback(() => {
    setStage("idle");
    setProgress(0);
    setError(null);
  }, []);

  return { burnAndDownload, progress, stage, error, reset };
}
