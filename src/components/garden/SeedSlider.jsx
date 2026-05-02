// src/components/garden/SeedSlider.jsx
// Reusable auto-rotating slider for ONE category (Seeds, Orchards, Music, Books, Videos).
// Each card carries Play (inline preview), Open (full page), Go Live (every card),
// and a ⋯ owner menu (Edit · Delete · Repost · Park) when the seed is the user's own.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LivingSeedCard from './LivingSeedCard'

/**
 * card shape:
 * {
 *   id, title, subtitle, image, badge: { emoji, label, color },
 *   playPath, openPath, liveKey,
 *   mine: boolean,
 *   onEdit?, onDelete?, onRepost?, onPark?,
 *   mediaUrl?: string,        // if music/video — used for inline preview
 *   mediaKind?: 'audio'|'video'|'book'|'orchard'|'seed'
 * }
 */
export default function SeedSlider({
  title,
  emoji,
  accent = '#22c55e',
  cards,
  emptyHint,
  intervalMs = 6000,
}) {
  const navigate = useNavigate()
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const audioRef = useRef(null)
  const videoRef = useRef(null)

  const total = cards.length
  const safeIdx = total ? idx % total : 0
  const active = cards[safeIdx]

  // auto-rotate
  useEffect(() => {
    if (!total || paused || previewing) return
    const t = setInterval(() => setIdx((i) => (i + 1) % total), intervalMs)
    return () => clearInterval(t)
  }, [total, paused, previewing, intervalMs])

  // stop preview when slide changes
  useEffect(() => {
    setPreviewing(false)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0 }
  }, [safeIdx])

  if (!total) {
    return (
      <section style={styles.wrap(accent)}>
        <header style={styles.header}>
          <div style={styles.titleRow}>
            <span style={styles.titleEmoji}>{emoji}</span>
            <h3 style={styles.title}>{title}</h3>
          </div>
          <span style={styles.count}>0</span>
        </header>
        <div style={styles.empty}>{emptyHint || 'Nothing planted here yet.'}</div>
      </section>
    )
  }

  const goLive = (card) => {
    // Go-live URL convention: /grove-station?seed={liveKey}
    navigate(`/grove-station?seed=${encodeURIComponent(card.liveKey || card.id)}`)
  }

  const handlePlay = () => {
    if (previewing) {
      audioRef.current?.pause()
      videoRef.current?.pause()
      setPreviewing(false)
      return
    }
    if (active.mediaKind === 'audio' && active.mediaUrl) {
      setPreviewing(true)
      setTimeout(() => audioRef.current?.play().catch(() => {}), 0)
    } else if (active.mediaKind === 'video' && active.mediaUrl) {
      setPreviewing(true)
      setTimeout(() => videoRef.current?.play().catch(() => {}), 0)
    } else {
      // Books / orchards / generic seeds — no inline media → just open
      navigate(active.openPath)
    }
  }

  return (
    <section
      style={styles.wrap(accent)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <header style={styles.header}>
        <div style={styles.titleRow}>
          <span style={styles.titleEmoji}>{emoji}</span>
          <h3 style={styles.title}>{title}</h3>
        </div>
        <span style={styles.count}>{safeIdx + 1}/{total}</span>
      </header>

      <div style={styles.card(accent)}>
        <img src={active.image} alt="" style={styles.img} />
        <div style={styles.overlay(accent)} />

        {/* Inline preview overlays */}
        {previewing && active.mediaKind === 'video' && active.mediaUrl && (
          <video
            ref={videoRef}
            src={active.mediaUrl}
            controls
            muted={false}
            style={styles.previewVideo}
            onEnded={() => setPreviewing(false)}
          />
        )}
        {previewing && active.mediaKind === 'audio' && active.mediaUrl && (
          <div style={styles.audioBar}>
            <audio
              ref={audioRef}
              src={active.mediaUrl}
              controls
              style={{ width: '100%' }}
              onEnded={() => setPreviewing(false)}
            />
          </div>
        )}

        {/* Top-left badge */}
        {active.badge && (
          <div style={styles.badge(active.badge.color)}>
            <span>{active.badge.emoji}</span>
            <span>{active.badge.label}</span>
          </div>
        )}

        {/* Owner ⋯ menu */}
        {active.mine && (
          <div style={styles.menuWrap}>
            <button
              type="button"
              onClick={() => setMenuOpenId(menuOpenId === active.id ? null : active.id)}
              style={styles.menuBtn}
              aria-label="Seed actions"
            >
              ⋯
            </button>
            {menuOpenId === active.id && (
              <div style={styles.menu} onMouseLeave={() => setMenuOpenId(null)}>
                <MenuItem label="✏️ Edit"   onClick={() => { setMenuOpenId(null); active.onEdit?.(active) }} />
                <MenuItem label="♻️ Repost" onClick={() => { setMenuOpenId(null); active.onRepost?.(active) }} />
                <MenuItem label="⏸ Park"   onClick={() => { setMenuOpenId(null); active.onPark?.(active) }} />
                <MenuItem label="🗑 Delete" onClick={() => { setMenuOpenId(null); active.onDelete?.(active) }} danger />
              </div>
            )}
          </div>
        )}

        {/* Title block */}
        <div style={styles.body}>
          <div style={styles.cardTitle}>{active.title}</div>
          {active.subtitle && <div style={styles.cardSubtitle}>{active.subtitle}</div>}

          <div style={styles.btnRow}>
            <div style={{ flex: 1 }}>
              <LivingButton variant="play" isPlaying={previewing} onClick={handlePlay}
                height={40} borderRadius={10} fontSize={12} letterSpacing="0px">
                {previewing ? '⏸ Pause' : '▶ Play'}
              </LivingButton>
            </div>
            <Link to={active.openPath} style={{ flex: 1, textDecoration: 'none' }}>
              <LivingButton variant="enter" height={40} borderRadius={10} fontSize={12} letterSpacing="0px">
                📂 Open
              </LivingButton>
            </Link>
            <div style={{ flex: 1 }}>
              <LivingButton variant="live" onClick={() => goLive(active)}
                height={40} borderRadius={10} fontSize={12} letterSpacing="0px">
                🔴 Go Live
              </LivingButton>
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div style={styles.dots}>
        {cards.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            style={styles.dot(i === safeIdx, accent)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}

function MenuItem({ label, onClick, danger }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left',
      padding: '8px 12px', background: 'transparent', border: 'none',
      color: danger ? '#f87171' : '#e2e8f0', fontSize: 13, cursor: 'pointer',
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      {label}
    </button>
  )
}

const styles = {
  wrap: (accent) => ({
    background: '#0a0f1a',
    border: `1px solid ${accent}33`,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    boxShadow: `0 0 24px ${accent}10`,
  }),
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, padding: '0 4px',
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: 8 },
  titleEmoji: { fontSize: 18 },
  title: { fontSize: 13, fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 },
  count: { fontSize: 11, color: '#64748b', fontWeight: 700 },
  empty: { padding: 18, fontSize: 12, color: '#64748b', fontStyle: 'italic', textAlign: 'center' },

  card: (accent) => ({
    position: 'relative',
    height: 280,
    borderRadius: 14,
    overflow: 'hidden',
    background: '#111827',
    border: `1px solid ${accent}44`,
    transition: 'border-color 0.4s ease',
  }),
  img: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 },
  overlay: (accent) => ({
    position: 'absolute', inset: 0,
    background: `linear-gradient(to top, #060a12 0%, ${accent}22 60%, transparent 100%)`,
  }),
  previewVideo: {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'contain', background: '#000', zIndex: 3,
  },
  audioBar: {
    position: 'absolute', left: 14, right: 14, top: 14, zIndex: 3,
    background: 'rgba(6,10,18,0.85)', backdropFilter: 'blur(6px)',
    borderRadius: 10, padding: 8,
  },

  badge: (color) => ({
    position: 'absolute', top: 12, left: 12, zIndex: 2,
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: `${color}22`, border: `1px solid ${color}66`,
    color, fontSize: 10, fontWeight: 800, letterSpacing: '0.5px',
    padding: '4px 8px', borderRadius: 999, textTransform: 'uppercase',
    backdropFilter: 'blur(6px)',
  }),

  menuWrap: { position: 'absolute', top: 10, right: 10, zIndex: 4 },
  menuBtn: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'rgba(6,10,18,0.7)', border: '1px solid rgba(255,255,255,0.15)',
    color: '#e2e8f0', fontSize: 18, fontWeight: 800, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(6px)',
  },
  menu: {
    position: 'absolute', top: 38, right: 0, minWidth: 140,
    background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '4px 0', boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
  },

  body: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px 14px', zIndex: 2 },
  cardTitle: { fontSize: 17, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: 'rgba(226,232,240,0.7)', marginBottom: 10 },
  btnRow: { display: 'flex', gap: 6 },

  dots: { display: 'flex', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: (isActive, accent) => ({
    width: isActive ? 18 : 6, height: 6, borderRadius: 3,
    background: isActive ? accent : '#1e293b',
    transition: 'all 0.3s ease', cursor: 'pointer',
    border: 'none', padding: 0,
  }),
}
