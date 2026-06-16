// src/components/garden/MyGardenSection.jsx
// One vertical category section for My Garden page.
// Renders a responsive grid of the user's items in this category.
// Every card has: Play (inline preview where applicable), Open, Go Live (always), and ⋯ owner menu.

import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LivingButton from '../LivingButton'

export default function MyGardenSection({ title, emoji, accent = '#22c55e', cards, emptyHint }) {
  const navigate = useNavigate()
  return (
    <section style={styles.wrap(accent)}>
      <header style={styles.header}>
        <div style={styles.titleRow}>
          <span style={styles.titleEmoji}>{emoji}</span>
          <h3 style={styles.title}>{title}</h3>
          <span style={styles.count}>{cards.length}</span>
        </div>
      </header>

      {cards.length === 0 ? (
        <div style={styles.empty}>{emptyHint || 'Nothing here yet.'}</div>
      ) : (
        <div style={styles.grid}>
          {cards.map((c) => (
            <GardenCard key={c.id} card={c} accent={accent} navigate={navigate} />
          ))}
        </div>
      )}
    </section>
  )
}

function GardenCard({ card, accent, navigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const audioRef = useRef(null)
  const videoRef = useRef(null)

  const goLive = () => navigate(`/grove-station?seed=${encodeURIComponent(card.liveKey || card.id)}`)
  const handlePlay = () => {
    if (previewing) {
      audioRef.current?.pause()
      videoRef.current?.pause()
      setPreviewing(false)
      return
    }
    if (card.mediaKind === 'audio' && card.mediaUrl) {
      setPreviewing(true)
      setTimeout(() => audioRef.current?.play().catch(() => {}), 0)
    } else if (card.mediaKind === 'video' && card.mediaUrl) {
      setPreviewing(true)
      setTimeout(() => videoRef.current?.play().catch(() => {}), 0)
    } else {
      navigate(card.openPath)
    }
  }

  return (
    <article style={styles.card(accent)}>
      <div style={styles.thumb}>
        <img src={card.image} alt="" style={styles.thumbImg} />
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
        <div style={styles.cardSub}>{card.subtitle}</div>

        {previewing && card.mediaKind === 'audio' && card.mediaUrl && (
          <audio ref={audioRef} src={card.mediaUrl} controls style={{ width: '100%', marginTop: 6 }}
            onEnded={() => setPreviewing(false)} />
        )}

        <div style={styles.btnRow}>
          <div style={{ flex: 1 }}>
            <LivingButton variant="play" isPlaying={previewing} onClick={handlePlay}
              height={36} borderRadius={8} fontSize={11} letterSpacing="0px">
              {previewing ? '⏸' : '▶'} Play
            </LivingButton>
          </div>
          <Link to={card.openPath} style={{ flex: 1, textDecoration: 'none' }}>
            <LivingButton variant="enter" height={36} borderRadius={8} fontSize={11} letterSpacing="0px">
              📂 Open
            </LivingButton>
          </Link>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`${card.openPath}?action=bestow`) }}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 8,
              border: '1px solid rgba(251,191,36,0.6)',
              background: 'linear-gradient(90deg, rgba(245,158,11,0.3), rgba(234,179,8,0.25))',
              color: '#fde68a',
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
            aria-label="Bestow to this seed"
          >
            🎁 Bestow
          </button>
          <div style={{ flex: 1 }}>
            <LivingButton variant="live" onClick={goLive}
              height={36} borderRadius={8} fontSize={11} letterSpacing="0px">
              🔴 Live
            </LivingButton>
          </div>
        </div>

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
  btnRow: { display: 'flex', gap: 5, marginTop: 'auto' },
}
