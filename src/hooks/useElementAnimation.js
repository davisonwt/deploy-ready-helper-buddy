/**
 * useElementAnimation.js
 * S2G — Living Button Animation Hook
 * All 9 Wandering Role animations + button effects
 * Drop into: src/hooks/useElementAnimation.js
 */

// ─── Colour helper ────────────────────────────────────────────────────────────
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// ─── ROLE ANIMATIONS ─────────────────────────────────────────────────────────
// Each function signature: (ctx, w, h, frame, hoverT, rgb)
// hoverT: 0 = idle, 1 = fully hovered (lerped smoothly)

export const ROLE_ANIMATIONS = {

  // 🌾 FIELD — wheat sways, seeds burst outward
  field(ctx, w, h, t, hT, rgb) {
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#120e00'); bg.addColorStop(1, '#060400');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    const sg = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, h);
    sg.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.05 + hT * 0.14})`);
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);

    const stalks = 10;
    for (let i = 0; i < stalks; i++) {
      const x = 8 + (i / (stalks - 1)) * (w - 16);
      const sway = Math.sin(t * 0.025 + i * 0.7) * 10 * (0.4 + hT * 0.6);
      const sh = (40 + Math.sin(i * 1.3) * 12) * (0.5 + hT * 0.5);
      const sg2 = ctx.createLinearGradient(x, h, x + sway, h - sh);
      sg2.addColorStop(0, `rgba(${rgb.r},${Math.floor(rgb.g * 0.55)},0,0.5)`);
      sg2.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`);
      ctx.beginPath(); ctx.moveTo(x, h);
      ctx.quadraticCurveTo(x + sway * 0.5, h - sh * 0.5, x + sway, h - sh);
      ctx.strokeStyle = sg2; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.stroke();
      for (let s = -2; s <= 2; s++) {
        ctx.beginPath();
        ctx.ellipse(x + sway + Math.sin(s) * 3, h - sh + s * 3.5, (4 + hT * 2) * 0.6, 4 + hT * 2, s * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${(0.5 + hT * 0.4) * Math.max(0.2, 1 - Math.abs(s) * 0.15)})`;
        ctx.fill();
      }
    }
    if (hT > 0.1) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = (t * 1.5 + i * 15) % 70;
        ctx.beginPath();
        ctx.arc(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${hT * (1 - r / 70) * 0.9})`;
        ctx.fill();
      }
    }
  },

  // 🤲 HAND — root network grows upward, leaves unfurl at tips
  hand(ctx, w, h, t, hT, rgb) {
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#061408'); bg.addColorStop(1, '#010a03');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    function root(x, y, ang, len, depth, a, lw) {
      if (len < 2 || depth < 0) return;
      const wag = Math.sin(t * 0.02 + depth * 2.1 + ang) * 0.22;
      const ex = x + Math.cos(ang + wag) * len;
      const ey = y + Math.sin(ang + wag) * len;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo((x + ex) / 2 + Math.sin(ang) * 6, (y + ey) / 2, ex, ey);
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
      ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
      if (depth === 0) {
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang);
        ctx.beginPath(); ctx.ellipse(0, 0, 2, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${a * 0.9})`; ctx.fill();
        ctx.restore();
      }
      if (depth > 0) {
        root(ex, ey, ang - 0.55, len * 0.62, depth - 1, a * 0.78, lw * 0.6);
        root(ex, ey, ang + 0.48, len * 0.58, depth - 1, a * 0.72, lw * 0.55);
        if (depth > 1) root(ex, ey, ang, len * 0.65, depth - 1, a * 0.65, lw * 0.5);
      }
    }

    [[w / 2, -Math.PI / 2], [w / 3, -Math.PI / 2.2], [w * 2 / 3, -Math.PI / 1.8],
     [w / 4, -Math.PI / 2.5], [w * 3 / 4, -Math.PI / 1.7]].forEach(([x, a], i) => {
      root(x, h * 0.75, a, (20 + i * 2) * (0.25 + hT * 0.75), 4, 0.15 + hT * 0.8, 1.8 - i * 0.1);
    });
    for (let i = 0; i < 8; i++) {
      const dx = 10 + i * (w - 20) / 7;
      const dy = h * 0.72 + Math.sin(i * 1.7) * 6;
      const da = (Math.sin(t * 0.03 + i) * 0.4 + 0.6) * (0.15 + hT * 0.45);
      ctx.beginPath(); ctx.arc(dx, dy, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${da})`; ctx.fill();
    }
  },

  // 💚 HEART — heartbeat EKG + ripple rings from beating heart
  heart(ctx, w, h, t, hT, rgb) {
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
    bg.addColorStop(0, '#010f0a'); bg.addColorStop(1, '#000503');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    const beat = (t * 0.018) % 1;
    for (let r = 0; r < 5; r++) {
      const ph = ((beat + r * 0.2) % 1);
      const rad = ph * (w * 0.48);
      ctx.beginPath(); ctx.arc(w / 2, h / 2, rad, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${(1 - ph) * (0.12 + hT * 0.38)})`;
      ctx.lineWidth = 1.2; ctx.stroke();
    }

    const hs = (10 + Math.sin(beat * Math.PI * 2) * 3 * (0.3 + hT * 0.7)) * (0.7 + hT * 0.3);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(hs / 10, hs / 10);
    ctx.beginPath(); ctx.moveTo(0, 3);
    ctx.bezierCurveTo(-10, -5, -10, -15, 0, -12);
    ctx.bezierCurveTo(10, -15, 10, -5, 0, 3);
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.55 + hT * 0.45})`; ctx.fill();
    ctx.restore();

    const ey = h * 0.82;
    ctx.beginPath(); ctx.moveTo(0, ey);
    for (let x = 0; x < w; x++) {
      const ph = (x / w + t * 0.012) % 1;
      let y = ey;
      if (ph > 0.44 && ph < 0.49) y = ey - (ph - 0.44) * 1600 * (0.25 + hT * 0.75);
      else if (ph >= 0.49 && ph < 0.51) y = ey + (ph - 0.49) * 1200 * (0.25 + hT * 0.75);
      else if (ph >= 0.51 && ph < 0.55) y = ey - (ph - 0.51) * 500 * (0.25 + hT * 0.75);
      else if (ph >= 0.55 && ph < 0.59) y = ey + (ph - 0.55) * 250 * (0.25 + hT * 0.75);
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.25 + hT * 0.5})`;
    ctx.lineWidth = 1.5; ctx.stroke();
  },

  // 🛏️ PILLOW — aurora waves, dream clouds, falling stars, Zzz
  pillow(ctx, w, h, t, hT, rgb) {
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0d0414'); bg.addColorStop(1, '#050108');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 3; i++) {
      const ay = h * 0.35 + i * 15 + Math.sin(t * 0.01 + i) * 12;
      const ag = ctx.createLinearGradient(0, ay - 18, 0, ay + 18);
      ag.addColorStop(0, 'rgba(0,0,0,0)');
      ag.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.04 + hT * 0.07 + Math.sin(t * 0.012 + i) * 0.015})`);
      ag.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ag; ctx.beginPath(); ctx.moveTo(0, ay);
      for (let x = 0; x < w; x += 3) ctx.lineTo(x, ay + Math.sin(x * 0.05 + t * 0.018 + i) * 10);
      ctx.lineTo(w, ay + 30); ctx.lineTo(0, ay + 30); ctx.fill();
    }

    [[w * 0.25, h * 0.38, 1], [w * 0.65, h * 0.28, 0.65], [w * 0.8, h * 0.5, 0.45]].forEach(([cx, cy, sc], i) => {
      const dx = Math.sin(t * 0.008 + i * 2.1) * 12 * (0.5 + hT * 0.5);
      const ca = (0.08 + hT * 0.28) * sc;
      [[-10, 0, 16], [-3, -7, 12], [7, 0, 18], [16, 4, 12]].forEach(([ox, oy, r]) => {
        const cg = ctx.createRadialGradient(cx + ox + dx, cy + oy, 0, cx + ox + dx, cy + oy, r);
        cg.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${ca * 1.3})`);
        cg.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx + ox + dx, cy + oy, r, 0, Math.PI * 2); ctx.fill();
      });
    });

    for (let i = 0; i < 7; i++) {
      const fall = ((t * 0.005 + i * 0.143) % 1);
      const sx = (i / 7) * w + Math.sin(i * 2.1) * 20;
      const sy = fall * h;
      const sa = Math.sin(fall * Math.PI) * (0.25 + hT * 0.5);
      ctx.beginPath(); ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${sa})`; ctx.fill();
      const tg = ctx.createLinearGradient(sx, sy - 15, sx, sy);
      tg.addColorStop(0, 'rgba(0,0,0,0)');
      tg.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},${sa * 0.4})`);
      ctx.beginPath(); ctx.moveTo(sx, sy - 15); ctx.lineTo(sx, sy);
      ctx.strokeStyle = tg; ctx.lineWidth = 0.8; ctx.stroke();
    }
  },

  // 🌬️ WHISPERER — wind flow lines, riding particles, central vortex
  whisperer(ctx, w, h, t, hT, rgb) {
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0a0214'); bg.addColorStop(1, '#04010a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    const lines = 9;
    for (let i = 0; i < lines; i++) {
      const oy = 10 + (i / (lines - 1)) * (h - 20);
      const sp = 0.014 + i * 0.002;
      const amp = 10 + i * 2;
      ctx.beginPath();
      for (let x = 0; x < w; x += 2) {
        const y = oy + Math.sin(x * 0.035 + t * sp + i) * amp + Math.sin(x * 0.08 + t * sp * 0.6) * amp * 0.35;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${(0.04 + hT * 0.14) * (1 - Math.abs(i - lines / 2) / (lines / 2) * 0.4)})`;
      ctx.lineWidth = 0.9; ctx.stroke();

      for (let p = 0; p < 3; p++) {
        const px = ((t * (18 + i * 5) + p * w / 3) % w);
        const py = oy + Math.sin(px * 0.035 + t * sp + i) * amp;
        const pa = (0.2 + hT * 0.65) * (Math.sin(t * 0.05 + p + i) * 0.3 + 0.7);
        const pg = ctx.createRadialGradient(px, py, 0, px, py, 3 + hT * 2);
        pg.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${pa})`);
        pg.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 3 + hT * 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    if (hT > 0.08) {
      ctx.save(); ctx.translate(w / 2, h / 2);
      for (let s = 0; s < 3; s++) {
        const rot = t * 0.025 * (s % 2 ? 1 : -1);
        ctx.save(); ctx.rotate(rot);
        ctx.beginPath(); ctx.ellipse(0, 0, 14 + s * 14, 5 + s * 3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${hT * (0.28 - s * 0.07)})`;
        ctx.lineWidth = 0.7; ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    }
  },

  // 🎥 STORY — cinema projector beam, dust motes, scrolling film strip
  story(ctx, w, h, t, hT, rgb) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#030308'; ctx.fillRect(0, 0, w, h);

    const beam = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 1.3);
    beam.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.06 + hT * 0.12})`);
    beam.addColorStop(0.4, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.03 + hT * 0.06})`);
    beam.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w, h * 0.65); ctx.lineTo(w, h); ctx.lineTo(0, h * 0.28);
    ctx.closePath(); ctx.fillStyle = beam; ctx.fill(); ctx.restore();

    for (let i = 0; i < 18; i++) {
      const mx = ((t * 0.25 + i * 17) % w);
      const my = mx * (h / w) * 0.65 + Math.sin(t * 0.02 + i) * 8;
      const ma = (Math.sin(t * 0.04 + i) * 0.5 + 0.5) * (0.12 + hT * 0.4);
      ctx.beginPath(); ctx.arc(mx, my, 1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${ma})`; ctx.fill();
    }

    const fw = 28, fh = 20, fy = h - 32;
    const frames = Math.ceil(w / fw) + 1;
    const scroll = (t * 0.4) % fw;
    for (let f = 0; f < frames; f++) {
      const fx = f * fw - scroll;
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.18 + hT * 0.4})`;
      ctx.lineWidth = 0.7; ctx.strokeRect(fx + 2, fy, fw - 4, fh);
      [7, 20].forEach(ox => {
        ctx.beginPath(); ctx.arc(fx + ox, fy - 4, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.3 + hT * 0.3})`; ctx.fill();
      });
    }

    if (hT > 0.3) {
      const fl = ctx.createRadialGradient(w * 0.1, h * 0.1, 0, w * 0.1, h * 0.1, 35);
      fl.addColorStop(0, `rgba(255,255,255,${hT * 0.35})`);
      fl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fl; ctx.fillRect(0, 0, w, h);
    }
  },

  // 🔥 HEARTH — layered flames, spiral embers, heat shimmer
  hearth(ctx, w, h, t, hT, rgb) {
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a0200'); bg.addColorStop(1, '#180400');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    const hg = ctx.createRadialGradient(w / 2, h * 0.7, 0, w / 2, h * 0.7, w * 0.55);
    hg.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.07 + hT * 0.16})`);
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, w, h);

    const flameLayers = [
      ['251,191,36', '253,224,71'],
      ['249,115,22', '251,191,36'],
      ['239,68,68', '249,115,22'],
      ['127,29,29', '185,28,28'],
    ];
    flameLayers.forEach((cols, layer) => {
      const fc = 5 + layer;
      for (let f = 0; f < fc; f++) {
        const fx = (f + 0.5) * (w / fc) + Math.sin(t * 0.03 + f + layer) * 6 * (0.5 + hT * 0.5);
        const baseY = h * (0.95 - layer * 0.07);
        const fh = (28 + Math.sin(t * 0.05 + f * 1.3 + layer) * 10 - layer * 6) * (0.28 + hT * 0.72);
        const fw = (w / fc) * 0.68;
        const wag = Math.sin(t * 0.045 + f * 1.9 + layer) * fw * 0.35;
        const fg = ctx.createLinearGradient(fx, baseY - fh, fx, baseY);
        fg.addColorStop(0, `rgba(${cols[0]},0)`);
        fg.addColorStop(0.35, `rgba(${cols[0]},${(0.6 - layer * 0.1) * (0.22 + hT * 0.78)})`);
        fg.addColorStop(1, `rgba(${cols[1]},${0.4 * (0.22 + hT * 0.78)})`);
        ctx.beginPath();
        ctx.moveTo(fx - fw / 2, baseY);
        ctx.quadraticCurveTo(fx - fw / 4 + wag, baseY - fh * 0.5, fx + wag, baseY - fh);
        ctx.quadraticCurveTo(fx + fw / 4 + wag, baseY - fh * 0.5, fx + fw / 2, baseY);
        ctx.fillStyle = fg; ctx.fill();
      }
    });

    for (let i = 0; i < 22; i++) {
      const life = ((t * 0.016 + i * 0.045) % 1);
      const ang = life * Math.PI * 4 + i * 2.5;
      const radius = life * w * 0.38;
      const ex = w / 2 + Math.cos(ang) * radius * (0.28 + hT * 0.72);
      const ey = h * 0.72 - life * (h * 0.78);
      const ea = (1 - life) * (0.55 + hT * 0.45) * 0.9;
      if (ea < 0.02) continue;
      const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 3);
      eg.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${ea})`);
      eg.addColorStop(1, 'rgba(249,115,22,0)');
      ctx.fillStyle = eg; ctx.beginPath();
      ctx.arc(ex, ey, 3 - life * 1.5, 0, Math.PI * 2); ctx.fill();
    }
  },

  // ⚒️ FORGE — hammer strike pulse, sparks with gravity, molten glow
  forge(ctx, w, h, t, hT, rgb) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#030507'; ctx.fillRect(0, 0, w, h);

    const ag = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, w * 0.55);
    ag.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.05 + hT * 0.18})`);
    ag.addColorStop(0.3, `rgba(251,146,60,${0.04 + hT * 0.12})`);
    ag.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ag; ctx.fillRect(0, 0, w, h);

    const mg = ctx.createRadialGradient(w / 2, h * 0.65, 0, w / 2, h * 0.65, 38 + hT * 18);
    mg.addColorStop(0, `rgba(251,146,60,${0.18 + hT * 0.5})`);
    mg.addColorStop(0.4, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.08 + hT * 0.18})`);
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mg; ctx.fillRect(0, 0, w, h);

    const strike = Math.pow(Math.max(0, Math.sin(t * 0.055)), 9);
    if (strike > 0.01) {
      const sg = ctx.createRadialGradient(w / 2, h * 0.65, 0, w / 2, h * 0.65, 55 * strike);
      sg.addColorStop(0, `rgba(255,255,255,${strike * 0.85})`);
      sg.addColorStop(0.3, `rgba(251,191,36,${strike * 0.5})`);
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
    }

    for (let i = 0; i < 28; i++) {
      const sA = (i / 28) * Math.PI * 2;
      const sS = 1 + Math.sin(i * 2.3) * 0.5;
      const life = ((t * 0.038 + i * 0.036) % 1);
      const grav = life * life * 55;
      const sx = w / 2 + Math.cos(sA) * (life * 62 + hT * 18) * sS * (0.38 + hT * 0.62);
      const sy = h * 0.65 + Math.sin(sA) * (life * 45) * sS - life * 35 + grav;
      const sa = (1 - life) * (strike * 0.8 + hT * 0.55 + 0.08) * 0.9;
      if (sa < 0.02) continue;
      const sc = life < 0.3 ? '255,250,180' : life < 0.6 ? '251,191,36' : `${rgb.r},${rgb.g},${rgb.b}`;
      ctx.beginPath(); ctx.arc(sx, sy, 1.5 - life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${sc},${sa})`; ctx.fill();
      const tx = sx - Math.cos(sA) * 7, ty = sy - Math.sin(sA) * 7 + grav * 0.3;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(sx, sy);
      ctx.strokeStyle = `rgba(${sc},${sa * 0.4})`; ctx.lineWidth = 0.8; ctx.stroke();
    }
  },

  // 🚗 WHEEL — speed lines, vanishing point road, motion blur rush
  wheel(ctx, w, h, t, hT, rgb) {
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, w, 0);
    bg.addColorStop(0, '#000d14'); bg.addColorStop(1, '#010a10');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    const vx = w * 0.5, vy = h * 0.5;
    [[0.33, 0.67], [0.41, 0.59], [0.47, 0.53]].forEach(([l, r], i) => {
      ctx.beginPath(); ctx.moveTo(l * w, h); ctx.lineTo(vx, vy); ctx.lineTo(r * w, h);
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${(0.06 + hT * 0.1) * (1 - i * 0.2)})`;
      ctx.lineWidth = 1; ctx.stroke();
    });

    const lc = 22;
    for (let i = 0; i < lc; i++) {
      const ly = 12 + (i / (lc - 1)) * (h - 24);
      const sp = (1 + Math.sin(i * 1.7) * 0.4) * (0.7 + hT * 2.8);
      const lx = w - ((t * sp * 2.5 + i * w / lc) % w);
      const len = (25 + Math.sin(i * 2.3) * 15) * (0.28 + hT * 0.72);
      const la = (0.07 + hT * 0.32) * (1 - Math.abs(ly - h / 2) / (h / 2) * 0.45);
      const lg = ctx.createLinearGradient(lx, ly, lx + len, ly);
      lg.addColorStop(0, 'rgba(0,0,0,0)');
      lg.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},${la})`);
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + len, ly);
      ctx.strokeStyle = lg; ctx.lineWidth = 1 + Math.sin(i) * 0.4; ctx.stroke();
    }

    for (let i = 0; i < 14; i++) {
      const py = h * 0.3 + Math.sin(i * 2.1) * h * 0.35;
      const px = w - ((t * (2.5 + i * 0.3) * 2 + i * 55) % w);
      const pa = (0.28 + hT * 0.62) * (Math.sin(t * 0.04 + i) * 0.3 + 0.7);
      const pg = ctx.createRadialGradient(px, py, 0, px, py, 4);
      pg.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${pa})`);
      pg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    }

    if (hT > 0.2) {
      const hl = ctx.createRadialGradient(w * 0.82, h / 2, 0, w * 0.82, h / 2, w * 0.38);
      hl.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${hT * 0.16})`);
      hl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hl; ctx.fillRect(0, 0, w, h);
    }
  },
};

