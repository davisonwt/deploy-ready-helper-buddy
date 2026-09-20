// Animated store fronts (2026-09-20): resizeImage.ts always draws through
// a <canvas>, which captures exactly one frame -- fine for a photo, silent
// data loss for an animated GIF/WebP. This detects whether a GIF/WebP
// file actually has more than one frame, using the browser's own
// ImageDecoder (the only reliable way to get a real frame count without
// hand-rolling a GIF/WebP container parser -- the same "don't guess at a
// format you can't correctly parse" caution audioTrim.ts/audioDuration.ts
// already apply to audio applies here too).
//
// ImageDecoder is Chromium-only as of this writing (not in Safari/
// Firefox). Where it's unavailable, or decoding throws for any reason,
// this returns null -- the caller's contract is: null means "couldn't
// verify, fall back to the existing resize-and-flatten path," never
// "assume static" silently passed off as a real answer.

export interface AnimationCheck {
  isAnimated: boolean;
  width: number;
  height: number;
}

export async function detectAnimatedImage(file: File): Promise<AnimationCheck | null> {
  const ImageDecoderCtor = (globalThis as unknown as { ImageDecoder?: new (init: { data: ArrayBuffer; type: string }) => any }).ImageDecoder;
  if (typeof ImageDecoderCtor !== 'function') return null;
  if (file.type !== 'image/gif' && file.type !== 'image/webp') return null;

  let decoder: { tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null }; decode: (opts: { frameIndex: number }) => Promise<{ image: { displayWidth: number; displayHeight: number; close?: () => void } }>; close?: () => void } | null = null;
  try {
    const buf = await file.arrayBuffer();
    decoder = new ImageDecoderCtor({ data: buf, type: file.type });
    await decoder.tracks.ready;
    const frameCount = decoder.tracks.selectedTrack?.frameCount ?? 1;
    const { image } = await decoder.decode({ frameIndex: 0 });
    const result: AnimationCheck = {
      isAnimated: frameCount > 1,
      width: image.displayWidth,
      height: image.displayHeight,
    };
    image.close?.();
    return result;
  } catch {
    return null;
  } finally {
    decoder?.close?.();
  }
}
