import { useEffect, useRef } from 'react';

const CYCLE = 300;
const PHASE_LEFT = 130;
const PHASE_PAUSE1 = 160;
const PHASE_RIGHT = 290;

function createSeeds(count = 32) {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * 2000,
    y: 5 + Math.random() * 34,
    size: 1.2 + Math.random() * 2,
    baseSpeed: 0.3 + Math.random() * 0.5,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.02 + 0.008,
    opacity: 0.2 + Math.random() * 0.45,
    type: Math.random() > 0.4 ? 'seed' : 'wisp',
  }));
}

export default function SeedFlow({
  fixed = false,
  height = 40,
  seedCount = 32,
  zIndex = 50,
  style: extraStyle = {},
}) {
  const canvasRef = useRef(null);
  const seedsRef  = useRef(null);
  const rafRef    = useRef(null);
  const frameRef  = useRef(0);

  useEffect(() => {
    seedsRef.current = createSeeds(seedCount);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = canvas.offsetWidth  || window.innerWidth;
      canvas.height = canvas.offsetHeight || height;
    }
    resize();
    window.addEventListener('resize', resize);

    function loop() {
      frameRef.current++;
      if (canvas.width !== canvas.offsetWidth && canvas.offsetWidth > 0) resize();
      const w = canvas.width, h = canvas.height;
      const f = frameRef.current;
      ctx.clearRect(0, 0, w, h);

      // Wind cycle
      const cyclePos = f % CYCLE;
      let windDir = 0, windStrength = 0;
      if (cyclePos < PHASE_LEFT) {
        windDir = -1;
        windStrength = Math.min(1, cyclePos / 20) * Math.min(1, (PHASE_LEFT - cyclePos) / 20);
      } else if (cyclePos < PHASE_PAUSE1) {
        windDir = 0; windStrength = 0;
      } else if (cyclePos < PHASE_RIGHT) {
        windDir = 1;
        const t2 = cyclePos - PHASE_PAUSE1;
        const len = PHASE_RIGHT - PHASE_PAUSE1;
        windStrength = Math.min(1, t2 / 20) * Math.min(1, (len - t2) / 20);
      } else {
        windDir = 0; windStrength = 0;
      }

      // Subtle wind lines
      if (windStrength > 0.1) {
        for (let i = 0; i < 4; i++) {
          const wy = 8 + i * 9;
          const wOff = ((f * windDir * 2 + i * 40) % w + w) % w;
          const wg = ctx.createLinearGradient(wOff, wy, wOff + windDir * 60, wy);
          if (windDir < 0) {
            wg.addColorStop(0, `rgba(234,179,8,${windStrength * 0.1})`);
            wg.addColorStop(1, 'rgba(234,179,8,0)');
          } else {
            wg.addColorStop(0, 'rgba(234,179,8,0)');
            wg.addColorStop(1, `rgba(234,179,8,${windStrength * 0.1})`);
          }
          ctx.beginPath(); ctx.moveTo(wOff, wy);
          for (let x = 0; x < 80; x++) ctx.lineTo(wOff + x, wy + Math.sin(x * 0.15 + f * 0.05) * 2);
          ctx.strokeStyle = wg; ctx.lineWidth = 0.7; ctx.stroke();
        }
      }

      seedsRef.current.forEach(s => {
        s.wobble += s.wobbleSpeed;
        const speed = s.baseSpeed * windStrength * windDir;
        s.x += speed;
        if (s.x > w + 20) s.x = -20;
        if (s.x < -20) s.x = w + 20;
        const wy = s.y + Math.sin(s.wobble) * 2.5;
        const edgeFade = Math.min(1, Math.min(s.x / 50, (w - s.x) / 50));
        const alpha = s.opacity * Math.max(0, edgeFade) * (0.35 + windStrength * 0.65);
        if (alpha < 0.02) return;

        if (s.type === 'seed') {
          ctx.beginPath();
          ctx.ellipse(s.x, wy, s.size * 0.7, s.size * 1.4, speed !== 0 ? Math.sign(speed) * -0.4 : 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(234,179,8,${alpha})`; ctx.fill();
          if (Math.abs(speed) > 0.1) {
            const tg = ctx.createLinearGradient(s.x, wy, s.x - speed * 18, wy);
            tg.addColorStop(0, `rgba(234,179,8,${alpha * 0.5})`);
            tg.addColorStop(1, 'rgba(234,179,8,0)');
            ctx.beginPath(); ctx.moveTo(s.x, wy);
            ctx.lineTo(s.x - speed * 18, wy + Math.sin(s.wobble) * 1.5);
            ctx.strokeStyle = tg; ctx.lineWidth = 0.8; ctx.stroke();
          }
        } else {
          ctx.beginPath(); ctx.arc(s.x, wy, s.size * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`; ctx.fill();
          for (let r = 0; r < 5; r++) {
            const ra = (r / 5) * Math.PI * 2 + s.wobble * 0.5;
            ctx.beginPath(); ctx.moveTo(s.x, wy);
            ctx.lineTo(s.x + Math.cos(ra) * s.size * 2.5, wy + Math.sin(ra) * s.size * 2.5);
            ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.3})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      });

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [height, seedCount]);

  return (
    <div style={{
      position: fixed ? 'fixed' : 'relative',
      top: fixed ? 0 : undefined,
      left: fixed ? 0 : undefined,
      right: fixed ? 0 : undefined,
      width: '100%',
      height,
      zIndex,
      pointerEvents: 'none',
      overflow: 'hidden',
      borderRadius: fixed ? 0 : 0,
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      background: 'rgba(255,255,255,0.01)',
      ...extraStyle,
    }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
