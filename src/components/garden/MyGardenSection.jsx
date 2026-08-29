// src/components/garden/MyGardenSection.jsx
// One vertical category section for My Garden page.
// Renders a responsive grid of the user's items in this category.
// Every card has: Play (inline preview where applicable), Open, Go Live (always), and ⋯ owner menu.

import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LivingButton from '../LivingButton'
import { useSignedImage } from '@/lib/storage/signedImage'
import ShareSeedDialog from '@/components/share/ShareSeedDialog'
import BrandIcon from './BrandIcon'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'


export default function MyGardenSection({ title, emoji, accent = '#22c55e', cards, emptyHint, headerAction = null, brands = [], brandByItem = {}, onAssignBrand = null }) {
  const navigate = useNavigate()
  return (
    <section style={styles.wrap(accent)}>
      <header style={styles.header}>
        <div style={styles.titleRow}>
          <span style={styles.titleEmoji}>{emoji}</span>
          <h3 style={styles.title}>{title}</h3>
          <span style={styles.count}>{cards.length}</span>
        </div>
        {headerAction}
      </header>

      {cards.length === 0 ? (
        <div style={styles.empty}>
          <div>{emptyHint || 'Nothing here yet.'}</div>
          {headerAction && <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>{headerAction}</div>}
        </div>
      ) : (
        <div style={styles.grid}>
          {cards.map((c) => (
            <GardenCard
              key={c.id}
              card={c}
              accent={accent}
              navigate={navigate}
              brands={brands}
              brand={brands.find((b) => b.id === brandByItem[c.id]) || null}
              onAssignBrand={onAssignBrand}
            />
          ))}
        </div>
      )}
    </section>
  )
}


