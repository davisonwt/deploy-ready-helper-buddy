/**
 * SeedFlow.jsx
 * S2G — Thin living seed strip that floats across the top of every page
 * Drop into: src/components/SeedFlow.jsx
 *
 * Usage:
 *   import SeedFlow from './SeedFlow';
 *
 *   // In your layout or page wrapper:
 *   <SeedFlow />
 *   <div>...rest of page...</div>
 *
 *   // Or as a fixed strip always visible:
 *   <SeedFlow fixed />
 *
 * Props:
 *   fixed      — boolean, position:fixed at top of screen (default false)
 *   height     — strip height in px (default 40)
 *   seedCount  — number of seeds (default 30)
 *   zIndex     — (default 50)
 *   style      — extra styles on wrapper
 */

import { useEffect, useRef } from 'react';
import { drawSeedFlow, createSeeds } from '../hooks/useElementAnimation';

export default function SeedFlow({
  fixed = false,
  height = 40,
  seedCount = 30,
  zIndex = 50,
  style: extraStyle = {},
}) {
  const canvasRef = useRef(null);
  const seedsRef  = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    seedsRef.current = createSeeds(seedCount);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = canvas.offsetWidth  || window.innerWidth;
      canvas.height = canvas.offsetHeight || height;
      // Scale seed y positions to new height
      if (seedsRef.current) {
        seedsRef.current.forEach(s => {
          s.y = 4 + Math.random() * (canvas.height - 8);
        });
      }
    }
    resize();
    window.addEventListener('resize', resize);

    function loop() {
      if (canvas.width !== canvas.offsetWidth && canvas.offsetWidth > 0) resize();
      drawSeedFlow(ctx, canvas.width, canvas.height, seedsRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [height, seedCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        position: fixed ? 'fixed' : 'relative',
        top: fixed ? 0 : undefined,
        left: fixed ? 0 : undefined,
        right: fixed ? 0 : undefined,
        width: '100%',
        height,
        zIndex,
        pointerEvents: 'none',
        overflow: 'hidden',
        borderRadius: fixed ? 0 : 24,
        border: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(255,255,255,0.01)',
        ...extraStyle,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}
