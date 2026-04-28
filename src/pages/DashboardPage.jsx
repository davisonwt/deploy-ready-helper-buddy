import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from "@/integrations/supabase/client"
import SeedFlow from '../components/SeedFlow'
import LivingButton from '../components/LivingButton'

const SEEDS = [
  {
    id: 1,
    name: 'The Wandering Wheel',
    type: 'SERVICE',
    status: 'Flowing',
    activity: '12 people interacting',
    description: 'Need a ride or a delivery?',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    color: '#0e7490',
    glow: '#06b6d4',
    playPath: '/grove-station',
    bookPath: '/browse-orchards',
  },
  {
    id: 2,
    name: 'Community Harvest',
    type: 'ORCHARD',
    status: 'Growing',
    activity: '38 sowers contributing',
    description: 'Seeds becoming orchards',
    image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
    color: '#166534',
    glow: '#22c55e',
    playPath: '/browse-orchards',
    bookPath: '/browse-orchards',
  },
  {
    id: 3,
    name: 'Grove Station',
    type: 'RADIO',
    status: 'Live',
    activity: '39 listeners tuned in',
    description: 'Your community is broadcasting',
    image: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80',
    color: '#7c3aed',
    glow: '#a78bfa',
    playPath: '/grove-station',
    bookPath: '/grove-station',
  },
  {
    id: 4,
    name: 'Sacred Calendar',
    type: 'FEAST',
    status: 'Counting',
    activity: 'Omer 8 of 50',
    description: "Walking toward Shavu'ot",
    image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80',
    color: '#92400e',
    glow: '#f59e0b',
    playPath: '/364yhvh-days',
    bookPath: '/364yhvh-days',
  },
]

const NAV = [
  { label: 'SeedFlow',      sub: 'Your living feed',    emoji: '🌊', path: '/dashboard',            color: '#2563eb' },
  { label: 'My Garden',     sub: 'Seeds & orchards',    emoji: '🌱', path: '/my-orchards',           color: '#16a34a' },
  { label: 'Learn & Share', sub: 'Grow your tribe',     emoji: '🎬', path: '/learn-share',           color: '#10b981' },
  { label: 'Directory',     sub: 'Find your tribe',     emoji: 'ðŸŒ', path: '/wandering-directory',   color: '#6366f1' },
  { label: 'Orchards',      sub: 'All tribal orchards', emoji: '🌳', path: '/browse-orchards',       color: '#0d9488' },
  { label: 'Conversations', sub: 'Tribe messaging',     emoji: 'ðŸ’¬', path: '/chatapp',               color: '#0891b2' },
  { label: '364yhvh',       sub: 'Scripture & feasts',  emoji: 'ðŸ“…', path: '/364yhvh-days',          color: '#7c3aed' },
  { label: 'Wandering Hearts', sub: 'Tribal connections', emoji: '💚', path: '/wandering-hearts', color: '#dc2626' },
  { label: 'Gosats', sub: 'Elder management', emoji: '🏛️', path: '/gosats', color: '#7c3aed' },
  { label: 'Let It Rain',   sub: 'Bestow blessings',    emoji: 'ðŸŒ§ï¸', path: '/let-it-rain',           color: '#6d28d9' },
]

const GROWTH_TIPS = [
  'Your seeds are in motion. Something is growing.',
  'The tribe moves when you move. Plant something today.',
  'Every bestowal is a seed. Every seed becomes a harvest.',
  "You've entered SeedFlow. Things are already happening.",
]


