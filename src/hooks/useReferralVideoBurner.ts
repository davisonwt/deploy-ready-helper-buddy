/**
 * useReferralVideoBurner
 * --------------------------------------------------------------
 * Personalizes a marketing banner MP4 in the browser by burning:
 *   1. A bottom referral strip ("Join {name}'s tribe — sow2growapp.com/?ref=CODE")
 *   2. A top-right CTA pill ("Become a Wandering Driver", etc.) matching the
 *      specific video's role/title.
 *
 * Both overlays are painted directly into the video pixels via Canvas +
 * MediaRecorder, so the CTA + referral travel everywhere the file goes
 * (WhatsApp, Telegram, Instagram, TikTok, AirDrop, email...).
 *
 * Two entry points:
 *   - burnAndDownload(...) → triggers a browser download of the burned file
 *   - burnToFile(...)      → returns the burned File object so the caller can
 *                            hand it to navigator.share({ files: [...] })
 *                            or upload it.
 */
import { useCallback, useRef, useState } from "react";
import { transcodeToMp4, isAlreadyMp4 } from "@/utils/transcodeToMp4";

/** Render the bottom referral strip (full width × ~11% of height). */
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

/** Top-right CTA pill — e.g. "Become a Wandering Driver". */
function paintCtaPill(
  ctx: CanvasRenderingContext2D,
  videoW: number,
  videoH: number,
  label: string,
) {
  if (!label) return;
  const pillH = Math.max(48, Math.round(videoH * 0.075));
  const fontSize = Math.round(pillH * 0.42);
  ctx.font = `800 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "middle";

  const text = label.toUpperCase();
  const textW = ctx.measureText(text).width;
  const sproutW = Math.round(pillH * 0.5);
  const padX = Math.round(pillH * 0.55);
  const gap = Math.round(pillH * 0.25);
  const pillW = padX * 2 + sproutW + gap + textW;

  const margin = Math.max(16, Math.round(videoH * 0.025));
  const pillX = videoW - pillW - margin;
  const pillY = margin;

  // Drop shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  // Pill background — warm S2G terracotta → ochre
  const grad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
  grad.addColorStop(0, "#B85042");
  grad.addColorStop(1, "#D4A843");
  ctx.fillStyle = grad;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.restore();

  // Subtle inner highlight
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  roundRect(ctx, pillX + 2, pillY + 2, pillW - 4, Math.max(6, pillH / 3), pillH / 2);
  ctx.fill();

  // Sprout glyph (simple two-leaf + stem) on the left
  const cx = pillX + padX + sproutW / 2;
  const cy = pillY + pillH / 2;
  ctx.strokeStyle = "#FFFFFF";
  ctx.fillStyle = "#FFFFFF";
  ctx.lineWidth = Math.max(2, Math.round(pillH * 0.06));
  ctx.lineCap = "round";
  // Stem
  ctx.beginPath();
  ctx.moveTo(cx, cy + sproutW * 0.35);
  ctx.lineTo(cx, cy - sproutW * 0.15);
  ctx.stroke();
  // Left leaf
  ctx.beginPath();
  ctx.ellipse(cx - sproutW * 0.22, cy - sproutW * 0.05, sproutW * 0.28, sproutW * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // Right leaf
  ctx.beginPath();
  ctx.ellipse(cx + sproutW * 0.22, cy - sproutW * 0.18, sproutW * 0.28, sproutW * 0.16, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Label text
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillText(text, pillX + padX + sproutW + gap, cy);
}

function paintLogo(ctx: CanvasRenderingContext2D, videoW: number, videoH: number, logo: HTMLImageElement) {
  const size = Math.max(86, Math.round(videoH * 0.14));
  const margin = Math.max(18, Math.round(videoH * 0.04));
  const x = margin;
  const y = margin;
  const accent = "#8FB3C9";

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.24)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  roundRect(ctx, x, y, size, size, size / 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(4, Math.round(size * 0.055));
  roundRect(ctx, x, y, size, size, size / 2);
  ctx.stroke();

  const inset = Math.round(size * 0.095);
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1.5, Math.round(size * 0.018));
  ctx.setLineDash([Math.max(2, size * 0.018), Math.max(3, size * 0.018)]);
  roundRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, (size - inset * 2) / 2);
  ctx.stroke();
  ctx.restore();

  ctx.drawImage(logo, x + size * 0.22, y + size * 0.22, size * 0.56, size * 0.56);
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load logo image."));
    image.src = src;
  });
}

/** Pick the best supported MediaRecorder MIME type. */
function pickMimeType(): { mime: string; ext: string } {
  // Prefer MP4 — it's the only format that opens on every phone / PC out of
  // the box (iOS Photos, Windows Media Player, AirDrop, iMessage, WhatsApp,
  // most SmartTVs). Safari & recent Chrome can record MP4 natively.
  // WebM is the universal fallback in Chromium; we transcode it to MP4
  // post-recording (see transcodeToMp4.ts) so the user always gets a
  // universally playable file.
  const candidates: Array<{ mime: string; ext: string }> = [
    { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" },
    { mime: "video/mp4;codecs=avc1,mp4a", ext: "mp4" },
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
  /** Optional CTA pill label burned into the top-right corner.
   *  e.g. "Become a Wandering Driver". Pass empty string to skip. */
  ctaLabel?: string;
  /** Optional brand mark burned into the top-left corner. */
  logoUrl?: string;
}

/** Internal shared burn engine — returns the final Blob + extension. */
async function runBurn(
  opts: BurnOptions,
  onStage: (s: "loading" | "burning" | "done" | "error") => void,
  onProgress: (p: number) => void,
  cancelRef: React.MutableRefObject<boolean>,
): Promise<{ blob: Blob; ext: string; mime: string }> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Your browser doesn't support in-page video recording. Try Chrome, Edge, or Firefox.");
  }

  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.playsInline = true;
  video.muted = false;
  video.defaultMuted = false;
  video.volume = 1;
  video.preload = "auto";
  video.src = opts.sourceUrl;

  let audioContext: AudioContext | null = null;
  let mediaSource: MediaElementAudioSourceNode | null = null;
  let audioDestination: MediaStreamAudioDestinationNode | null = null;
  let monitorGain: GainNode | null = null;

  try {
    onStage("loading");
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

    const logo = opts.logoUrl ? await loadImage(opts.logoUrl).catch(() => null) : null;

    const fps = 30;
    const canvasStream = (canvas as HTMLCanvasElement).captureStream(fps);

    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      throw new Error("Your browser doesn't support the audio engine needed for video export.");
    }

    audioContext = new AudioCtx();
    await audioContext.resume();
    mediaSource = audioContext.createMediaElementSource(video);
    audioDestination = audioContext.createMediaStreamDestination();
    monitorGain = audioContext.createGain();
    monitorGain.gain.value = 0;

    mediaSource.connect(audioDestination);
    mediaSource.connect(monitorGain);
    monitorGain.connect(audioContext.destination);

    const composedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDestination.stream.getAudioTracks(),
    ]);
    console.log("[referral-video-burner] audio tracks captured:", audioDestination.stream.getAudioTracks().length > 0);

    const { mime, ext } = pickMimeType();
    const recorder = new MediaRecorder(composedStream, {
      mimeType: mime,
      videoBitsPerSecond: 4_000_000,
      audioBitsPerSecond: 128_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    const recordingDone = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
      recorder.onerror = (e: any) => reject(new Error(e?.error?.message || "Recording failed."));
    });

    onStage("burning");
    recorder.start(250);

    video.currentTime = 0;
    await video.play().catch(() => {});

    let raf = 0;
    const draw = () => {
      if (cancelRef.current) return;
      ctx.drawImage(video, 0, 0, W, H);
      // Bottom referral strip
      paintBanner(ctx, 0, H - bannerH, W, bannerH, opts.inviterName, opts.referralCode, opts.shareUrl);
      // Top-right CTA pill (per-video role)
      if (opts.ctaLabel) {
        paintCtaPill(ctx, W, H, opts.ctaLabel);
      }
      if (logo) {
        paintLogo(ctx, W, H, logo);
      }
      const p = Math.min(99, Math.round((video.currentTime / duration) * 100));
      onProgress(p);
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

    await new Promise((r) => setTimeout(r, 250));
    recorder.stop();
    const blob = await recordingDone;

    onProgress(100);
    onStage("done");
    return { blob, ext, mime };
  } finally {
    try { mediaSource?.disconnect(); } catch {}
    try { monitorGain?.disconnect(); } catch {}
    try { audioDestination?.disconnect(); } catch {}
    void audioContext?.close().catch(() => undefined);
    try { video.pause(); } catch {}
    video.removeAttribute("src");
    video.load();
  }
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
      const { blob, ext, mime } = await runBurn(opts, setStage, setProgress, cancelRef);

      // Try to deliver an MP4 — WebM doesn't open in Windows Media Player,
      // iOS Photos, AirDrop, iMessage, most TVs, etc. Transcode if possible;
      // gracefully fall back to the original WebM if the wasm transcoder
      // cannot load (e.g. the page lacks SharedArrayBuffer / cross-origin
      // isolation, or the CDN is blocked).
      let finalBlob = blob;
      let finalExt = ext;
      if (!isAlreadyMp4(mime)) {
        setStage("burning");
        setProgress(0);
        try {
          finalBlob = await transcodeToMp4(blob, {
            onProgress: (r) => setProgress(Math.round(r * 100)),
          });
          finalExt = "mp4";
        } catch (transErr) {
          console.warn("[referral-video-burner] mp4 transcode unavailable, delivering original recording:", transErr);
          // Keep original blob/ext (webm). Most modern players (VLC, Chrome,
          // Android, recent Windows 11) play it; a small note in the UI
          // already warns the user.
        }
        setStage("done");
        setProgress(100);
      }

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${opts.fileBaseName}-${opts.referralCode}.${finalExt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      console.error("[referral-video-burner] download failed", e);
      setError(e?.message || "Failed to personalize video.");
      setStage("error");
    }
  }, []);

  /** Burn the video and return a File ready for navigator.share or upload. */
  const burnToFile = useCallback(async (opts: BurnOptions): Promise<File | null> => {
    setError(null);
    setProgress(0);
    cancelRef.current = false;
    try {
      const { blob, ext, mime } = await runBurn(opts, setStage, setProgress, cancelRef);

      // Same as above — try MP4, but degrade gracefully to WebM rather than
      // surfacing a fatal "Failed to personalize video" error.
      let finalBlob = blob;
      let finalExt = ext;
      let finalMime = mime.split(";")[0];
      if (!isAlreadyMp4(mime)) {
        setStage("burning");
        setProgress(0);
        try {
          finalBlob = await transcodeToMp4(blob, {
            onProgress: (r) => setProgress(Math.round(r * 100)),
          });
          finalExt = "mp4";
          finalMime = "video/mp4";
        } catch (transErr) {
          console.warn("[referral-video-burner] mp4 transcode unavailable, sharing original recording:", transErr);
        }
        setStage("done");
        setProgress(100);
      }

      return new File(
        [finalBlob],
        `${opts.fileBaseName}-${opts.referralCode}.${finalExt}`,
        { type: finalMime },
      );
    } catch (e: any) {
      console.error("[referral-video-burner] burn-to-file failed", e);
      setError(e?.message || "Failed to personalize video.");
      setStage("error");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStage("idle");
    setProgress(0);
    setError(null);
  }, []);

  return { burnAndDownload, burnToFile, progress, stage, error, reset };
}
