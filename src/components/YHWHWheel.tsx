// YHWH Eternal Wheel — Canvas-based calendar visualization
'use client';

import { useEffect, useRef, useState } from 'react';

const brass = '#b48f50';
const wood = '#3c2a1a';
const glow = '#ffddaa';
const crimson = '#c41e3a';
const silver = '#e5e5ff';
const shabbat = '#f0f0ff';

export default function YHWHWheel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 800 });
  const t0Ref = useRef(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      setDimensions({ w, h });
    };

    resize();
    window.addEventListener('resize', resize);

    function drawRing(x: number, y: number, r1: number, r2: number, segments: number, rot: number, color: string) {
      ctx.strokeStyle = color;
      ctx.lineWidth = r2 - r1;
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const a = rot + i * Math.PI * 2 / segments;
        const x0 = x + Math.cos(a) * ((r1 + r2) / 2);
        const y0 = y + Math.sin(a) * ((r1 + r2) / 2);
        i === 0 ? ctx.moveTo(x0, y0) : ctx.lineTo(x0, y0);
      }
      ctx.stroke();
    }

    let animationId: number;
    
    function animate() {
      animationId = requestAnimationFrame(animate);

      ctx.fillStyle = 'rgba(11,14,23,0.96)';
      ctx.fillRect(0, 0, dimensions.w, dimensions.h);

      const now = Date.now();
      const secs = (now - t0Ref.current) / 1000;
      const cx = dimensions.w / 2;
      const cy = dimensions.h / 2;
      const big = Math.min(dimensions.w, dimensions.h) * 0.42;

      // 1. Fixed 364-day ring + golden sunrise line
      drawRing(cx, cy, big * 0.95, big * 1.00, 364, 0, brass);
      const yearAngle = -secs / (86400 * 364) * Math.PI * 2;
      ctx.strokeStyle = glow;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(yearAngle) * big * 0.97, cy + Math.sin(yearAngle) * big * 0.97);
      ctx.stroke();

      // 2. 24 priestly courses + visible 10-day drift
      const lunarAngle = -secs / (86400 * 354) * Math.PI * 2;
      drawRing(cx, cy, big * 0.82, big * 0.88, 24, 0, wood);
      const course = Math.floor(secs / (86400 * 7)) % 24;
      ctx.strokeStyle = crimson;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = big * 0.07;
      ctx.beginPath();
      ctx.arc(cx, cy, big * 0.85, lunarAngle + course * Math.PI * 2 / 24, lunarAngle + (course + 1) * Math.PI * 2 / 24);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Silver moon pointer (shows the drift clearly)
      ctx.strokeStyle = silver;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(lunarAngle) * big * 0.85, cy + Math.sin(lunarAngle) * big * 0.85);
      ctx.stroke();

      // 3. 18-part yowm (80-minute parts)
      const yowmAngle = -secs / (80 * 60) * Math.PI * 2;
      const part = (secs / (80 * 60)) % 18;
      ctx.strokeStyle = `hsl(${part * 20},100%,65%)`;
      ctx.lineWidth = big * 0.09;
      ctx.beginPath();
      ctx.arc(cx, cy, big * 0.70, yowmAngle, yowmAngle + Math.PI * 2 / 18);
      ctx.stroke();

      // 4. 7-day week + Shabbat pulse
      const weekAngle = -secs / 86400 * Math.PI * 2 / 7;
      drawRing(cx, cy, big * 0.55, big * 0.61, 7, weekAngle, brass);
      if (Math.floor(secs / 86400 % 7) === 6) {
        ctx.strokeStyle = shabbat;
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(secs * 4);
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, big * 0.58, weekAngle, weekAngle + Math.PI * 2 / 7);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 5. 4 watches hand
      const watch = Math.floor((secs % 86400) / 21600);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(-Math.PI / 2 + watch * Math.PI / 2) * big * 0.38,
        cy + Math.sin(-Math.PI / 2 + watch * Math.PI / 2) * big * 0.38
      );
      ctx.stroke();

      // Text – warm, clear, instant understanding
      ctx.fillStyle = brass;
      ctx.font = 'bold 26px Georgia';
      ctx.textAlign = 'center';
      const dayOfYear = Math.floor(secs / 86400 % 364) + 1;
      const month = Math.floor((dayOfYear - 1) / 30) + 1;
      const day = (dayOfYear - 1) % 30 + 1;
      const drift = ((secs / 86400 / 364) * 10 % 10).toFixed(1);

      ctx.fillText(`Year 6028 • Month ${month} • Day ${day}`, cx, cy - big * 0.15);
      ctx.fillText(
        `Weekday ${(Math.floor(secs / 86400) % 7) || 7} • Part ${Math.floor(part) + 1}/18 • ${['Day', 'Evening', 'Night', 'Morning'][watch]}`,
        cx,
        cy + big * 0.15
      );
      ctx.fillText(
        `Priestly courses drift ~10 days/year • now −${drift} days behind the sun`,
        cx,
        cy + big * 0.28
      );
      ctx.font = '18px Georgia';
      ctx.fillStyle = '#888';
      ctx.fillText(`${new Date().toISOString().slice(0, 19).replace('T', ' ')}`, cx, cy + big * 0.40);
      ctx.fillStyle = '#333';
      ctx.font = '14px Georgia';
      ctx.fillText('YHWH\'s wheels never lie • forever in sync', cx, dimensions.h - 40);
    }

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [dimensions]);

  return (
    <div className="relative bg-[#0b0e17] rounded-lg overflow-hidden" style={{ width: '600px', height: '600px', minWidth: '600px', minHeight: '600px' }}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

