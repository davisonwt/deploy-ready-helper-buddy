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

  const total = cards.length
  const safeIdx = total ? idx % total : 0
  const active = cards[safeIdx]

  // auto-rotate
  useEffect(() => {
    if (!total || paused) return
    const t = setInterval(() => setIdx((i) => (i + 1) % total), intervalMs)
    return () => clearInterval(t)
  }, [total, paused, intervalMs])

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

      <div style={{ position: 'relative' }}>
        <LivingSeedCard
          seedId={active.liveKey || active.rawId || active.id}
          title={active.title}
          subtitle={active.subtitle}
          image={active.image}
          images={active.images}
          openPath={active.openPath}
          mediaUrl={active.mediaUrl}
          mediaKind={active.mediaKind}
          badge={active.badge}
          mine={active.mine}
          whispererSharePct={active.whispererSharePct}
          onEdit={active.onEdit ? () => active.onEdit(active) : undefined}
          onDelete={active.onDelete ? () => active.onDelete(active) : undefined}
          onRepost={active.onRepost ? () => active.onRepost(active) : undefined}
          onPark={active.onPark ? () => active.onPark(active) : undefined}
        />

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIdx((i) => (i - 1 + total) % total)}
              style={{ ...styles.arrow(accent), left: 8 }}
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setIdx((i) => (i + 1) % total)}
              style={{ ...styles.arrow(accent), right: 8 }}
              aria-label="Next"
            >
              ›
            </button>
          </>
        )}
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
