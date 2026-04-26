/**
 * LivingButton.jsx
 * S2G — Living Button for all special button types
 * Drop into: src/components/LivingButton.jsx
 *
 * Usage:
 *   import LivingButton from './LivingButton';
 *
 *   <LivingButton variant="live"    onClick={...}>🔴 Go Live</LivingButton>
 *   <LivingButton variant="play"    onClick={...} isPlaying={false}>▶ Play</LivingButton>
 *   <LivingButton variant="enter"   onClick={...}>Enter Orchard</LivingButton>
 *   <LivingButton variant="share"   onClick={...}>Share</LivingButton>
 *   <LivingButton variant="stepInto" onClick={...}>Step Into the Orchard</LivingButton>
 *
 * Variants:
 *   play     — frequency mirror visualiser, transitions from play icon to live bars
 *   enter    — darkness walks into sunrise (for Join / Enter / Login buttons)
 *   live     — slow breathing inhale/exhale (for Go Live buttons)
 *   share    — seed travels to constellation of receivers
 *   stepInto — gate swings open into golden orchard light
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { BUTTON_ANIMATIONS } from '../hooks/useElementAnimation';

// ─── Variant config ───────────────────────────────────────────────────────────
const VARIANT_CONFIG = {
  play: {
    color: '#06b6d4',
    borderIdle:  'rgba(6,182,212,0.15)',
    borderHover: 'rgba(6,182,212,0.45)',
    bgIdle:      'rgba(6,182,212,0.03)',
    bgHover:     'rgba(6,182,212,0.08)',
    glow:        'rgba(6,182,212,0.2)',
    defaultHeight: 48,
  },
  enter: {
    color: '#f97316',
    borderIdle:  'rgba(249,115,22,0.15)',
    borderHover: 'rgba(249,115,22,0.5)',
    bgIdle:      'rgba(249,115,22,0.03)',
    bgHover:     'rgba(249,115,22,0.08)',
    glow:        'rgba(249,115,22,0.25)',
    defaultHeight: 56,
  },
  live: {
    color: '#ef4444',
    borderIdle:  'rgba(239,68,68,0.2)',
    borderHover: 'rgba(239,68,68,0.55)',
    bgIdle:      'rgba(239,68,68,0.05)',
    bgHover:     'rgba(239,68,68,0.1)',
    glow:        'rgba(239,68,68,0.2)',
    defaultHeight: 52,
  },
  share: {
    color: '#8b5cf6',
    borderIdle:  'rgba(139,92,246,0.15)',
    borderHover: 'rgba(139,92,246,0.45)',
    bgIdle:      'rgba(139,92,246,0.03)',
    bgHover:     'rgba(139,92,246,0.08)',
    glow:        'rgba(139,92,246,0.2)',
    defaultHeight: 48,
  },
  stepInto: {
    color: '#22c55e',
    borderIdle:  'rgba(34,197,94,0.15)',
    borderHover: 'rgba(34,197,94,0.5)',
    bgIdle:      'rgba(34,197,94,0.03)',
    bgHover:     'rgba(34,197,94,0.1)',
    glow:        'rgba(34,197,94,0.25)',
    defaultHeight: 60,
  },
};

// ─── Pulse dot (for Live button) ─────────────────────────────────────────────
function PulseDot({ color }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 9,
      height: 9,
      borderRadius: '50%',
      background: color,
      boxShadow: `0 0 0 0 ${color}80`,
      animation: 'pulseDot 1.5s ease infinite',
      flexShrink: 0,
    }} />
  );
}

// Inject pulse keyframes once
if (typeof document !== 'undefined' && !document.getElementById('s2g-pulse-style')) {
  const style = document.createElement('style');
  style.id = 's2g-pulse-style';
  style.textContent = `
    @keyframes pulseDot {
      0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }
      70%  { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
      100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
    }
  `;
  document.head.appendChild(style);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LivingButton({
  variant = 'live',
  children,
  onClick,
  isPlaying = false,    // only relevant for 'play' variant
  disabled = false,
  height,               // override default height
  borderRadius = 14,
  fontSize = 12,
  letterSpacing = '3px',
  fontWeight = 700,
  style: extraStyle = {},
  className = '',
}) {
  const config = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.live;
  const canvasRef  = useRef(null);
  const frameRef   = useRef(0);
  const hoverRef   = useRef(0);
  const hoveredRef = useRef(false);
  const rafRef     = useRef(null);

  const [isHovered, setIsHovered] = useState(false);

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = canvas.offsetWidth  || 300;
      canvas.height = canvas.offsetHeight || (height ?? config.defaultHeight);
    }
    resize();

    function loop() {
      frameRef.current++;
      const target = hoveredRef.current ? 1 : 0;
      hoverRef.current += (target - hoverRef.current) * 0.07;
      if (canvas.width !== canvas.offsetWidth && canvas.offsetWidth > 0) resize();

      const f = frameRef.current;
      const hT = hoverRef.current;
      const w = canvas.width;
      const h = canvas.height;

      switch (variant) {
        case 'play':     BUTTON_ANIMATIONS.play(ctx, w, h, f, hT, isPlaying); break;
        case 'enter':    BUTTON_ANIMATIONS.enter(ctx, w, h, f, hT); break;
        case 'live':     BUTTON_ANIMATIONS.live(ctx, w, h, f, hT); break;
        case 'share':    BUTTON_ANIMATIONS.share(ctx, w, h, f, hT); break;
        case 'stepInto': BUTTON_ANIMATIONS.stepInto(ctx, w, h, f, hT); break;
        default: break;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [variant, isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    hoveredRef.current = true;
    setIsHovered(true);
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = false;
    setIsHovered(false);
  }, []);

  const btnHeight = height ?? config.defaultHeight;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={() => { if (!disabled) { hoveredRef.current = true; setIsHovered(true); } }}
      onTouchEnd={() => { setTimeout(() => { hoveredRef.current = false; setIsHovered(false); }, 1600); }}
      disabled={disabled}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: btnHeight,
        borderRadius,
        border: `1px solid ${isHovered ? config.borderHover : config.borderIdle}`,
        background: isHovered ? config.bgHover : config.bgIdle,
        cursor: disabled ? 'not-allowed' : 'pointer',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        fontSize,
        fontWeight,
        letterSpacing,
        textTransform: 'uppercase',
        color: disabled ? 'rgba(255,255,255,0.3)' : config.color,
        fontFamily: 'inherit',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), border-color 0.4s, box-shadow 0.4s',
        transform: isHovered && !disabled ? 'scale(1.02) translateY(-2px)' : 'none',
        boxShadow: isHovered && !disabled ? `0 8px 28px ${config.glow}` : 'none',
        outline: 'none',
        opacity: disabled ? 0.5 : 1,
        WebkitTapHighlightColor: 'transparent',
        ...extraStyle,
      }}
    >
      {/* Living canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* Button content — sits above canvas */}
      <span style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
      }}>
        {variant === 'live' && <PulseDot color={config.color} />}
        {children}
      </span>
    </button>
  );
}

