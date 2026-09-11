import { useEffect, useState, type RefObject } from 'react';

export interface ContainRect {
  /** Left/top offset of the rendered image box within its container (the object-contain letterbox bars). */
  offsetX: number;
  offsetY: number;
  /** Rendered (post-scale) image box size -- always <= the container's own size. */
  width: number;
  height: number;
}

/**
 * Tracks the actual on-screen box an `object-contain`-fitted <img> occupies
 * within its container -- recomputed on image load, container resize, and
 * orientation change. Farm-Stalls batch 2b: hotspot percentages are
 * relative to the image's own natural dimensions, not the viewport, so
 * anything positioning a hotspot needs this box (not just the container's
 * clientWidth/clientHeight) to land correctly whenever the image is
 * letterboxed (container aspect ratio != image aspect ratio).
 */
export function useContainImageRect(
  containerRef: RefObject<HTMLElement>,
  imgRef: RefObject<HTMLImageElement>,
): ContainRect | null {
  const [rect, setRect] = useState<ContainRect | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const compute = () => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (!iw || !ih || !cw || !ch) return;
      const scale = Math.min(cw / iw, ch / ih);
      const width = iw * scale;
      const height = ih * scale;
      setRect({ offsetX: (cw - width) / 2, offsetY: (ch - height) / 2, width, height });
    };

    if (img.complete && img.naturalWidth) compute();
    img.addEventListener('load', compute);

    const ro = new ResizeObserver(compute);
    ro.observe(container);
    window.addEventListener('orientationchange', compute);

    return () => {
      img.removeEventListener('load', compute);
      ro.disconnect();
      window.removeEventListener('orientationchange', compute);
    };
  }, [containerRef, imgRef]);

  return rect;
}
