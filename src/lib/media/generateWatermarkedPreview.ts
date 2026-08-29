const MAX_WIDTH = 1200;
const WATERMARK_TEXT = 'Sow2Grow preview';

/**
 * Client-side, canvas-only — no edge function. Resizes to a max 1200px
 * width (never upscales a smaller image) and tiles a diagonal, 30%-opacity
 * "Sow2Grow preview" watermark across it. The full-resolution original is
 * never touched here — it uploads separately, straight to premium-room,
 * gated by get-seed-file; this is only ever the public seed-previews copy.
 */
export async function generateWatermarkedPreview(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read image'));
      el.src = objectUrl;
    });

    const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported in this browser');

    ctx.drawImage(img, 0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.font = `${Math.max(18, Math.round(width / 18))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-30 * Math.PI) / 180);
    const stepY = Math.max(120, Math.round(height / 4));
    const stepX = Math.max(220, Math.round(width / 3));
    for (let y = -height; y < height * 2; y += stepY) {
      for (let x = -width; x < width * 2; x += stepX) {
        ctx.strokeText(WATERMARK_TEXT, x, y);
        ctx.fillText(WATERMARK_TEXT, x, y);
      }
    }
    ctx.restore();

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not export preview image'))),
        'image/jpeg',
        0.85
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
