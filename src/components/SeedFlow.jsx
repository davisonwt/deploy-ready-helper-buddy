import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CYCLE = 360;
const PHASE_LEFT = 140;
const PHASE_PAUSE1 = 175;
const PHASE_RIGHT = 315;
const PHASE_PAUSE2 = 360;

function createSeeds(count = 36) {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * 3000,
    y: 4 + Math.random() * 32,
    size: 2 + Math.random() * 2.8,
    baseSpeed: 0.4 + Math.random() * 0.7,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.022 + 0.008,
    opacity: 0.55 + Math.random() * 0.45,
    type: Math.random() > 0.4 ? 'seed' : 'wisp',
    driftDir: i % 2 === 0 ? 1 : -1,
    driftSpeed: 0.08 + Math.random() * 0.12,
  }));
}

export default function SeedFlow({
  fixed = false,
  height = 40,
  seedCount = 36,
  zIndex = 50,
  showAds = true,
  style: extraStyle = {},
}) {
  const canvasRef = useRef(null);
  const seedsRef  = useRef(null);
  const rafRef    = useRef(null);
  const frameRef  = useRef(0);
  const [ads, setAds] = useState([]);
  const [adTick, setAdTick] = useState(0);

  useEffect(() => {
    if (!showAds) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, slug, name, logo_url')
        .eq('is_verified', true)
        .eq('ads_enabled', true)
        .not('logo_url', 'is', null)
        .limit(40);
      if (alive && data) setAds(data);
    })();
    return () => { alive = false; };
  }, [showAds]);

  useEffect(() => {
    if (!showAds || ads.length === 0) return;
    const id = setInterval(() => setAdTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [showAds, ads.length]);

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
        windStrength = Math.min(1, cyclePos / 18) * Math.min(1, (PHASE_LEFT - cyclePos) / 18);
      } else if (cyclePos < PHASE_PAUSE1) {
        windDir = 0; windStrength = 0;
      } else if (cyclePos < PHASE_RIGHT) {
        windDir = 1;
        const t2 = cyclePos - PHASE_PAUSE1;
        const len = PHASE_RIGHT - PHASE_PAUSE1;
        windStrength = Math.min(1, t2 / 18) * Math.min(1, (len - t2) / 18);
      } else {
        windDir = 0; windStrength = 0;
      }

      // Background tint
      const bgA = 0.03 + windStrength * 0.04;
      ctx.fillStyle = `rgba(234,179,8,${bgA})`;
      ctx.fillRect(0, 0, w, h);

      // Wind lines
      if (windStrength > 0.15) {
        for (let i = 0; i < 5; i++) {
          const wy = 6 + i * (h / 5);
          const wOff = ((f * windDir * 2.5 + i * 60) % w + w) % w;
          const wg = ctx.createLinearGradient(wOff, wy, wOff + windDir * 80, wy);
          if (windDir < 0) {
            wg.addColorStop(0, `rgba(234,179,8,${windStrength * 0.18})`);
            wg.addColorStop(1, 'rgba(234,179,8,0)');
          } else {
            wg.addColorStop(0, 'rgba(234,179,8,0)');
            wg.addColorStop(1, `rgba(234,179,8,${windStrength * 0.18})`);
          }
          ctx.beginPath(); ctx.moveTo(wOff, wy);
          for (let x = 0; x < 90; x++) ctx.lineTo(wOff + x, wy + Math.sin(x * 0.12 + f * 0.05) * 2.5);
          ctx.strokeStyle = wg; ctx.lineWidth = 0.8; ctx.stroke();
        }
      }

      seedsRef.current.forEach(s => {
        s.wobble += s.wobbleSpeed;
        // Always drift gently, wind adds to it
        const windPush = s.baseSpeed * windStrength * windDir;
        const gentleDrift = s.driftSpeed * s.driftDir;
        const speed = windStrength > 0.1 ? windPush : gentleDrift;
        s.x += speed;
        if (s.x > w + 30) s.x = -30;
        if (s.x < -30) s.x = w + 30;

        const wy = s.y + Math.sin(s.wobble) * 3;
        const edgeFade = Math.min(1, Math.min(s.x / 40, (w - s.x) / 40));
        // Always visible, brighter during wind
        const baseAlpha = s.opacity * Math.max(0, edgeFade);
        const alpha = baseAlpha * (windStrength > 0.1 ? (0.6 + windStrength * 0.4) : 0.7);
        if (alpha < 0.05) return;

        if (s.type === 'seed') {
          const tilt = speed !== 0 ? Math.sign(speed) * -0.5 : 0;
          ctx.beginPath();
          ctx.ellipse(s.x, wy, s.size * 0.65, s.size * 1.5, tilt, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(234,179,8,${alpha})`; ctx.fill();

          // Glow
          const gg = ctx.createRadialGradient(s.x, wy, 0, s.x, wy, s.size * 3);
          gg.addColorStop(0, `rgba(234,179,8,${alpha * 0.3})`);
          gg.addColorStop(1, 'rgba(234,179,8,0)');
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(s.x, wy, s.size * 3, 0, Math.PI * 2); ctx.fill();

          // Trail when moving
          if (Math.abs(speed) > 0.05) {
            const tg = ctx.createLinearGradient(s.x, wy, s.x - speed * 22, wy);
            tg.addColorStop(0, `rgba(234,179,8,${alpha * 0.55})`);
            tg.addColorStop(1, 'rgba(234,179,8,0)');
            ctx.beginPath(); ctx.moveTo(s.x, wy);
            ctx.lineTo(s.x - speed * 22, wy + Math.sin(s.wobble) * 2);
            ctx.strokeStyle = tg; ctx.lineWidth = 1.2; ctx.stroke();
          }
        } else {
          // Dandelion wisp
          ctx.beginPath(); ctx.arc(s.x, wy, s.size * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.85})`; ctx.fill();
          const wispGlow = ctx.createRadialGradient(s.x, wy, 0, s.x, wy, s.size * 4);
          wispGlow.addColorStop(0, `rgba(255,255,255,${alpha * 0.25})`);
          wispGlow.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = wispGlow; ctx.beginPath(); ctx.arc(s.x, wy, s.size * 4, 0, Math.PI * 2); ctx.fill();
          for (let r = 0; r < 6; r++) {
            const ra = (r / 6) * Math.PI * 2 + s.wobble * 0.4;
            ctx.beginPath(); ctx.moveTo(s.x, wy);
            ctx.lineTo(s.x + Math.cos(ra) * s.size * 3.5, wy + Math.sin(ra) * s.size * 3.5);
            ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.4})`; ctx.lineWidth = 0.7; ctx.stroke();
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
      borderBottom: 'none',
      background: '#060a12',
      ...extraStyle,
    }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {showAds && ads.length > 0 && (() => {
        const slots = Math.min(4, ads.length);
        const visible = [];
        for (let i = 0; i < slots; i++) {
          visible.push(ads[(adTick * 1 + i * 7) % ads.length]);
        }
        const size = Math.max(22, Math.min(34, height - 8));
        const cycleSec = 22;
        const now = Date.now() / 1000;
        return visible.map((c, i) => {
          const phase = (now / cycleSec + i / slots) % 1;
          const left = `${(phase * 110 - 5).toFixed(2)}%`;
          const top = (height - size) / 2;
          return (
            <a
              key={`${c.id}-${i}`}
              href={`/factories/${c.slug}`}
              title={c.name}
              style={{
                position: 'absolute',
                left,
                top,
                width: size,
                height: size,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1.5px solid rgba(234,179,8,0.55)',
                boxShadow: '0 0 12px rgba(234,179,8,0.35)',
                background: '#0b1220',
                pointerEvents: 'auto',
                transition: 'transform 200ms ease, box-shadow 200ms ease',
                transform: 'translateZ(0)',
                display: 'block',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.18)';
                e.currentTarget.style.boxShadow = '0 0 18px rgba(234,179,8,0.75)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(234,179,8,0.35)';
              }}
            >
              <img
                src={c.logo_url}
                alt={c.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="lazy"
              />
            </a>
          );
        });
      })()}
    </div>
  );
}
