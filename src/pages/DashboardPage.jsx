import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from "@/integrations/supabase/client"
import SeedFlow from '../components/SeedFlow'
import LivingButton from '../components/LivingButton'
import { LetItRainPanel } from '../components/LetItRainPanel'
import { useSacredNow } from '../hooks/useSacredNow'
import { BeadPopup } from '../components/watch/BeadPopup'
import SeedSlider from '../components/garden/SeedSlider'
import LivingSeedCard from '../components/garden/LivingSeedCard'
import {
  buildSeedCard, buildOrchardCard, buildMusicCard,
  buildBookCard, buildVideoCard, deleteRow,
} from '../components/garden/seedCardBuilders'
import { toast } from 'sonner'
import DashboardTribeStats from '../components/dashboard/DashboardTribeStats'
import { useMyContent } from '@/api/sowerContent'
import TribalTiersCard from '../components/dashboard/TribalTiersCard'
import LiveNowStrip from '@/components/live/LiveNowStrip'
import SacredDayBanner from '@/components/SacredDayBanner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import VideoUploadModal from '@/components/community/VideoUploadModal.jsx'

const DAYS_PER_MONTH = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31]
function shiftYhwhDate(year, month, day, offset) {
  let m = month, d = day + offset, y = year
  while (d < 1) { m -= 1; if (m < 1) { m = 12; y -= 1 } d += DAYS_PER_MONTH[m - 1] }
  while (d > DAYS_PER_MONTH[m - 1]) { d -= DAYS_PER_MONTH[m - 1]; m += 1; if (m > 12) { m = 1; y += 1 } }
  return { year: y, month: m, day: d }
}

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
  { label: 'SeedFlow',         sub: 'Community updates',         emoji: '🏠', path: '/dashboard',            color: '#38bdf8' },
  { label: 'My Garden',        sub: 'Your seeds & orchards',     emoji: '🌱', path: '/my-orchards',           color: '#facc15' },
  { label: 'Tribal Gardens',   sub: 'All tribal seeds & orchards', emoji: '🌳', path: '/browse-orchards',     color: '#0d9488' },
  { label: 'ChatApp',          sub: 'Tribe messaging',           emoji: '💬', path: '/communications-hub',     color: '#0891b2' },
  { label: '364yhvh',          sub: 'Scripture & spiritual hub', emoji: '📅', path: '/364yhvh-days',          color: '#7c3aed' },
  { label: 'Let It Rain',      sub: 'Bestow blessings',          emoji: '🌧', path: 'action:let-it-rain',     color: '#ec4899' },
  { label: 'Learn & Share',    sub: 'Explainer videos',          emoji: '🎬', path: '/learn-share',           color: '#f97316' },
  { label: 'Wandering Hearts', sub: 'Tribal connections',        emoji: '💚', path: '/tribal-hearts',         color: '#dc2626' },
  { label: 'My Tribe',         sub: 'Your invitation code & tribe', emoji: '🌿', path: '/my-tribe',           color: '#22c55e' },
  { label: "Gosat's",          sub: 'Elder management',          emoji: '🏛', path: '/admin/dashboard',       color: '#7c3aed' },
]

const GROWTH_TIPS = [
  'Your seeds are in motion. Something is growing.',
  'The tribe moves when you move. Plant something today.',
  'Every bestowal is a seed. Every seed becomes a harvest.',
  "You've entered SeedFlow. Things are already happening.",
]


// ── Omer Badge with walking footsteps ────────────────────────────────────────
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
      ctx.textAlign = 'left'; ctx.fillText('🌾', 10, 24)

      // Omer count
      ctx.font = 'bold 18px Segoe UI, sans-serif'
      ctx.fillStyle = '#f59e0b'; ctx.textAlign = 'left'
      ctx.fillText('Omer ' + omer + '/' + omerTotal, 34, 22)

      // Arrow
      ctx.font = '11px Segoe UI, sans-serif'
      ctx.fillStyle = 'rgba(245,158,11,0.5)'
      ctx.fillText('→ ' + nextFeast, 34, 38)

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