// â”€â”€ Omer Badge with walking footsteps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OmerBadge({ omer, omerTotal, nextFeast }) {
  const canvasRef = useRef(null)
  const frameRef  = useRef(0)
  const rafRef    = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    function resize() {
      canvas.width  = canvas.offsetWidth  || 220
      canvas.height = canvas.offsetHeight || 110
    }
    resize()
    function loop() {
      frameRef.current++
      const t = frameRef.current
      if (canvas.width !== canvas.offsetWidth && canvas.offsetWidth > 0) resize()
      const w = canvas.width, h = canvas.height
      ctx.clearRect(0, 0, w, h)

      // Background
      const bg = ctx.createLinearGradient(0, 0, w, h)
      bg.addColorStop(0, '#1c1400'); bg.addColorStop(1, '#0f0a00')
      ctx.fillStyle = bg
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(0, 0, w, h, 12); ctx.fill() }
      else ctx.fillRect(0, 0, w, h)

      // Glow
      const glow = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w*0.6)
      glow.addColorStop(0, 'rgba(245,158,11,0.08)'); glow.addColorStop(1, 'rgba(245,158,11,0)')
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h)

      // Border
      ctx.strokeStyle = 'rgba(146,64,14,0.4)'; ctx.lineWidth = 1
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(0.5, 0.5, w-1, h-1, 12); ctx.stroke() }

      // Wheat
      ctx.font = '16px serif'; ctx.fillStyle = '#f59e0b'
      ctx.textAlign = 'left'; ctx.fillText('ðŸŒ¾', 10, 24)

      // Omer count
      ctx.font = 'bold 18px Segoe UI, sans-serif'
      ctx.fillStyle = '#f59e0b'; ctx.textAlign = 'left'
      ctx.fillText('Omer ' + omer + '/' + omerTotal, 34, 22)

      // Arrow
      ctx.font = '11px Segoe UI, sans-serif'
      ctx.fillStyle = 'rgba(245,158,11,0.5)'
      ctx.fillText('â†’ ' + nextFeast, 34, 38)

      // Divider
      ctx.beginPath(); ctx.moveTo(10, 48); ctx.lineTo(w-10, 48)
      ctx.strokeStyle = 'rgba(146,64,14,0.25)'; ctx.lineWidth = 0.5; ctx.stroke()

      // Message
      ctx.font = '9px Segoe UI, sans-serif'
      ctx.fillStyle = 'rgba(245,158,11,0.5)'
      ctx.textAlign = 'center'
      ctx.fillText('Walking towards the feast each day', w/2, 62)

      // Animated footsteps
      const numSteps = 7
      const stepSpacing = (w - 30) / numSteps
      const walkCycle = (t * 0.018) % 1
      for (let i = 0; i < numSteps; i++) {
        const stepProgress = i / (numSteps - 1)
        const sx = 15 + i * stepSpacing
        const side = i % 2 === 0 ? -1 : 1
        const appear = Math.sin((stepProgress - walkCycle) * Math.PI * 2 + Math.PI) * 0.5 + 0.5
        const alpha = 0.2 + appear * 0.65
        const scale = 1.1 - stepProgress * 0.55
        ctx.save()
        ctx.translate(sx, 84 + side * 4)
        ctx.scale(scale, scale)
        ctx.rotate(side * 0.2)
        ctx.beginPath()
        ctx.ellipse(0, 0, 4, 7, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(245,158,11,' + alpha + ')'; ctx.fill()
        for (let toe = 0; toe < 4; toe++) {
          ctx.beginPath()
          ctx.arc(-2.5 + toe * 1.8, -6.5, 1.3, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(245,158,11,' + (alpha * 0.7) + ')'; ctx.fill()
        }
        ctx.restore()
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [omer, omerTotal, nextFeast])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: 110,
        borderRadius: 12,
        display: 'block',
      }}
    />
  )
}