// ─── BUTTON ANIMATIONS ────────────────────────────────────────────────────────

export const BUTTON_ANIMATIONS = {

  // ▶ PLAY — frequency mirror visualiser
  play(ctx, w, h, t, hT, isPlaying) {
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#000d14'); bg.addColorStop(1, '#000508');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    const bars = 48, cx = w / 2, cy = h / 2;
    const active = isPlaying ? 1 : hT;
    const breathe = Math.sin(t * 0.03) * 0.3 + 0.7;

    for (let i = 0; i < bars; i++) {
      const x = cx + (i - bars / 2) * ((w * 0.9) / bars);
      const freq = Math.sin(t * 0.08 + i * 0.4) * Math.sin(t * 0.05 + i * 0.2) * Math.cos(t * 0.03 + i * 0.1);
      const barH = (20 + freq * 35 + Math.sin(t * 0.12 + i * 0.6) * 15) * (0.3 + active * 0.7) * breathe;
      const alpha = (0.4 + Math.abs(freq) * 0.6) * (0.3 + active * 0.7);
      const dist = Math.abs(i - bars / 2) / (bars / 2);
      const r = Math.floor(6 + dist * 120), g = Math.floor(182 - dist * 100), b = Math.floor(212 + dist * 43);
      const tg = ctx.createLinearGradient(x, cy - barH, x, cy);
      tg.addColorStop(0, `rgba(${r},${g},${b},0)`);
      tg.addColorStop(0.3, `rgba(${r},${g},${b},${alpha})`);
      tg.addColorStop(1, `rgba(${r},${g},${b},${alpha * 0.4})`);
      ctx.fillStyle = tg; ctx.fillRect(x - 1.5, cy - barH, 3, barH);
      const bg2 = ctx.createLinearGradient(x, cy, x, cy + barH);
      bg2.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.4})`);
      bg2.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = bg2; ctx.fillRect(x - 1.5, cy, 3, barH * 0.6);
    }
    ctx.beginPath(); ctx.moveTo(cx - w * 0.45, cy); ctx.lineTo(cx + w * 0.45, cy);
    ctx.strokeStyle = `rgba(6,182,212,${0.15 + hT * 0.25})`; ctx.lineWidth = 0.5; ctx.stroke();

    if (active < 0.5 && !isPlaying) {
      const pa = 1 - active * 2;
      ctx.beginPath(); ctx.moveTo(cx - 8, cy - 10); ctx.lineTo(cx + 12, cy); ctx.lineTo(cx - 8, cy + 10);
      ctx.closePath(); ctx.fillStyle = `rgba(6,182,212,${pa * 0.7})`; ctx.fill();
    }
  },

  // 🚪 ENTER — darkness walks into sunrise
  enter(ctx, w, h, t, hT) {
    ctx.clearRect(0, 0, w, h);
    const dawnT = 0.15 + hT * 0.85;
    const nR = Math.floor(4 * (1 - dawnT) + 255 * dawnT * 0.8);
    const nG = Math.floor(6 * (1 - dawnT) + 160 * dawnT * 0.5);
    const nB = Math.floor(14 * (1 - dawnT) + 60 * dawnT * 0.2);
    const skyTop = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    skyTop.addColorStop(0, `rgb(${Math.floor(nR * 0.3)},${Math.floor(nG * 0.3)},${Math.floor(nB * 0.5)})`);
    skyTop.addColorStop(1, `rgb(${nR},${nG},${nB})`);
    ctx.fillStyle = skyTop; ctx.fillRect(0, 0, w, h * 0.65);
    const ground = ctx.createLinearGradient(0, h * 0.65, 0, h);
    ground.addColorStop(0, `rgba(30,${Math.floor(15 + hT * 30)},5,1)`);
    ground.addColorStop(1, 'rgba(10,8,2,1)');
    ctx.fillStyle = ground; ctx.fillRect(0, h * 0.65, w, h * 0.35);
    const sunY = h * 0.65 - hT * h * 0.35;
    const sunG = ctx.createRadialGradient(w / 2, sunY, 0, w / 2, sunY, (12 + hT * 22) * 3);
    sunG.addColorStop(0, `rgba(255,255,200,${hT * 0.95})`);
    sunG.addColorStop(0.2, `rgba(255,200,80,${hT * 0.7})`);
    sunG.addColorStop(0.5, `rgba(249,115,22,${hT * 0.4})`);
    sunG.addColorStop(1, 'rgba(249,115,22,0)');
    ctx.fillStyle = sunG; ctx.fillRect(0, 0, w, h);
    const hg = ctx.createLinearGradient(0, h * 0.55, 0, h * 0.75);
    hg.addColorStop(0, 'rgba(0,0,0,0)');
    hg.addColorStop(0.4, `rgba(249,115,22,${0.08 + hT * 0.35})`);
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, w, h);
    const pathA = 0.08 + hT * 0.3;
    ctx.beginPath(); ctx.moveTo(w / 2 - 3, h); ctx.lineTo(w / 2, h * 0.65); ctx.lineTo(w / 2 + 3, h);
    ctx.closePath(); ctx.fillStyle = `rgba(255,220,100,${pathA})`; ctx.fill();
    if (hT < 0.8) {
      for (let i = 0; i < 20; i++) {
        const sx = (Math.sin(i * 2.39) * 0.5 + 0.5) * w;
        const sy = (Math.cos(i * 1.73) * 0.5 + 0.5) * h * 0.6;
        const sa = (1 - hT * 1.2) * (Math.sin(t * 0.04 + i) * 0.3 + 0.5) * 0.6;
        if (sa < 0) continue;
        ctx.beginPath(); ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${sa})`; ctx.fill();
      }
    }
    if (hT > 0.6) {
      for (let b = 0; b < 5; b++) {
        const bx = w * 0.2 + b * w * 0.15 + Math.sin(t * 0.02 + b) * 8;
        const by = h * 0.4 - b * 4;
        const ba = (hT - 0.6) / 0.4;
        ctx.beginPath(); ctx.moveTo(bx - 6, by); ctx.quadraticCurveTo(bx - 3, by - 3, bx, by);
        ctx.quadraticCurveTo(bx + 3, by - 3, bx + 6, by);
        ctx.strokeStyle = `rgba(255,180,60,${ba * 0.7})`; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  },

  // 🔴 LIVE — slow breathing inhale/exhale
  live(ctx, w, h, t, hT) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#080002'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const inhale = Math.sin(t * 0.022) * 0.5 + 0.5;
    for (let ring = 0; ring < 5; ring++) {
      const r = 20 + ring * 18 + inhale * (12 + ring * 8) * (0.4 + hT * 0.6);
      const a = (1 - ring / 5) * (0.06 + inhale * 0.12 + hT * 0.15);
      const rg = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
      rg.addColorStop(0, `rgba(239,68,68,${a})`); rg.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    }
    const pPhase = ((t * 0.022 / Math.PI) % 1);
    const pR = pPhase * (w * 0.45);
    ctx.beginPath(); ctx.arc(cx, cy, pR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(239,68,68,${(1 - pPhase) * (0.3 + hT * 0.4)})`;
    ctx.lineWidth = 1.5; ctx.stroke();
    const coreR = 8 + inhale * 6 * (0.5 + hT * 0.5);
    const coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
    coreG.addColorStop(0, `rgba(255,255,255,${0.7 + inhale * 0.3})`);
    coreG.addColorStop(0.3, `rgba(239,68,68,${0.8 + inhale * 0.2})`);
    coreG.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.fillStyle = coreG; ctx.beginPath(); ctx.arc(cx, cy, coreR * 2, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 25 + inhale * 25 * (0.5 + hT * 0.5);
      ctx.beginPath(); ctx.arc(cx + Math.cos(angle + t * 0.01) * dist, cy + Math.sin(angle + t * 0.01) * dist, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,120,120,${inhale * (0.3 + hT * 0.5)})`; ctx.fill();
    }
  },

  // 📤 SHARE — seed travels outward, constellation forms
  share(ctx, w, h, t, hT) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#060310'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12 + hT * 8);
    cg.addColorStop(0, `rgba(167,139,250,${0.8 + hT * 0.2})`);
    cg.addColorStop(0.5, `rgba(139,92,246,${0.5 + hT * 0.3})`);
    cg.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 12 + hT * 8, 0, Math.PI * 2); ctx.fill();
    const nodes = [
      { x: w * 0.12, y: h * 0.2 }, { x: w * 0.82, y: h * 0.15 }, { x: w * 0.88, y: h * 0.6 },
      { x: w * 0.55, y: h * 0.85 }, { x: w * 0.08, y: h * 0.7 }, { x: w * 0.35, y: h * 0.12 }, { x: w * 0.72, y: h * 0.82 },
    ];
    const travel = (t * 0.01) % 1;
    nodes.forEach((n, i) => {
      const delay = i * 0.12;
      const localT = Math.max(0, Math.min(1, (travel - delay) * 2));
      const arrived = 0.2 + hT * 0.8;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y);
      ctx.strokeStyle = `rgba(139,92,246,${localT * arrived * 0.25})`;
      ctx.lineWidth = 0.7; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
      if (localT < 1) {
        const tx = cx + (n.x - cx) * localT, ty = cy + (n.y - cy) * localT;
        const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 4);
        tg.addColorStop(0, `rgba(200,180,255,${arrived * 0.9})`);
        tg.addColorStop(1, 'rgba(139,92,246,0)');
        ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(tx, ty, 4, 0, Math.PI * 2); ctx.fill();
      }
      const na = arrived * (0.4 + Math.sin(t * 0.04 + i) * 0.2);
      const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 8 + hT * 4);
      ng.addColorStop(0, `rgba(167,139,250,${na})`); ng.addColorStop(1, 'rgba(139,92,246,0)');
      ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(n.x, n.y, 8 + hT * 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,180,255,${na * 1.5})`; ctx.fill();
    });
  },

  // 🌿 STEP INTO ORCHARD — gate swings open into golden light
  stepInto(ctx, w, h, t, hT) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#030a04'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    if (hT > 0.05) {
      const lg = ctx.createRadialGradient(cx, h / 2, 0, cx, h / 2, w * 0.4 * hT);
      lg.addColorStop(0, `rgba(255,240,180,${hT * 0.5})`);
      lg.addColorStop(0.3, `rgba(180,255,150,${hT * 0.25})`);
      lg.addColorStop(0.6, `rgba(234,179,8,${hT * 0.1})`);
      lg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);
    }
    const gateY = h * 0.18, gateH = h * 0.6, gateW = Math.min(w * 0.38, 48);
    const postColor = 'rgba(34,197,94,0.7)';
    ctx.fillStyle = postColor;
    ctx.fillRect(cx - gateW - 8, gateY, 6, gateH);
    ctx.fillRect(cx + gateW + 2, gateY, 6, gateH);
    const openAngle = hT * Math.PI * 0.48;
    // Left gate leaf
    ctx.save(); ctx.translate(cx - gateW, gateY + gateH / 2); ctx.rotate(openAngle);
    const lgc = ctx.createLinearGradient(-gateW, 0, 0, 0);
    lgc.addColorStop(0, `rgba(15,80,25,${0.8 - hT * 0.3})`);
    lgc.addColorStop(1, `rgba(34,197,94,${0.6 - hT * 0.2})`);
    ctx.fillStyle = lgc; ctx.fillRect(-gateW, -gateH / 2, gateW, gateH);
    for (let p = 0; p < 4; p++) {
      ctx.beginPath(); ctx.moveTo(-gateW, -gateH / 2 + p * (gateH / 4));
      ctx.lineTo(0, -gateH / 2 + p * (gateH / 4));
      ctx.strokeStyle = 'rgba(34,197,94,0.3)'; ctx.lineWidth = 0.5; ctx.stroke();
    }
    ctx.restore();
    // Right gate leaf
    ctx.save(); ctx.translate(cx + gateW, gateY + gateH / 2); ctx.rotate(-openAngle);
    const rgc = ctx.createLinearGradient(0, 0, gateW, 0);
    rgc.addColorStop(0, `rgba(34,197,94,${0.6 - hT * 0.2})`);
    rgc.addColorStop(1, `rgba(15,80,25,${0.8 - hT * 0.3})`);
    ctx.fillStyle = rgc; ctx.fillRect(0, -gateH / 2, gateW, gateH);
    for (let p = 0; p < 4; p++) {
      ctx.beginPath(); ctx.moveTo(0, -gateH / 2 + p * (gateH / 4));
      ctx.lineTo(gateW, -gateH / 2 + p * (gateH / 4));
      ctx.strokeStyle = 'rgba(34,197,94,0.3)'; ctx.lineWidth = 0.5; ctx.stroke();
    }
    ctx.restore();
    if (hT > 0.3) {
      for (let i = 0; i < 12; i++) {
        const life = ((t * 0.008 + i * 0.083) % 1);
        const px = cx + (Math.sin(i * 2.3) * 25) * life + Math.sin(t * 0.02 + i) * 12;
        const py = gateY + gateH * 0.2 + life * gateH * 0.55 + Math.sin(t * 0.03 + i) * 8;
        const pa = ((hT - 0.3) / 0.7) * Math.sin(life * Math.PI) * 0.8;
        ctx.save(); ctx.translate(px, py); ctx.rotate(t * 0.02 + i);
        ctx.beginPath(); ctx.ellipse(0, 0, 3, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,255,160,${pa})`; ctx.fill(); ctx.restore();
      }
    }
    ctx.beginPath(); ctx.moveTo(cx - 3, h); ctx.lineTo(cx - 1, gateY + gateH);
    ctx.lineTo(cx + 1, gateY + gateH); ctx.lineTo(cx + 3, h); ctx.closePath();
    ctx.fillStyle = `rgba(255,240,150,${hT * 0.4})`; ctx.fill();
  },
};