// ── Day's Beads — current week strand, today highlighted ────────────────────
function WeekBeads({ sacred }) {
  // 7 days of the current week. weekDay 1..6 = work, 7 = Sabbath.
  const today = sacred.weekDay // 1..7
  const [picked, setPicked] = useState(null) // {year,month,day}
  const beads = Array.from({ length: 7 }, (_, i) => {
    const wd = i + 1 // 1..7
    const offset = wd - today
    const target = shiftYhwhDate(sacred.date.year, sacred.date.month, sacred.date.day, offset)
    const isToday = wd === today
    const isSabbath = wd === 7
    return { wd, dayNum: target.day, target, isToday, isSabbath }
  })

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)',
      border: '1px solid rgba(245,158,11,0.18)',
      borderRadius: 16,
      padding: '14px 16px 12px',
      marginBottom: 16,
      boxShadow: '0 0 30px rgba(245,158,11,0.06)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.08em' }}>
            Today in Creator's Count
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginTop: 2 }}>
            Year {sacred.date.year} · Day {sacred.dayOfYear}
          </div>
        </div>
        <Link to="/364yhvh-days?tab=journal" style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: '#22d3ee', textDecoration: 'none',
          background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)',
          borderRadius: 14, padding: '4px 10px', fontWeight: 700,
        }}>
          ✦ Journal / Diary
        </Link>
      </div>

      <div style={{
        background: '#040810', borderRadius: 14, padding: '14px 8px 10px',
        border: '1px solid rgba(255,255,255,0.04)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.18), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'relative',
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
        }}>
          {beads.map((b) => {
            const bg = b.isToday
              ? 'radial-gradient(circle at 30% 30%, #7dd3fc, #0284c7 70%)'
              : b.isSabbath
                ? 'radial-gradient(circle at 30% 30%, #fde68a, #b45309 75%)'
                : 'radial-gradient(circle at 30% 30%, #e2e8f0, #475569 75%)'
            const ring = b.isToday
              ? '0 0 18px #38bdf8aa, inset 0 0 6px #bae6fd'
              : b.isSabbath
                ? '0 0 14px #f59e0b88, inset 0 0 4px #fde68a'
                : 'inset 0 0 4px rgba(0,0,0,0.5)'
            return (
              <div key={b.wd} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setPicked(b.target)}
                  title={`Open ${b.target.year}/${b.target.month}/${b.target.day}`}
                  style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: bg, boxShadow: ring,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, cursor: 'pointer',
                    color: b.isToday ? '#0c1220' : b.isSabbath ? '#3a1d04' : '#1f2937',
                    border: b.isToday ? '2px solid #7dd3fc' : '1px solid rgba(255,255,255,0.15)',
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {b.dayNum > 0 ? b.dayNum : ''}
                </button>
                <div style={{ fontSize: 10, color: b.isToday ? '#38bdf8' : b.isSabbath ? '#f59e0b' : '#475569', fontWeight: 700 }}>
                  {b.isSabbath ? 'שבת' : b.wd}
                </div>
                {b.isToday && (
                  <div style={{ fontSize: 9, color: '#f472b6', fontWeight: 800, letterSpacing: '0.1em' }}>
                    TODAY
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{
          marginTop: 8, textAlign: 'center', fontSize: 10,
          color: '#92400e', letterSpacing: '0.18em', fontWeight: 700,
        }}>
          MONTH {sacred.date.month} · WEEK {Math.ceil(sacred.dayOfYear / 7)}
        </div>
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#cbd5e1',
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '4px 9px',
        }}>
          M{sacred.date.month} · D{sacred.date.day}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#cbd5e1',
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '4px 9px',
        }}>
          Day {sacred.weekDay}
        </span>
        {sacred.omer && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#fbbf24',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 10, padding: '4px 9px',
          }}>
            🌾 Omer {sacred.omer}/{sacred.omerTotal}
          </span>
        )}
        {sacred.isFeast && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#f472b6',
            background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.3)',
            borderRadius: 10, padding: '4px 9px',
          }}>
            🍷 {sacred.feastName}
          </span>
        )}
        {sacred.isSabbath && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#fde68a',
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: 10, padding: '4px 9px',
          }}>
            ✡ Sabbath
          </span>
        )}
      </div>
      {picked && (
        <BeadPopup
          isOpen={!!picked}
          onClose={() => setPicked(null)}
          year={picked.year}
          month={picked.month}
          day={picked.day}
        />
      )}
    </div>
  )
}

