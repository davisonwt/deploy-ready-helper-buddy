// src/components/garden/SeedSlider.jsx
// Reusable auto-rotating slider for ONE category (Seeds, Orchards, Music, Books, Videos).
// Renders the shared SeedCard (Flow v2 step 3) for the active card, plus a small
// owner toolbar (Edit · Delete · Repost · Park) overlay -- SeedCard's own decided
// action set has no owner-CRUD concept, so this page layers it on top, same
// capability this slider always had via LivingSeedCard's "mine" owner menu.
// Bloom reactions are gone (Heart, on SeedCard, covers the same need); Go Live
// only shows on an orchard card that's actually live, not unconditionally, both
// per the Seed Card consolidation decisions in docs/FLOW-V2-MAP.md.

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, RotateCcw, Pause as ParkIcon, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import SeedCard from '@/components/seeds/SeedCard'

const MEDIA_KIND_TO_SEED_KIND = {
  audio: 'music',
  video: 'video',
  book: 'book',
  orchard: 'orchard',
  seed: 'seed',
}

/**
 * card shape (built by seedCardBuilders.js):
 * {
 *   id, rawId, title, subtitle, image, badge: { emoji, label, color },
 *   openPath, liveKey, mediaKind, mediaUrl?, previewUrl?, productId?,
 *   mine: boolean, whispererSharePct,
 *   onEdit?, onDelete?, onRepost?, onPark?,
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
  const { user } = useAuth()
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  const total = cards.length
  const safeIdx = total ? idx % total : 0
  const active = cards[safeIdx]
  const goPrevious = () => setIdx((i) => (i - 1 + total) % total)
  const goNext = () => setIdx((i) => (i + 1) % total)

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

  const hasOwnerMenu = active.mine && (active.onEdit || active.onDelete || active.onRepost || active.onPark)

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
        <SeedCard
          id={active.rawId || active.id}
          kind={MEDIA_KIND_TO_SEED_KIND[active.mediaKind] || 'seed'}
          title={active.title}
          subtitle={active.subtitle}
          cover={active.image}
          // "mine" cards are always the signed-in viewer's own content; a
          // not-mine card (e.g. "Tending in the Tribe"'s bestowed orchards)
          // carries its real owner on the raw row instead.
          ownerId={active.mine ? user?.id : active.seedRow?.user_id}
          ownerName={active.mine ? (user?.display_name || user?.first_name) : undefined}
          openPath={active.openPath}
          previewUrl={active.previewUrl}
          productId={active.productId}
          hideSowerLine
        />

        {total > 1 && (
          <>
            <button type="button" aria-label="Previous" onClick={goPrevious} style={styles.navBtn('left')}>
              <ChevronLeft size={16} />
            </button>
            <button type="button" aria-label="Next" onClick={goNext} style={styles.navBtn('right')}>
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {hasOwnerMenu && (
          <div style={styles.ownerToolbar}>
            {active.onEdit && (
              <button type="button" aria-label="Edit" onClick={() => active.onEdit(active)} style={styles.ownerBtn}>
                <Pencil size={14} />
              </button>
            )}
            {active.onRepost && (
              <button type="button" aria-label="Repost" onClick={() => active.onRepost(active)} style={styles.ownerBtn}>
                <RotateCcw size={14} />
              </button>
            )}
            {active.onPark && (
              <button type="button" aria-label="Park" onClick={() => active.onPark(active)} style={styles.ownerBtn}>
                <ParkIcon size={14} />
              </button>
            )}
            {active.onDelete && (
              <button type="button" aria-label="Delete" onClick={() => active.onDelete(active)} style={{ ...styles.ownerBtn, color: '#f87171' }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
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
  count: { fontSize: 11, color: '#94a3b8', fontWeight: 700 },
  empty: { padding: 18, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' },

  navBtn: (side) => ({
    position: 'absolute', top: '35%', [side]: 8, zIndex: 5,
    width: 32, height: 32, borderRadius: '50%',
    background: 'rgba(6,10,18,0.75)', border: '1px solid rgba(255,255,255,0.15)',
    color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', backdropFilter: 'blur(6px)',
  }),

  ownerToolbar: {
    position: 'absolute', top: 10, right: 10, zIndex: 5,
    display: 'flex', gap: 6,
  },
  ownerBtn: {
    width: 30, height: 30, borderRadius: '50%',
    background: 'rgba(6,10,18,0.75)', border: '1px solid rgba(255,255,255,0.15)',
    color: '#e2e8f0', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(6px)',
  },
}
