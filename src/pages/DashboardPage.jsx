import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from "@/integrations/supabase/client"

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
  { label: 'SeedFlow', sub: 'Your living feed', emoji: '🌊', path: '/dashboard', color: '#2563eb' },
  { label: 'My Garden', sub: 'Seeds & orchards', emoji: '🌱', path: '/my-orchards', color: '#16a34a' },{ label: 'Learn & Share', sub: 'Grow your tribe', emoji: '🎬', path: '/learn-share', color: '#10b981' },
 { label: 'Directory', sub: 'Find your tribe', emoji: '🌍', path: '/wandering-directory', color: '#6366f1' }, 
  { label: 'Orchards', sub: 'All tribal orchards', emoji: '🌳', path: '/browse-orchards', color: '#0d9488' },
  { label: 'Conversations', sub: 'Tribe messaging', emoji: '💬', path: '/chatapp', color: '#0891b2' },
  { label: '364yhvh', sub: 'Scripture & feasts', emoji: '📅', path: '/364yhvh-days', color: '#7c3aed' },
  { label: 'Let It Rain', sub: 'Bestow blessings', emoji: '🌧️', path: '/let-it-rain', color: '#6d28d9' },
]

const GROWTH_TIPS = [
  'Your seeds are in motion. Something is growing.',
  'The tribe moves when you move. Plant something today.',
  'Every bestowal is a seed. Every seed becomes a harvest.',
  "You've entered SeedFlow. Things are already happening.",
]

export default function SeedFlowDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [pulse, setPulse] = useState(false)
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
      overflow: 'hidden', position: 'fixed', top: 0, left: 0, zIndex: 50,
    },
    sidebar: {
      width: 260, minWidth: 260,
      background: '#0a0f1a',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', height: '100vh',
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
      flex: 1, padding: '10px 8px',
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
    btnPlant: {
      flex: 1, padding: '11px 0',
      background: 'linear-gradient(135deg, #16a34a, #15803d)',
      border: 'none', borderRadius: 22, color: '#fff',
      fontWeight: 700, fontSize: 12, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    },
    btnLive: {
      flex: 1, padding: '11px 0',
      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
      border: 'none', borderRadius: 22, color: '#fff',
      fontWeight: 700, fontSize: 12, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    },
    btnChat: {
      flex: 1, padding: '11px 0',
      background: '#111827', border: '1px solid #1f2937',
      borderRadius: 22, color: '#9ca3af',
      fontWeight: 700, fontSize: 12, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    },
    center: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
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
    btnPlay: {
      flex: 1, padding: '11px 0',
      background: activeSeed.color + 'cc',
      border: `1px solid ${activeSeed.color}`,
      borderRadius: 10, color: '#fff',
      fontWeight: 700, fontSize: 13, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    },
    btnBook: {
      flex: 1, padding: '11px 0',
      background: `linear-gradient(135deg, ${activeSeed.glow}, ${activeSeed.color})`,
      border: 'none', borderRadius: 10, color: '#fff',
      fontWeight: 700, fontSize: 13, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    },
    seedDots: {
      display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14,
    },
    dot: (isActive) => ({
      width: isActive ? 20 : 6, height: 6, borderRadius: 3,
      background: isActive ? activeSeed.glow : '#1e293b',
      transition: 'all 0.4s ease', cursor: 'pointer',
    }),
    connectBtn: {
      width: '100%', padding: '13px 0',
      background: 'transparent',
      border: `1px solid ${activeSeed.color}66`,
      borderRadius: 12, color: activeSeed.glow,
      fontWeight: 700, fontSize: 13, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      letterSpacing: '0.05em', transition: 'all 0.2s',
    },
    rightPanel: {
      width: 248, minWidth: 248,
      background: '#080d17',
      borderLeft: '1px solid rgba(255,255,255,0.05)',
      padding: '18px 14px', overflowY: 'auto',
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
        .connect-btn:hover { background: ${activeSeed.color}15 !important; }
      `}</style>

      <div style={styles.root}>
        {/* SIDEBAR */}
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

          <div style={styles.bottomBar}>
            <Link to="/create-orchard" style={{ flex: 1, textDecoration: 'none' }}>
              <button style={styles.btnPlant}>🌱 Plant Seed</button>
            </Link>
            <Link to="/grove-station" style={{ flex: 1, textDecoration: 'none' }}>
              <button style={styles.btnLive}>🔴 Go Live</button>
            </Link>
            <Link to="/chatapp" style={{ flex: 1, textDecoration: 'none' }}>
              <button style={styles.btnChat}>💬 Enter Chat</button>
            </Link>
          </div>
        </div>

        {/* CENTER */}
        <div style={styles.center}>
          <div style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={styles.avatar}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '🧑'}
              </div>
              <div>
                <div style={styles.greeting}>🌊 Welcome back — your seeds are in motion</div>
                <div style={styles.greetingSub}>
                  Shalom, {displayName} · Year {sacredDate.year} · Month {sacredDate.month} · Day {sacredDate.day}
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
                <div style={styles.seedBtns}>
                  <Link to={activeSeed.playPath} style={{ flex: 1, textDecoration: 'none' }}>
                    <button style={styles.btnPlay}>▶ Play</button>
                  </Link>
                  <Link to={activeSeed.bookPath} style={{ flex: 1, textDecoration: 'none' }}>
                    <button style={styles.btnBook}>📅 Enter</button>
                  </Link>
                </div>
              </div>
            </div>

            <div style={styles.seedDots}>
              {SEEDS.map((_, i) => (
                <div key={i} style={styles.dot(i === activeIdx)}
                  onClick={() => { setActiveIdx(i); clearInterval(intervalRef.current) }} />
              ))}
            </div>

            <Link to="/browse-orchards" style={{ textDecoration: 'none' }}>
              <button style={styles.connectBtn} className="connect-btn">
                🌿 STEP INTO THE ORCHARD — FIND YOUR SEED
              </button>
            </Link>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={styles.rightPanel}>
          <div style={styles.panelSection}>
            <div style={styles.panelTitle}>📅 TODAY</div>
            <div style={styles.dateYear}>Year {sacredDate.year}</div>
            <div style={styles.dateLine}>
              Month {sacredDate.month} · Day {sacredDate.day}<br />
              Day 1 · Regular Day
            </div>
          </div>
          <div style={styles.omerBadge}>
            <span style={{ fontSize: 18 }}>🌾</span>
            <div>
              <div style={styles.omerText}>Omer {sacredDate.omer}/{sacredDate.omerTotal}</div>
              <div style={styles.omerNext}>→ {sacredDate.nextFeast}</div>
            </div>
          </div>
          <div style={styles.panelSection}>
            <div style={styles.panelTitle}>🌱 YOUR GROWTH</div>
            <div style={styles.growthCard}>
              <div style={styles.growthTitle}>Seeds this week</div>
              {[
                { label: 'Seeds planted', val: stats.seeds },
                { label: 'Seeds growing', val: stats.orchards },
                { label: 'Active sowers', val: stats.sowers },
                { label: 'Harvest forming', val: stats.members },
              ].map(({ label, val }) => (
                <div key={label} style={styles.growthRow}>
                  <span style={styles.growthLabel}>{label}</span>
                  <span style={styles.growthVal}>{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={styles.panelSection}>
            <div style={styles.panelTitle}>💡 SEEDFLOW TIP</div>
            <div style={styles.tipBox}>"{tip}"</div>
          </div>
        </div>
      </div>
    </>
  )
}