export default function SeedFlowDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [pulse, setPulse] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [stats, setStats] = useState({ sowers: 4, orchards: 0, seeds: 56, members: 0 })
  const [mySeeds, setMySeeds] = useState([])
  const [myOrchards, setMyOrchards] = useState([])
  const [myMusic, setMyMusic] = useState([])
  const [myBooks, setMyBooks] = useState([])
  const [myVideos, setMyVideos] = useState([])
  const [bestowedOrchards, setBestowedOrchards] = useState([])

  // Canonical "my content" — same source as My Garden via src/api/sowerContent.ts.
  const myContent = useMyContent(user?.id)
  useEffect(() => { setMySeeds(myContent.seeds || []) }, [myContent.seeds])
  useEffect(() => { setMyOrchards(myContent.orchards || []) }, [myContent.orchards])
  useEffect(() => { setMyMusic(myContent.music || []) }, [myContent.music])
  useEffect(() => { setMyBooks(myContent.books || []) }, [myContent.books])
  useEffect(() => { setMyVideos(myContent.videos || []) }, [myContent.videos])

  const [tip] = useState(GROWTH_TIPS[Math.floor(Math.random() * GROWTH_TIPS.length)])
  const [activePath, setActivePath] = useState('/dashboard')
  const [mobilePanel, setMobilePanel] = useState(null)
  const [isLetItRainOpen, setIsLetItRainOpen] = useState(false)
  const [showVideoUpload, setShowVideoUpload] = useState(false)
  const [plantMenuOpen, setPlantMenuOpen] = useState(false)
  const [tribalFeedsOpen, setTribalFeedsOpen] = useState(false)
  const tribalFeedsRef = useRef(null)
  useEffect(() => {
    if (!tribalFeedsOpen) return
    const onDocClick = (e) => {
      if (tribalFeedsRef.current && !tribalFeedsRef.current.contains(e.target)) {
        setTribalFeedsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [tribalFeedsOpen])
  const TRIBAL_FEED_TIERS = [
    { tier: 'homestead', label: 'Homestead', emoji: '🏡' },
    { tier: 'grove', label: 'Grove', emoji: '🌳' },
    { tier: 'orchard', label: 'Orchard', emoji: '🍎' },
    { tier: 'estate', label: 'Estate', emoji: '🏛️' },
    { tier: 'harvest_works', label: 'Harvest Works', emoji: '🏭' },
  ]
  const intervalRef = useRef(null)

  const firstImage = (...sources) => {
    for (const source of sources) {
      if (Array.isArray(source)) {
        const found = source.find(Boolean)
        if (found) return found
      } else if (source) {
        return source
      }
    }
    return null
  }

  // Live sunrise-based sacred date — ticks every minute, rolls at user's local sunrise.
  const sacred = useSacredNow()
  const sacredDate = {
    year: sacred.date.year,
    month: sacred.date.month,
    day: sacred.date.day,
    weekDay: sacred.weekDay,
    dayType: sacred.isSabbath ? 'Sabbath' : sacred.isFeast ? sacred.feastName || 'Feast Day' : 'Regular Day',
    omer: sacred.omer ?? 0,
    omerTotal: sacred.omerTotal,
    nextFeast: sacred.nextFeast,
  }

  useEffect(() => {
    if (!user) return
    const baseProfile = {
      first_name: user.first_name || user.user_metadata?.first_name || user.email?.split('@')[0] || 'Friend',
      last_name: user.last_name || user.user_metadata?.last_name || '',
      display_name: user.display_name || user.user_metadata?.display_name || user.user_metadata?.username || '',
      avatar_url: user.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      membership_tier: user.membership_tier || 'Sower',
    }
    setProfile(baseProfile)
    supabase.rpc('get_my_dashboard_profile')
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : data
        if (row) setProfile({ ...baseProfile, ...row })
      })
      .catch(() => {
        supabase.from('profiles').select('first_name, last_name, display_name, avatar_url, membership_tier').eq('user_id', user.id).maybeSingle()
          .then(({ data }) => data && setProfile({ ...baseProfile, ...data }))
      })
    supabase.from('sowers').select('*', { count: 'exact', head: true }).eq('is_verified', true)
      .then(({ count }) => setStats(s => ({ ...s, sowers: count || 4 })))
    supabase.from('orchards').select('*', { count: 'exact', head: true }).eq('status', 'active')
      .then(({ count }) => setStats(s => ({ ...s, orchards: count || 0 })))
    supabase.from('seeds').select('*', { count: 'exact', head: true })
      .then(({ count }) => setStats(s => ({ ...s, seeds: count || 56 })))
    // Canonical "my content" fetch happens in useMyContent below — do NOT add
    // direct seeds/products/orchards/books/videos queries for the signed-in
    // user here. Fix divergences in src/api/sowerContent.ts only.



    // Seeds I've bestowed into — orchards the user has supported
    supabase.from('bestowals')
      .select('orchard_id, created_at, orchards:orchard_id (id, title, description, category, images, orchard_type, created_at)')
      .eq('bestower_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        const seen = new Set()
        const unique = []
        for (const b of data || []) {
          if (b.orchards && !seen.has(b.orchards.id)) {
            seen.add(b.orchards.id)
            unique.push(b.orchards)
          }
        }
        setBestowedOrchards(unique)
      })
  }, [user])

  // Build display list from user's own content (preferred) or fallback showcase.
  const CATEGORY_META = {
    music:     { color: '#16a34a', glow: '#22c55e', emoji: '🎵', label: 'Music' },
    video:     { color: '#dc2626', glow: '#f87171', emoji: '🎬', label: 'Video' },
    art:       { color: '#a16207', glow: '#f59e0b', emoji: '🎨', label: 'Art' },
    craft:     { color: '#9a3412', glow: '#fb923c', emoji: '🪡', label: 'Craft' },
    food:      { color: '#65a30d', glow: '#a3e635', emoji: '🍞', label: 'Food' },
    service:   { color: '#0e7490', glow: '#06b6d4', emoji: '🛠', label: 'Service' },
    teaching:  { color: '#7c3aed', glow: '#a78bfa', emoji: '📖', label: 'Teaching' },
    prayer:    { color: '#92400e', glow: '#f59e0b', emoji: '🙏', label: 'Prayer' },
    book:      { color: '#7c2d12', glow: '#fb923c', emoji: '📚', label: 'Book' },
    other:     { color: '#475569', glow: '#94a3b8', emoji: '🌱', label: 'Seed' },
  }
  const catMeta = (c) => CATEGORY_META[(c || 'other').toLowerCase()] || CATEGORY_META.other

  const seedCards = mySeeds.map((s) => {
    const meta = catMeta(s.category)
    return {
      id: `seed-${s.id}`,
      name: s.title || 'Untitled Seed',
      type: meta.label.toUpperCase(),
      status: 'Yours',
      activity: meta.label,
      description: s.description || 'A seed you planted',
      image: (s.images && s.images[0]) || 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
      color: meta.color, glow: meta.glow, emoji: meta.emoji,
      playPath: `/seed/${s.id}`, bookPath: `/seed/${s.id}`,
      mine: true, badge: { label: 'seed', emoji: '🌱', color: '#22c55e' },
    }
  })

  const orchardCards = myOrchards.map((o) => {
    const meta = catMeta(o.category)
    return {
      id: `myorchard-${o.id}`,
      name: o.title || 'My Orchard',
      type: (o.orchard_type || meta.label).toString().toUpperCase().replace('_', ' '),
      status: 'Yours',
      activity: meta.label,
      description: o.description || 'An orchard you are growing',
      image: (o.images && o.images[0]) || 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
      color: '#16a34a', glow: '#4ade80', emoji: '🌳',
      playPath: `/animated-orchard/${o.id}`, bookPath: `/animated-orchard/${o.id}`,
      mine: true, badge: { label: 'orchard', emoji: '🌳', color: '#22c55e' },
    }
  })

  const musicCards = myMusic.map((m) => ({
    id: `music-${m.id}`,
    name: m.track_title || 'Untitled Track',
    type: 'MUSIC',
    status: 'Yours',
    activity: m.music_genre || m.genre || 'Music',
    description: m.music_mood || 'A song you have sown',
    image: (Array.isArray(m.image_urls) && m.image_urls[0]) || m.cover_image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
    color: '#0ea5e9', glow: '#38bdf8', emoji: '🎵',
    playPath: `/music-library`, bookPath: `/music-library`,
    mine: true, badge: { label: 'music', emoji: '🎵', color: '#38bdf8' },
  }))

  const bookCards = myBooks.map((b) => ({
    id: `book-${b.id}`,
    name: b.title || 'Untitled Book',
    type: 'BOOK',
    status: 'Yours',
    activity: b.genre || 'Book',
    description: b.description || 'A book you have written',
    image: b.cover_image_url || (b.image_urls && b.image_urls[0]) || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800&q=80',
    color: '#7c2d12', glow: '#fb923c', emoji: '📚',
    playPath: `/seed/${b.id}`, bookPath: `/seed/${b.id}`,
    mine: true, badge: { label: 'book', emoji: '📚', color: '#fb923c' },
  }))

  const videoCards = myVideos.map((v) => ({
    id: `video-${v.id}`,
    name: v.title || 'Untitled Video',
    type: 'VIDEO',
    status: 'Yours',
    activity: 'Video',
    description: v.description || 'A video you have shared',
    image: v.thumbnail_url || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80',
    color: '#dc2626', glow: '#f87171', emoji: '🎬',
    playPath: `/community-videos`, bookPath: `/community-videos`,
    mine: true, badge: { label: 'video', emoji: '🎬', color: '#f87171' },
  }))

  const bestowedCards = bestowedOrchards.map((o) => {
    const meta = catMeta(o.category)
    return {
      id: `bestowed-${o.id}`,
      name: o.title || 'Tribe Orchard',
      type: (o.orchard_type || meta.label).toString().toUpperCase().replace('_', ' '),
      status: 'Tending',
      activity: meta.label,
      description: o.description || 'A seed you are tending in the tribe',
      image: (o.images && o.images[0]) || 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
      color: '#15803d', glow: '#4ade80', emoji: '💚',
      playPath: `/animated-orchard/${o.id}`, bookPath: `/animated-orchard/${o.id}`,
      mine: false, badge: { label: 'bestowed', emoji: '💚', color: '#4ade80' },
    }
  })

  const mineCards = [...seedCards, ...orchardCards, ...musicCards, ...bookCards, ...videoCards]
  const userCards = [...mineCards, ...bestowedCards]
  const displaySeeds = userCards.length ? userCards : SEEDS
  const safeIdx = activeIdx % Math.max(displaySeeds.length, 1)
  const activeSeed = displaySeeds[safeIdx] || SEEDS[0]
  const displayName = profile?.display_name || profile?.first_name || user?.display_name || user?.first_name || user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Friend'

  // ── Owner action handlers (shared across all 5 sliders) ──
  const handleEdit = (card) => {
    const rid = card.rawId
    if (card.id.startsWith('orchard-')) navigate(`/create-orchard?edit=${rid}`)
    else if (card.id.startsWith('seed-')) navigate(`/seed/${rid}?edit=1`)
    else if (card.id.startsWith('music-')) navigate(`/music-library?edit=${rid}`)
    else if (card.id.startsWith('book-')) navigate(`/my-s2g-library?edit=${rid}`)
    else if (card.id.startsWith('video-')) navigate(`/community-videos?edit=${rid}`)
  }
  const handleRepost = (card) => {
    toast.success(`Reposted "${card.title}" to the tribe feed`)
  }
  const handlePark = (card) => {
    toast(`Parked "${card.title}" — hidden from public until you re-publish.`)
  }
  const handleDelete = async (card) => {
    if (!confirm(`Delete "${card.title}"? This cannot be undone.`)) return
    const tableMap = {
      'seed-': 'seeds', 'orchard-': 'orchards', 'music-': 'dj_music_tracks',
      'book-': 'sower_books', 'video-': 'community_videos',
    }
    const prefix = Object.keys(tableMap).find(p => card.id.startsWith(p))
    if (!prefix) return
    try {
      await deleteRow(supabase, tableMap[prefix], card.rawId)
      toast.success(`"${card.title}" deleted`)
      // Optimistic local removal
      if (prefix === 'seed-') setMySeeds(s => s.filter(x => x.id !== card.rawId))
      if (prefix === 'orchard-') setMyOrchards(s => s.filter(x => x.id !== card.rawId))
      if (prefix === 'music-') setMyMusic(s => s.filter(x => x.id !== card.rawId))
      if (prefix === 'book-') setMyBooks(s => s.filter(x => x.id !== card.rawId))
      if (prefix === 'video-') setMyVideos(s => s.filter(x => x.id !== card.rawId))
    } catch (e) {
      toast.error(`Could not delete: ${e.message}`)
    }
  }
  const ownerHandlers = { onEdit: handleEdit, onRepost: handleRepost, onPark: handlePark, onDelete: handleDelete }

  // Build per-category card lists for the 5 stacked sliders.
  const seedSliderCards    = mySeeds.map(s   => buildSeedCard(s, ownerHandlers))
  const orchardSliderCards = [
    ...myOrchards.map(o => buildOrchardCard(o, ownerHandlers)),
    ...bestowedOrchards.map(o => buildOrchardCard(o, {}, { bestowed: true })),
  ]
  const musicSliderCards   = myMusic.map(m   => buildMusicCard(m, ownerHandlers))
  const bookSliderCards    = myBooks.map(b   => buildBookCard(b, ownerHandlers))
  const videoSliderCards   = myVideos.map(v  => buildVideoCard(v, ownerHandlers))

  useEffect(() => {
    const total = displaySeeds.length
    intervalRef.current = setInterval(() => {
      setPulse(true)
      setTimeout(() => setPulse(false), 600)
      setActiveIdx(i => (i + 1) % Math.max(total, 1))
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [displaySeeds.length])

  const styles = {
    root: {
      display: 'flex', height: 'calc(100vh - 70px)', width: '100vw',
      background: '#060a12', color: '#e2e8f0',
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      overflow: 'hidden', position: 'fixed', top: 0, left: 0, zIndex: 50,
    },
    sidebar: {
      width: 260, minWidth: 260,
      background: '#0a0f1a',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
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
      overflowY: 'auto', minHeight: 0,
      display: 'flex', flexDirection: 'column', gap: 6,
    },
    navItem: (isActive, color) => ({
      display: 'flex', alignItems: 'center', gap: 11,
      padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
      background: isActive
        ? `linear-gradient(135deg, ${color}55, ${color}33)`
        : `linear-gradient(135deg, ${color}33, ${color}1a)`,
      border: isActive ? `1px solid ${color}` : `1px solid ${color}44`,
      boxShadow: isActive ? `0 0 18px ${color}66` : `inset 0 1px 0 ${color}22`,
      transition: 'all 0.15s ease', textDecoration: 'none',
    }),
    navEmoji: (isActive, color) => ({
      width: 36, height: 36, borderRadius: 9, fontSize: 18,
      background: isActive ? color + '66' : color + '33',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1px solid ${color}66`, flexShrink: 0,
    }),
    navLabel: { fontWeight: 700, fontSize: 14, color: '#f1f5f9', lineHeight: 1.2 },
    navSub: { fontSize: 11, color: 'rgba(226,232,240,0.65)', lineHeight: 1.3, marginTop: 2 },
    bottomBar: {
      padding: '10px 8px',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', gap: 6,
    },
    center: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' },
    header: {
      padding: '18px 22px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: '#080d17',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 10,
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
      padding: '18px 14px', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 22,
      height: '100%', minHeight: 0,
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
        .s2g-mobile-panel-tab, .s2g-mobile-backdrop { display: none; }
        @media (max-width: 768px) {
          .s2g-dashboard-root { top: 0 !important; height: calc(100vh - 70px) !important; height: calc(100dvh - 70px) !important; }
          .s2g-dashboard-center { width: 100vw !important; flex: 1 1 100% !important; }
          .s2g-dashboard-header { padding: 12px 48px !important; }
          .s2g-dashboard-header h1, .s2g-dashboard-header h2 { font-size: inherit !important; }
          .s2g-dashboard-header > div:first-child { min-width: 0; }
          .s2g-dashboard-header > div:first-child > div:last-child { min-width: 0; }
          .s2g-dashboard-header > div:first-child > div:last-child > div:first-child { font-size: 14px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100vw - 150px); }
          .s2g-dashboard-content { padding: 14px 10px 18px !important; }
          .s2g-dashboard-sidebar, .s2g-dashboard-right-panel {
            position: fixed !important; top: 0 !important; bottom: 70px !important; height: auto !important;
            z-index: 180 !important; transition: transform 0.24s ease !important;
            box-shadow: 0 22px 70px rgba(0,0,0,0.55); max-width: min(84vw, 310px);
          }
          .s2g-dashboard-sidebar { left: 0 !important; transform: translateX(-105%); }
          .s2g-dashboard-right-panel { right: 0 !important; transform: translateX(105%); }
          .s2g-dashboard-sidebar.is-open, .s2g-dashboard-right-panel.is-open { transform: translateX(0); }
          .s2g-mobile-panel-tab {
            display: inline-flex; position: fixed; top: 50%; transform: translateY(-50%); z-index: 190;
            width: 36px; height: 68px; align-items: center; justify-content: center;
            border: 1px solid rgba(255,255,255,0.16); background: rgba(8,13,23,0.88);
            color: #f8fafc; backdrop-filter: blur(12px); font-size: 20px;
          }
          .s2g-mobile-panel-tab-left { left: 0; border-radius: 0 18px 18px 0; }
          .s2g-mobile-panel-tab-right { right: 0; border-radius: 18px 0 0 18px; }
          .s2g-mobile-backdrop.is-open { display: block; position: fixed; inset: 0 0 70px; z-index: 170; background: rgba(0,0,0,0.45); }
        }
      `}</style>

      <div className="s2g-dashboard-root" style={styles.root}>

        {/* SeedFlow top strip removed per request */}
        <button
          type="button"
          className="s2g-mobile-panel-tab s2g-mobile-panel-tab-left"
          aria-label="Open dashboard menu"
          onClick={() => setMobilePanel(mobilePanel === 'left' ? null : 'left')}
        >
          ☰
        </button>
        <button
          type="button"
          className="s2g-mobile-panel-tab s2g-mobile-panel-tab-right"
          aria-label="Open today panel"
          onClick={() => setMobilePanel(mobilePanel === 'right' ? null : 'right')}
        >
          📅
        </button>
        <button
          type="button"
          aria-label="Close side panel"
          className={`s2g-mobile-backdrop ${mobilePanel ? 'is-open' : ''}`}
          onClick={() => setMobilePanel(null)}
        />

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <div className={`s2g-dashboard-sidebar ${mobilePanel === 'left' ? 'is-open' : ''}`} style={styles.sidebar}>
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
              const isAction = typeof item.path === 'string' && item.path.startsWith('action:')
              const isActive = !isAction && activePath === item.path
              const handleAction = (e) => {
                if (!isAction) return
                e.preventDefault()
                const action = item.path.split(':')[1]
                if (action === 'let-it-rain') {
                  setIsLetItRainOpen(true)
                }
                setMobilePanel(null)
              }
              if (isAction) {
                return (
                  <a key={item.label} href="#" className="nav-link"
                    onClick={handleAction}
                    style={styles.navItem(false, item.color)}>
                    <div style={styles.navEmoji(false, item.color)}>{item.emoji}</div>
                    <div>
                      <div style={styles.navLabel}>{item.label}</div>
                      <div style={styles.navSub}>{item.sub}</div>
                    </div>
                  </a>
                )
              }
              return (
                <Link key={item.label} to={item.path} className="nav-link"
                  onClick={() => { setActivePath(item.path); setMobilePanel(null) }}
                  style={styles.navItem(isActive, item.color)}>
                  <div style={styles.navEmoji(isActive, item.color)}>{item.emoji}</div>
                  <div>
                    <div style={styles.navLabel}>
                      {item.label}
                      {isActive && item.label === 'SeedFlow' && (
                        <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                          Active
                        </span>
                      )}
                    </div>
                    <div style={styles.navSub}>{item.sub}</div>
                  </div>
                </Link>
              )

            })}
          </nav>

        </div>

        {/* ── CENTER ──────────────────────────────────────────── */}
        <div className="s2g-dashboard-center" style={styles.center}>

          <SacredDayBanner />



          <div className="s2g-dashboard-header" style={{ ...styles.header, flexWrap: 'wrap', rowGap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 240px', minWidth: 0 }}>

              <div style={styles.avatar}>
                {profile?.avatar_url
                  ? <img
                      src={profile.avatar_url}
                      alt="Your avatar"
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  : '🧑'}
              </div>
               <div style={{ minWidth: 0 }}>
                 <div style={styles.greeting}>Welcome back, {displayName} — your seeds are in motion</div>
                 <div style={styles.greetingSub}>
                   Shalom · Year {sacredDate.year} · Month {sacredDate.month} · Day {sacredDate.day}
                 </div>
               </div>
             </div>

              {/* single-row actions: Feeds · Companions · Log out · Settings — kept inline on mobile */}
              <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 6, width: '100%', marginTop: 4 }}>
                 <div ref={tribalFeedsRef} style={{ position: 'relative', flexShrink: 0 }}>
                   <button
                     type="button"
                     onClick={() => setTribalFeedsOpen((v) => !v)}
                     aria-haspopup="menu"
                     aria-expanded={tribalFeedsOpen}
                     style={{
                       ...styles.seedflowLabel,
                       background: 'linear-gradient(135deg, rgba(22,163,74,0.25), rgba(34,197,94,0.18), rgba(132,204,22,0.22))',
                       backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                       border: '1px solid rgba(134,239,172,0.45)',
                       color: '#dcfce7', fontWeight: 700,
                       boxShadow: '0 4px 16px rgba(34,197,94,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
                       cursor: 'pointer',
                       display: 'inline-flex', alignItems: 'center', gap: 4,
                       padding: '4px 8px', fontSize: 11, whiteSpace: 'nowrap',
                     }}
                   >
                     🌿 Feeds <span style={{ fontSize: 9, opacity: 0.8 }}>▾</span>
                   </button>
                  {tribalFeedsOpen && (
                    <div
                      role="menu"
                      style={{
                        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
                        minWidth: 200,
                        background: 'rgba(10,15,12,0.96)',
                        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(134,239,172,0.35)',
                        borderRadius: 14,
                        padding: 6,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                      }}
                    >
                      {TRIBAL_FEED_TIERS.map((t) => (
                        <Link
                          key={t.tier}
                          to={`/orchard-alive?tier=${t.tier}`}
                          onClick={() => setTribalFeedsOpen(false)}
                          role="menuitem"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px', borderRadius: 10,
                            color: '#dcfce7', textDecoration: 'none',
                            fontSize: 14, fontWeight: 600,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.15)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <span style={{ fontSize: 16 }}>{t.emoji}</span>
                          {t.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <Link to="/companions" style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div style={{
                    ...styles.seedflowLabel,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.18), rgba(236,72,153,0.22))',
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(196,181,253,0.45)',
                    color: '#ede9fe', fontWeight: 700,
                    boxShadow: '0 4px 16px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
                    padding: '4px 8px', fontSize: 11, whiteSpace: 'nowrap',
                  }}>
                    🐧 Companions
                  </div>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={async () => {
                      try { await logout() } catch {}
                      navigate('/login')
                    }}
                    aria-label="Log out"
                    title="Log out"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 8px', borderRadius: 999,
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.45)',
                      color: '#fecaca', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#fecaca' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Log out
                  </button>
                 <Link
                   to="/profile"
                   aria-label="Open your profile & settings"
                   title="Profile & settings"
                   style={{
                     width: 32, height: 32, borderRadius: '50%',
                     display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                     background: 'rgba(255,255,255,0.04)',
                     border: '1px solid rgba(255,255,255,0.1)',
                     color: '#9ca3af', textDecoration: 'none',
                     transition: 'all 0.2s',
                   }}
                   onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'rotate(45deg)' }}
                   onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'rotate(0)' }}
                 >
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />

                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          <div className="s2g-dashboard-content" style={styles.content}>
            {/* ── Live now strip — anyone going live shows up here instantly ── */}
            <LiveNowStrip className="mb-3" />

            {/* ── Tribe size · Bestowals · Unread messages ── */}
            <DashboardTribeStats />

            {/* ── Tribal Tiers — jump to each SeedFlow by business scale ── */}
            <TribalTiersCard />

            {/* ── Day's Beads — current week strand ── */}
            <div style={styles.sectionLabel}>
              <span>💎 Day's Beads</span>
            </div>
            <WeekBeads sacred={sacred} />

            {/* Tribal Feeds button moved to header under SeedFlow active */}


            <div style={styles.sectionLabel}>
              <span>{userCards.length ? 'Your Living Garden' : 'Seeds in motion'}</span>
              <span style={styles.liveTag}>{userCards.length ? `${mineCards.length} mine · ${bestowedCards.length}💚` : 'LIVE'}</span>
            </div>

            {/* ── Your own seeds — vertical scrollable feed, one per row ── */}
            {(() => {
              const ownCards = [
                ...seedSliderCards,
                ...myOrchards.map(o => buildOrchardCard(o, ownerHandlers)),
                ...musicSliderCards,
                ...bookSliderCards,
                ...videoSliderCards,
              ]
              if (ownCards.length === 0) {
                return (
                  <div style={{
                    padding: 24, textAlign: 'center',
                    background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 14, color: '#64748b', fontSize: 13, fontStyle: 'italic',
                  }}>
                    You haven't planted any seeds yet — tap "Plant Seed" below to start.
                  </div>
                )
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {ownCards.map((c) => (
                    <LivingSeedCard
                      key={c.id}
                      seedId={c.liveKey || c.rawId || c.id}
                      title={c.title}
                      subtitle={c.subtitle}
                      image={c.image}
                      images={c.images}
                      openPath={c.openPath}
                      mediaUrl={c.mediaUrl}
                      mediaKind={c.mediaKind}
                      badge={c.badge}
                      mine={c.mine}
                      whispererSharePct={c.whispererSharePct}
                      onEdit={c.onEdit ? () => c.onEdit(c) : undefined}
                      onDelete={c.onDelete ? () => c.onDelete(c) : undefined}
                      onRepost={c.onRepost ? () => c.onRepost(c) : undefined}
                      onPark={c.onPark ? () => c.onPark(c) : undefined}
                    />
                  ))}
                </div>
              )
            })()}

            {/* Bestowed orchards — still shown as a rotating slider since they're not "yours" */}
            {bestowedOrchards.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <SeedSlider
                  title="Tending in the Tribe"
                  emoji="💚"
                  accent="#4ade80"
                  cards={bestowedOrchards.map(o => buildOrchardCard(o, {}, { bestowed: true }))}
                  emptyHint=""
                />
              </div>
            )}

            {/* Step Into the Orchard moved to floating button (see fixed wrapper below) */}
          </div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────── */}
        <div className={`s2g-dashboard-right-panel ${mobilePanel === 'right' ? 'is-open' : ''}`} style={styles.rightPanel}>
          <div style={styles.panelSection}>
            <div style={styles.panelTitle}>📅 TODAY</div>
            <div style={styles.dateYear}>Year {sacredDate.year}</div>
            <div style={styles.dateLine}>
              Month {sacredDate.month} · Day {sacredDate.day}<br />
              Day {sacredDate.weekDay} · {sacredDate.dayType}
            </div>
          </div>
          <OmerBadge omer={sacredDate.omer} omerTotal={sacredDate.omerTotal} nextFeast={sacredDate.nextFeast} />
          <div style={styles.panelSection}>
            <div style={styles.panelTitle}>🌱 YOUR GROWTH</div>
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
            <div style={styles.panelTitle}>💡 SEEDFLOW TIP</div>
            <div style={styles.tipBox}>"{tip}"</div>
          </div>
        </div>

        {/* ── Full width bottom bar ── */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          display: 'flex', gap: 8, padding: '10px 12px',
          background: '#080d17',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          zIndex: 100,
        }}>
          <Popover open={plantMenuOpen} onOpenChange={setPlantMenuOpen}>
            <PopoverTrigger asChild>
              <div style={{ flex: 1, cursor: 'pointer' }}>
                <LivingButton variant="enter" height={50} borderRadius={14} fontSize={12} letterSpacing="1px">
                  🌱 Plant Seed
                </LivingButton>
              </div>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-56 p-2 bg-slate-900 border-slate-700">
              <button
                type="button"
                onClick={() => { setPlantMenuOpen(false); navigate('/create-orchard') }}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-white hover:bg-white/10 flex items-center gap-2"
              >
                🌱 <span>Plant a Seed</span>
              </button>
              <button
                type="button"
                onClick={() => { setPlantMenuOpen(false); setShowVideoUpload(true) }}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-white hover:bg-white/10 flex items-center gap-2"
              >
                🎬 <span>Upload a Video</span>
              </button>
            </PopoverContent>
          </Popover>
          <Link to="/communications-hub" style={{ flex: 1, textDecoration: 'none' }}>
            <LivingButton variant="live" height={50} borderRadius={14} fontSize={12} letterSpacing="1px">
              🔴 Go Live
            </LivingButton>
          </Link>
          <Link to="/chatapp" style={{ flex: 1, textDecoration: 'none' }}>
            <LivingButton variant="share" height={50} borderRadius={14} fontSize={12} letterSpacing="1px">
              💬 Chat
            </LivingButton>
          </Link>
        </div>
        <LetItRainPanel isOpen={isLetItRainOpen} onClose={() => setIsLetItRainOpen(false)} />
        <VideoUploadModal isOpen={showVideoUpload} onClose={() => setShowVideoUpload(false)} />
      </div>
    </>
  )
}
