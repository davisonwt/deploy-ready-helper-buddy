/**
 * RoleButton.jsx
 * S2G — Living Wandering Role Button
 * Drop into: src/components/RoleButton.jsx
 *
 * Usage:
 *   import RoleButton from './RoleButton';
 *   <RoleButton role="field" onClick={() => {}} selected={false} />
 *
 * Props:
 *   role        — one of the 9 role keys (see ROLE_CONFIG below)
 *   selected    — boolean, highlights the button
 *   onClick     — click handler
 *   showBubbles — boolean (default true), shows the 4 action bubbles on hover
 *   onBubble    — callback(action) when a bubble is clicked
 *                 action is one of: 'view' | 'share' | 'message' | 'favourite'
 *   size        — 'sm' | 'md' | 'lg' (default 'md')
 *   className   — extra CSS classes
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { ROLE_ANIMATIONS, hexToRgb } from '../hooks/useElementAnimation';

// ─── Role config ──────────────────────────────────────────────────────────────
export const ROLE_CONFIG = {
  field:     { name: 'Field',     emoji: '🌾', color: '#eab308', animKey: 'field'     },
  hand:      { name: 'Hand',      emoji: '🤲', color: '#22c55e', animKey: 'hand'      },
  heart:     { name: 'Heart',     emoji: '💚', color: '#10b981', animKey: 'heart'     },
  pillow:    { name: 'Pillow',    emoji: '🛏️', color: '#ec4899', animKey: 'pillow'    },
  whisperer: { name: 'Whisperer', emoji: '🌬️', color: '#a855f7', animKey: 'whisperer' },
  story:     { name: 'Story',     emoji: '🎥', color: '#6366f1', animKey: 'story'     },
  hearth:    { name: 'Hearth',    emoji: '🔥', color: '#f97316', animKey: 'hearth'    },
  forge:     { name: 'Forge',     emoji: '⚒️', color: '#94a3b8', animKey: 'forge'     },
  wheel:     { name: 'Wheel',     emoji: '🚗', color: '#06b6d4', animKey: 'wheel'     },
};

const BUBBLE_CONFIG = [
  { key: 'view',      emoji: '🌱', label: 'View'      },
  { key: 'share',     emoji: '📤', label: 'Share'     },
  { key: 'message',   emoji: '💬', label: 'Message'   },
  { key: 'favourite', emoji: '⭐', label: 'Favourite' },
];

const SIZE_MAP = {
  sm: { height: 72,  fontSize: 18, labelSize: 8  },
  md: { height: 90,  fontSize: 22, labelSize: 9  },
  lg: { height: 110, fontSize: 26, labelSize: 10 },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function RoleButton({
  role = 'field',
  selected = false,
  onClick,
  showBubbles = true,
  onBubble,
  size = 'md',
  className = '',
}) {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.field;
  const rgb = hexToRgb(config.color);
  const sizeConfig = SIZE_MAP[size];

  const canvasRef = useRef(null);
  const frameRef  = useRef(0);
  const hoverRef  = useRef(0);
  const hoveredRef = useRef(false);
  const rafRef    = useRef(null);

  const [isHovered, setIsHovered] = useState(false);
  const [bubblesVisible, setBubblesVisible] = useState(false);

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = canvas.offsetWidth  || 120;
      canvas.height = canvas.offsetHeight || sizeConfig.height;
    }
    resize();

    function loop() {
      frameRef.current++;
      const target = hoveredRef.current ? 1 : 0;
      hoverRef.current += (target - hoverRef.current) * 0.07;

      if (canvas.width !== canvas.offsetWidth && canvas.offsetWidth > 0) resize();

      const animFn = ROLE_ANIMATIONS[config.animKey];
      if (animFn) {
        animFn(ctx, canvas.width, canvas.height, frameRef.current, hoverRef.current, rgb);
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseEnter = useCallback(() => {
    hoveredRef.current = true;
    setIsHovered(true);
    setBubblesVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = false;
    setIsHovered(false);
    // Delay hiding so bubbles can animate out
    setTimeout(() => setBubblesVisible(false), 350);
  }, []);

  const handleBubbleClick = useCallback((e, key) => {
    e.stopPropagation();
    onBubble?.(key, role);
  }, [onBubble, role]);

  const borderColor = selected
    ? config.color + 'aa'
    : isHovered
      ? config.color + '55'
      : config.color + '18';

  const boxShadow = selected
    ? `0 0 0 2px ${config.color}44, 0 8px 32px ${config.color}30`
    : isHovered
      ? `0 8px 30px ${config.color}28`
      : 'none';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={() => { hoveredRef.current = true; setIsHovered(true); setBubblesVisible(true); }}
        onTouchEnd={() => { setTimeout(() => { hoveredRef.current = false; setIsHovered(false); setBubblesVisible(false); }, 1800); }}
        className={className}
        style={{
          position: 'relative',
          width: '100%',
          height: sizeConfig.height,
          borderRadius: 18,
          border: `1px solid ${borderColor}`,
          background: isHovered || selected
            ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.06)`
            : 'rgba(255,255,255,0.02)',
          cursor: 'pointer',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), border-color 0.4s, box-shadow 0.4s',
          transform: isHovered ? 'translateY(-5px) scale(1.05)' : 'none',
          boxShadow,
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          padding: 0,
        }}
      >
        {/* Living canvas background */}
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

        {/* Emoji */}
        <span style={{
          fontSize: sizeConfig.fontSize,
          position: 'relative',
          zIndex: 2,
          lineHeight: 1,
          filter: isHovered ? `drop-shadow(0 0 8px ${config.color}88)` : 'none',
          transition: 'filter 0.3s',
        }}>
          {config.emoji}
        </span>

        {/* Label */}
        <span style={{
          fontSize: sizeConfig.labelSize,
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontWeight: 600,
          color: config.color,
          position: 'relative',
          zIndex: 2,
          fontFamily: 'inherit',
        }}>
          {config.name}
        </span>
      </button>

      {/* Action bubbles — orbit around button on hover */}
      {showBubbles && bubblesVisible && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 0,
          height: 0,
          pointerEvents: 'none',
          zIndex: 200,
        }}>
          {BUBBLE_CONFIG.map((bubble, i) => {
            const positions = [
              { x: -54, y: -50 },
              { x: 14,  y: -50 },
              { x: -54, y: 14  },
              { x: 14,  y: 14  },
            ];
            const pos = positions[i];
            return (
              <button
                key={bubble.key}
                onClick={(e) => handleBubbleClick(e, bubble.key)}
                title={bubble.label}
                style={{
                  position: 'absolute',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(6,9,20,0.92)',
                  border: `1px solid ${config.color}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  cursor: 'pointer',
                  pointerEvents: isHovered ? 'all' : 'none',
                  opacity: isHovered ? 1 : 0,
                  transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${isHovered ? 1 : 0})`,
                  transition: `opacity 0.3s, transform 0.45s cubic-bezier(0.34,1.56,0.64,1)`,
                  transitionDelay: `${i * 0.05}s`,
                  boxShadow: `0 0 12px ${config.color}33`,
                  outline: 'none',
                  padding: 0,
                  zIndex: 200,
                }}
              >
                {bubble.emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
