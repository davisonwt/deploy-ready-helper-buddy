// Client-side image resize before a stall image upload -- keeps stall
// front/interior/tile images small and consistent without a server-side
// image pipeline. Two shapes, matching the Farm-Stalls spec exactly:
//   - 'square': center-cropped to a square, capped at maxSize per side
//     (stall front images -- shown as a fixed-aspect shop-front tile).
//   - 'width': full aspect ratio kept, capped at maxSize wide (interior/
//     tile images -- shown as a wide interior scene, not square).
// Always exports WebP (quality 0.85 -- visually lossless for a photo at
// these dimensions, meaningfully smaller than JPEG at the same quality).

export type ResizeMode = 'square' | 'width';

export interface ResizedImage {
  blob: Blob;
  width: number;
  height: number;
}

const WEBP_QUALITY = 0.85;

export function resizeImage(file: File, mode: ResizeMode, maxSize: number): Promise<ResizedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        let outW: number, outH: number;

        if (mode === 'square') {
          const side = Math.min(img.naturalWidth, img.naturalHeight);
          sx = (img.naturalWidth - side) / 2;
          sy = (img.naturalHeight - side) / 2;
          sw = side;
          sh = side;
          outW = outH = Math.min(side, maxSize);
        } else {
          const scale = img.naturalWidth > maxSize ? maxSize / img.naturalWidth : 1;
          outW = Math.round(img.naturalWidth * scale);
          outH = Math.round(img.naturalHeight * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas unavailable')); return; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve({ blob, width: outW, height: outH });
          else reject(new Error('resize failed'));
        }, 'image/webp', WEBP_QUALITY);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err instanceof Error ? err : new Error('resize failed'));
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('could not read image')); };
    img.src = url;
  });
}