// ─── SEEDFLOW ANIMATION ───────────────────────────────────────────────────────
// Draw the thin SeedFlow strip — call this in your SeedFlow canvas loop
export function drawSeedFlow(ctx, w, h, seeds) {
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, 'rgba(255,255,255,0.008)');
  bg.addColorStop(0.5, 'rgba(255,255,255,0.025)');
  bg.addColorStop(1, 'rgba(255,255,255,0.008)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  seeds.forEach(s => {
    s.x += s.speed;
    s.wobble += s.wobbleSpeed;
    if (s.speed > 0 && s.x > w + 20) s.x = -20;
    if (s.speed < 0 && s.x < -20) s.x = w + 20;
    const wy = s.y + Math.sin(s.wobble) * 3;
    const edgeFade = Math.min(1, Math.min(s.x / 60, (w - s.x) / 60));
    const alpha = s.opacity * Math.max(0, edgeFade);
    if (alpha < 0.01) return;

    if (s.type === 'seed') {
      ctx.beginPath();
      ctx.ellipse(s.x, wy, s.size * 0.7, s.size * 1.4, s.speed > 0 ? -0.4 : 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(234,179,8,${alpha})`; ctx.fill();
      const tg = ctx.createLinearGradient(s.x, wy, s.x + (s.speed > 0 ? -1 : 1) * 12, wy);
      tg.addColorStop(0, `rgba(234,179,8,${alpha * 0.5})`);
      tg.addColorStop(1, 'rgba(234,179,8,0)');
      ctx.beginPath(); ctx.moveTo(s.x, wy);
      ctx.lineTo(s.x + (s.speed > 0 ? -1 : 1) * 12, wy + Math.sin(s.wobble) * 2);
      ctx.strokeStyle = tg; ctx.lineWidth = 0.8; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(s.x, wy, s.size * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`; ctx.fill();
      for (let r = 0; r < 5; r++) {
        const ra = (r / 5) * Math.PI * 2;
        const rl = s.size * 2.5;
        ctx.beginPath(); ctx.moveTo(s.x, wy);
        ctx.lineTo(s.x + Math.cos(ra) * rl, wy + Math.sin(ra) * rl);
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.35})`; ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
  });
}

// Create initial seed data for SeedFlow
export function createSeeds(count = 30) {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * 2000,
    y: 4 + Math.random() * 32,
    size: 1.2 + Math.random() * 2.2,
    speed: (0.25 + Math.random() * 0.55) * (i % 2 === 0 ? 1 : -1),
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.02 + 0.008,
    opacity: 0.18 + Math.random() * 0.42,
    type: Math.random() > 0.4 ? 'seed' : 'wisp',
  }));
}