export default function SeedFlowDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [pulse, setPulse] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [stats, setStats] = useState({ sowers: 4, orchards: 0, seeds: 56, members: 0 })
  const [tip] = useState(GROWTH_TIPS[Math.floor(Math.random() * GROWTH_TIPS.length)])
  const [activePath, setActivePath] = useState('/dashboard')
  const intervalRef = useRef(null)

  const sacredDate = { year: 6029, month: 2, day: 3, omer: 8, omerTotal: 50, nextFeast: "Shavu'ot" }

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('first_name, last_name, avatar_url, membership_tier').eq('user_id', user.id).single()
      .then(({ data }) => data && setProfile(data))
    supabase.from('sowers').select('*', { count: 'exact', head: true }).eq('is_verified', true)
      .then(({ count }) => setStats(s => ({ ...s, sowers: count || 4 })))
    supabase.from('orchards').select('*', { count: 'exact', head: true }).eq('status', 'active')
      .then(({ count }) => setStats(s => ({ ...s, orchards: count || 0 })))
    supabase.from('seeds').select('*', { count: 'exact', head: true })
      .then(({ count }) => setStats(s => ({ ...s, seeds: count || 56 })))
  }, [user])

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setPulse(true)
      setTimeout(() => setPulse(false), 600)
      setActiveIdx(i => (i + 1) % SEEDS.length)
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const activeSeed = SEEDS[activeIdx]
  const displayName = profile?.first_name || user?.email?.split('@')[0] || 'Friend'

  const styles = {
    root: {
      display: 'flex', height: '100vh', width: '100vw',
      background: '#060a12', color: '#e2e8f0',
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      overflow: 'hidden', position: 'fixed', top: 38, left: 0, zIndex: 50, paddingBottom: 70,
    },
    sidebar: {
      width: 260, minWidth: 260,
      background: '#0a0f1a',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', overflowY: 'auto',
    },
    logoArea: {
      padding: '18px 14px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    },
    logoRow: {
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
    },
    logoText: { fontWeight: 700, fontSize: 15, color: '#fff', lineHeight: 1.2 },
    logoSub: { fontSize: 11, color: '#4b5563', lineHeight: 1 },
    keeperBadge: {
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', background: '#111827',
      borderRadius: 8, cursor: 'pointer',
    },
    keeperDot: {
      width: 26, height: 26, borderRadius: '50%',
      background: '#1e293b', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#64748b',
    },
    nav: {
      flex: 1, padding: '10px 8px 80px',
      overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3,
    },
    navItem: (isActive, color) => ({
      display: 'flex', alignItems: 'center', gap: 11,
      padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
      background: isActive ? color + '22' : 'transparent',
      border: isActive ? `1px solid ${color}44` : '1px solid transparent',
      transition: 'all 0.15s ease', textDecoration: 'none',
    }),
    navEmoji: (isActive, color) => ({
      width: 32, height: 32, borderRadius: 8, fontSize: 16,
      background: isActive ? color + '33' : '#111827',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: isActive ? `1px solid ${color}55` : '1px solid transparent',
    }),
    navLabel: { fontWeight: 600, fontSize: 13, color: '#e2e8f0', lineHeight: 1.2 },
    navSub: { fontSize: 11, color: '#4b5563', lineHeight: 1 },
    bottomBar: {
      padding: '10px 8px',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', gap: 6,
    },
    center: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', paddingBottom: 80 },
    header: {
      padding: '18px 22px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: '#080d17',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    avatar: {
      width: 44, height: 44, borderRadius: '50%',
      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 19, overflow: 'hidden', flexShrink: 0,
    },
    greeting: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 },
    greetingSub: { fontSize: 12, color: '#4b5563' },
    seedflowLabel: {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: '#0f172a', border: '1px solid #1e293b',
      borderRadius: 20, padding: '5px 12px',
      fontSize: 12, color: '#64748b',
    },
    content: { padding: '18px 22px', flex: 1 },
    sectionLabel: {
      fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
      color: '#374151', textTransform: 'uppercase', marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 7,
    },
    liveTag: {
      background: '#dc262622', border: '1px solid #dc262644',
      color: '#f87171', fontSize: 10, fontWeight: 700,
      padding: '2px 7px', borderRadius: 10, letterSpacing: '0.1em',
    },
    seedCard: {
      position: 'relative', borderRadius: 16, overflow: 'hidden',
      marginBottom: 14, height: 320,
      background: '#111827',
      border: `1px solid ${activeSeed.color}44`,
      transition: 'border-color 0.6s ease',
      boxShadow: `0 0 40px ${activeSeed.glow}18`,
    },
    seedImg: {
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      objectFit: 'cover', opacity: 0.45,
    },
    seedOverlay: {
      position: 'absolute', inset: 0,
      background: `linear-gradient(to top, #060a12 0%, ${activeSeed.color}22 50%, transparent 100%)`,
    },
    seedCounter: {
      position: 'absolute', top: 14, right: 14,
      background: 'rgba(6,10,18,0.7)', backdropFilter: 'blur(4px)',
      borderRadius: 20, padding: '4px 11px',
      fontSize: 12, color: '#cbd5e1', fontWeight: 600,
      border: '1px solid rgba(255,255,255,0.08)',
    },
    seedType: {
      position: 'absolute', top: 14, left: 14,
      background: activeSeed.color + 'cc', borderRadius: 6,
      padding: '3px 9px', fontSize: 10, fontWeight: 800,
      color: '#fff', letterSpacing: '0.12em',
    },
    seedActivity: {
      position: 'absolute', top: '38%', left: '50%',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center',
    },
    activityDot: {
      width: 8, height: 8, borderRadius: '50%',
      background: activeSeed.glow, display: 'inline-block',
      marginRight: 6, animation: 'pulse 2s infinite',
    },
    activityText: { fontSize: 13, color: activeSeed.glow, fontWeight: 600 },
    seedDesc: {
      position: 'absolute', top: '52%', left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: 16, color: 'rgba(255,255,255,0.7)',
      fontStyle: 'italic', textAlign: 'center', width: '80%',
    },
    seedBottom: {
      position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 18px',
    },
    seedName: { fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 },
    seedStatus: {
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, color: activeSeed.glow, marginBottom: 12, fontWeight: 600,
    },
    statusDot: {
      width: 6, height: 6, borderRadius: '50%', background: activeSeed.glow,
    },
    seedBtns: { display: 'flex', gap: 8 },
    seedDots: {
      display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14,
    },
    dot: (isActive) => ({
      width: isActive ? 20 : 6, height: 6, borderRadius: 3,
      background: isActive ? activeSeed.glow : '#1e293b',
      transition: 'all 0.4s ease', cursor: 'pointer',
    }),
    rightPanel: {
      width: 248, minWidth: 248,
      background: '#080d17',
      borderLeft: '1px solid rgba(255,255,255,0.05)',
      padding: '18px 14px', overflowY: 'auto', paddingBottom: 80,
      display: 'flex', flexDirection: 'column', gap: 22,
    },
    panelSection: { display: 'flex', flexDirection: 'column', gap: 8 },
    panelTitle: {
      fontSize: 10, fontWeight: 700, color: '#374151',
      letterSpacing: '0.12em', textTransform: 'uppercase',
      display: 'flex', alignItems: 'center', gap: 6,
    },
    dateYear: { fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 },
    dateLine: { fontSize: 13, color: '#4b5563', lineHeight: 1.9 },
    omerBadge: {
      background: '#1c1400', border: '1px solid #92400e44',
      borderRadius: 10, padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 9,
    },
    omerText: { fontSize: 14, fontWeight: 700, color: '#f59e0b' },
    omerNext: { fontSize: 13, color: '#4b5563' },
    growthCard: {
      background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 10, padding: '12px 12px',
    },
    growthTitle: { fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 10 },
    growthRow: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    },
    growthLabel: { fontSize: 12, color: '#4b5563' },
    growthVal: { fontSize: 14, fontWeight: 700, color: '#f1f5f9' },
    tipBox: {
      background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 10, padding: '12px',
      fontSize: 12, color: '#6b7280', lineHeight: 1.7,
      fontStyle: 'italic',
    },
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes breathe {
          0%, 100% { box-shadow: 0 0 20px ${activeSeed.glow}15; }
          50% { box-shadow: 0 0 40px ${activeSeed.glow}30; }
        }
        .seed-card-anim { animation: breathe 4s ease-in-out infinite; }
        .nav-link:hover { opacity: 0.85; }
      `}</style>

      <div style={styles.root}>

        {/* â”€â”€ SeedFlow fixed strip across very top â”€â”€ */}
        <SeedFlow fixed height={38} seedCount={36} zIndex={200} />

        {/* â”€â”€ SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={styles.sidebar}>
          <div style={styles.logoArea}>
            <div style={styles.logoRow}>
              <img src="/favicon.png" alt="S2G" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover' }} />
              <div>
                <div style={styles.logoText}>Sow2Grow</div>
                <div style={styles.logoSub}>364yhvh community farm</div>
              </div>
            </div>
            <div style={styles.keeperBadge}>
              <div style={styles.keeperDot}>{displayName?.charAt(0)?.toUpperCase() || 'S'}</div>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>{profile?.membership_tier || 'Sower'}</span>
            </div>
          </div>

          <nav style={styles.nav}>
            {NAV.map(item => {
              const isActive = activePath === item.path
              return (
                <Link key={item.label} to={item.path} className="nav-link"
                  onClick={() => setActivePath(item.path)}
                  style={styles.navItem(isActive, item.color)}>
                  <div style={styles.navEmoji(isActive, item.color)}>{item.emoji}</div>
                  <div>
                    <div style={styles.navLabel}>{item.label}</div>
                    <div style={styles.navSub}>{item.sub}</div>
                  </div>
                </Link>
              )
            })}
          </nav>

        </div>

        {/* â”€â”€ CENTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={styles.center}>

          <div style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={styles.avatar}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : 'ðŸ§‘'}
              </div>
              <div>
                <div style={styles.greeting}>Welcome back, {displayName} â€” your seeds are in motion</div>
                <div style={styles.greetingSub}>
                  Shalom Â· Year {sacredDate.year} Â· Month {sacredDate.month} Â· Day {sacredDate.day}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={styles.seedflowLabel}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                SeedFlow active
              </div>
            </div>
          </div>

          <div style={styles.content}>
            <div style={styles.sectionLabel}>
              <span>Seeds in motion</span>
              <span style={styles.liveTag}>LIVE</span>
            </div>

            {/* â”€â”€ Seed showcase card â”€â”€ */}
            <div style={{ ...styles.seedCard }} className="seed-card-anim">
              <img src={activeSeed.image} alt="" style={styles.seedImg} />
              <div style={styles.seedOverlay} />
              <div style={styles.seedCounter}>{activeIdx + 1}/{SEEDS.length}</div>
              <div style={styles.seedType}>{activeSeed.type}</div>
              <div style={styles.seedActivity}>
                <span style={styles.activityDot} />
                <span style={styles.activityText}>{activeSeed.activity}</span>
              </div>
              <div style={styles.seedDesc}>{activeSeed.description}</div>
              <div style={styles.seedBottom}>
                <div style={styles.seedName}>{activeSeed.name}</div>
                <div style={styles.seedStatus}>
                  <span style={styles.statusDot} />
                  {activeSeed.status}
                </div>

                {/* â”€â”€ Living Play + Enter buttons â”€â”€ */}
                <div style={styles.seedBtns}>
                  <Link to={activeSeed.playPath} style={{ flex: 1, textDecoration: 'none' }}>
                    <LivingButton
                      variant="play"
                      isPlaying={isPlaying}
                      onClick={() => setIsPlaying(p => !p)}
                      height={44}
                      borderRadius={10}
                      fontSize={13}
                      letterSpacing="0px"
                    >
                      {isPlaying ? 'â¸ Pause' : 'â–¶ Play'}
                    </LivingButton>
                  </Link>
                  <Link to={activeSeed.bookPath} style={{ flex: 1, textDecoration: 'none' }}>
                    <LivingButton
                      variant="enter"
                      height={44}
                      borderRadius={10}
                      fontSize={13}
                      letterSpacing="0px"
                    >
                      ðŸ“… Enter
                    </LivingButton>
                  </Link>
                </div>
              </div>
            </div>

            {/* â”€â”€ Dots â”€â”€ */}
            <div style={styles.seedDots}>
              {SEEDS.map((_, i) => (
                <div key={i} style={styles.dot(i === activeIdx)}
                  onClick={() => { setActiveIdx(i); clearInterval(intervalRef.current) }} />
              ))}
            </div>

            {/* â”€â”€ Step Into the Orchard â€” living gate button â”€â”€ */}
            <Link to="/browse-orchards" style={{ textDecoration: 'none' }}>
              <LivingButton
                variant="stepInto"
                height={56}
                borderRadius={14}
                fontSize={11}
                fontWeight={800}
                letterSpacing="2px"
              >
                ðŸŒ¿ STEP INTO THE ORCHARD â€” FIND YOUR SEED
              </LivingButton>
            </Link>
          </div>
        </div>

        {/* â”€â”€ RIGHT PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={styles.rightPanel}>
          <div style={styles.panelSection}>
            <div style={styles.panelTitle}>ðŸ“… TODAY</div>
            <div style={styles.dateYear}>Year {sacredDate.year}</div>
            <div style={styles.dateLine}>
              Month {sacredDate.month} Â· Day {sacredDate.day}<br />
              Day 1 Â· Regular Day
            </div>
          </div>
          <OmerBadge omer={sacredDate.omer} omerTotal={sacredDate.omerTotal} nextFeast={sacredDate.nextFeast} />
          <div style={styles.panelSection}>
            <div style={styles.panelTitle}>ðŸŒ± YOUR GROWTH</div>
            <div style={styles.growthCard}>
              <div style={styles.growthTitle}>Seeds this week</div>
              {[
                { label: 'Seeds planted',  val: stats.seeds    },
                { label: 'Seeds growing',  val: stats.orchards },
                { label: 'Active sowers',  val: stats.sowers   },
                { label: 'Harvest forming',val: stats.members  },
              ].map(({ label, val }) => (
                <div key={label} style={styles.growthRow}>
                  <span style={styles.growthLabel}>{label}</span>
                  <span style={styles.growthVal}>{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={styles.panelSection}>
            <div style={styles.panelTitle}>ðŸ’¡ SEEDFLOW TIP</div>
            <div style={styles.tipBox}>"{tip}"</div>
          </div>
        </div>

        {/* â”€â”€ Full width bottom bar â”€â”€ */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          display: 'flex', gap: 8, padding: '10px 12px',
          background: '#080d17',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          zIndex: 100,
        }}>
          <Link to="/create-orchard" style={{ flex: 1, textDecoration: 'none' }}>
            <LivingButton variant="enter" height={50} borderRadius={14} fontSize={12} letterSpacing="1px">
              ðŸŒ± Plant Seed
            </LivingButton>
          </Link>
          <Link to="/grove-station" style={{ flex: 1, textDecoration: 'none' }}>
            <LivingButton variant="live" height={50} borderRadius={14} fontSize={12} letterSpacing="1px">
              Go Live
            </LivingButton>
          </Link>
          <Link to="/chatapp" style={{ flex: 1, textDecoration: 'none' }}>
            <LivingButton variant="share" height={50} borderRadius={14} fontSize={12} letterSpacing="1px">
              ðŸ’¬ Chat
            </LivingButton>
          </Link>
        </div>
      </div>
    </>
  )
}