function GardenCard({ card, accent, navigate, brands = [], brand = null, onAssignBrand = null }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const signedImage = useSignedImage(card.image)
  const videoRef = useRef(null)

  // Owner-only card (My Garden only ever shows your own content), so a
  // click tries the real file via get-seed-file first — a raw
  // file_url can't load into a bare <audio src>, no auth header — and
  // falls back to the row's own preview_url only if that fails.
  const player = usePreviewPlayer({
    id: String(card.id),
    previewUrl: card.mediaKind === 'audio' ? (card.previewUrl ?? null) : null,
    productId: card.mediaKind === 'audio' ? (card.productId ?? undefined) : undefined,
  })
  const isPlayingNow = card.mediaKind === 'audio' ? player.isPlaying : previewing

  const goLive = () => navigate(`/grove-station?seed=${encodeURIComponent(card.liveKey || card.id)}`)
  const handlePlay = () => {
    if (card.mediaKind === 'audio') {
      if (player.hasSource) player.toggle()
      else navigate(card.openPath)
      return
    }
    if (previewing) {
      videoRef.current?.pause()
      setPreviewing(false)
      return
    }
    if (card.mediaKind === 'video' && card.mediaUrl) {
      setPreviewing(true)
      setTimeout(() => videoRef.current?.play().catch(() => {}), 0)
    } else {
      navigate(card.openPath)
    }
  }

  return (
    <article style={styles.card(accent)}>
      <div style={styles.thumb}>
        <img src={signedImage || card.image} alt="" style={styles.thumbImg} />
        {card.badge && (
          <span style={styles.badge(card.badge.color)}>
            <span>{card.badge.emoji}</span>
            <span>{card.badge.label}</span>
          </span>
        )}
        {card.mine && (
          <div style={styles.menuWrap}>
            <button type="button" onClick={() => setMenuOpen(!menuOpen)} style={styles.menuBtn} aria-label="Actions">⋯</button>
            {menuOpen && (
              <div style={styles.menu} onMouseLeave={() => setMenuOpen(false)}>
                <MenuItem label="✏️ Edit"   onClick={() => { setMenuOpen(false); card.onEdit?.(card) }} />
                <MenuItem label="♻️ Repost" onClick={() => { setMenuOpen(false); card.onRepost?.(card) }} />
                <MenuItem label="⏸ Park"   onClick={() => { setMenuOpen(false); card.onPark?.(card) }} />
                {onAssignBrand && (
                  <>
                    <div style={{ padding: '6px 12px 2px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(226,232,240,0.5)' }}>Brand</div>
                    {brands.length === 0 && (
                      <div style={{ padding: '2px 12px 8px', fontSize: 11, color: 'rgba(226,232,240,0.5)' }}>Add a brand in My Garden</div>
                    )}
                    {brands.map((b) => (
                      <MenuItem
                        key={b.id}
                        label={`${brand?.id === b.id ? '✓ ' : '🏷 '}${b.name}`}
                        onClick={() => { setMenuOpen(false); onAssignBrand(card, brand?.id === b.id ? null : b.id) }}
                      />
                    ))}
                  </>
                )}
                <MenuItem label="🗑 Delete" onClick={() => { setMenuOpen(false); card.onDelete?.(card) }} danger />

              </div>
            )}
          </div>
        )}
        {previewing && card.mediaKind === 'video' && card.mediaUrl && (
          <video ref={videoRef} src={card.mediaUrl} controls style={styles.previewVideo}
            muted={false}
            onEnded={() => setPreviewing(false)} />
        )}
      </div>

      <div style={styles.body}>
        <div style={styles.cardTitle}>{card.title}</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          {brand && <BrandIcon brand={brand} size={16} />}
          <div style={styles.cardSub}>{card.subtitle}</div>
        </div>

        {card.mediaKind === 'audio' && player.isPlaying && (
          <div style={{ marginTop: 6 }}>
            <div style={styles.previewTrack}>
              <div style={{ ...styles.previewFill, width: `${Math.min(100, Math.max(0, player.progress * 100))}%` }} />
            </div>
            <p style={styles.previewLabel}>{player.isFullTrack ? 'Full track' : '45s preview'}</p>
          </div>
        )}

        <div style={styles.btnRow}>
          <div style={{ flex: 1 }}>
            <LivingButton variant="play" isPlaying={isPlayingNow} onClick={handlePlay}
              height={36} borderRadius={8} fontSize={11} letterSpacing="0px">
              {card.mediaKind === 'audio' && player.isLoading ? '… Loading' : isPlayingNow ? '⏸ Pause' : '▶ Play'}
            </LivingButton>
          </div>
          <Link to={card.openPath} style={{ flex: 1, textDecoration: 'none' }}>
            <LivingButton variant="enter" height={36} borderRadius={8} fontSize={11} letterSpacing="0px">
              📂 Open
            </LivingButton>
          </Link>
          {/* Bestow button intentionally hidden on My Garden — only shown on public community feeds */}

          <div style={{ flex: 1 }}>
            <LivingButton variant="live" onClick={goLive}
              height={36} borderRadius={8} fontSize={11} letterSpacing="0px">
              🔴 Live
            </LivingButton>
          </div>
          <div style={{ flex: 1 }}>
            <LivingButton variant="enter" onClick={() => setShareOpen(true)}
              height={36} borderRadius={8} fontSize={11} letterSpacing="0px">
              🔗 Share
            </LivingButton>
          </div>
        </div>

        <ShareSeedDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          seedId={String(card.id)}
          title={card.title}
          subtitle={card.subtitle}
          image={signedImage || card.image}
          openPath={card.openPath}
          feedKind={card.mediaKind === 'video' ? 'video' : card.mediaKind === 'audio' ? 'music' : 'photo'}
        />


      </div>
    </article>
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
    background: 'rgba(10,15,26,0.55)',
    border: `1px solid ${accent}55`,
    borderRadius: 16, padding: 16, marginBottom: 18,
    backdropFilter: 'blur(8px)',
    boxShadow: `0 0 28px ${accent}10`,
  }),
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 10 },
  titleEmoji: { fontSize: 22 },
  title: { fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.04em' },
  count: {
    fontSize: 12, color: '#fff', fontWeight: 700,
    background: 'rgba(255,255,255,0.15)', padding: '2px 10px', borderRadius: 999,
  },
  empty: { padding: 24, fontSize: 13, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', textAlign: 'center' },

  grid: {
    display: 'grid', gap: 14,
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  },

  card: (accent) => ({
    background: '#0a0f1a', border: `1px solid ${accent}44`,
    borderRadius: 14, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  }),
  thumb: { position: 'relative', width: '100%', height: 140, background: '#111827' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  previewVideo: {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'contain', background: '#000', zIndex: 3,
  },
  badge: (color) => ({
    position: 'absolute', top: 8, left: 8,
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: `${color}22`, border: `1px solid ${color}66`,
    color, fontSize: 10, fontWeight: 800, letterSpacing: '0.5px',
    padding: '3px 7px', borderRadius: 999, textTransform: 'uppercase',
    backdropFilter: 'blur(6px)', zIndex: 2,
  }),
  menuWrap: { position: 'absolute', top: 6, right: 6, zIndex: 4 },
  menuBtn: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'rgba(6,10,18,0.7)', border: '1px solid rgba(255,255,255,0.15)',
    color: '#e2e8f0', fontSize: 16, fontWeight: 800, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  menu: {
    position: 'absolute', top: 32, right: 0, minWidth: 140,
    background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '4px 0', boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
  },

  body: { padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.25 },
  cardSub: {
    fontSize: 11, color: 'rgba(226,232,240,0.65)', lineHeight: 1.35,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  previewTrack: {
    height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', overflow: 'hidden',
  },
  previewFill: {
    height: '100%', background: '#34d399', transition: 'width 150ms',
  },
  previewLabel: {
    marginTop: 4, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.8)',
  },
  btnRow: { display: 'flex', gap: 5, marginTop: 'auto' },
}
