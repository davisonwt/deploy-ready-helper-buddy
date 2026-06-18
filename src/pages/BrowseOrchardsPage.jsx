import { useState, useEffect, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Button } from "../components/ui/button"
import { Progress } from "../components/ui/progress"
import { Heart, RefreshCw, Loader2 } from "lucide-react"
import { useCurrency } from "../hooks/useCurrency"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { processOrchardsUrls } from "../utils/urlUtils"
import { GradientPlaceholder } from "@/components/ui/GradientPlaceholder"
import { motion, AnimatePresence } from "framer-motion"
import LivingButton from "../components/LivingButton"

const WANDERING_ROLES = [
  { label: 'All Roles', value: 'all', emoji: '🌿' },
  { label: 'Wheel', value: 'Wheel', emoji: '🚗' },
  { label: 'Hand', value: 'Hand', emoji: '🤲' },
  { label: 'Whisperer', value: 'Whisperer', emoji: '🌬️' },
  { label: 'Pillow', value: 'Pillow', emoji: '🛏️' },
  { label: 'Field', value: 'Field', emoji: '🌾' },
  { label: 'Hearth', value: 'Hearth', emoji: '🔥' },
  { label: 'Heart', value: 'Heart', emoji: '💚' },
  { label: 'Forge', value: 'Forge', emoji: '⚒️' },
  { label: 'Story', value: 'Story', emoji: '🎥' },
]

const ORCHARD_TYPES = [
  { label: 'All Types', value: 'all' },
  { label: 'Community', value: 'community', emoji: '🏘️', color: '#6366f1', desc: 'Tribe funds a need together' },
  { label: 'Production', value: 'production', emoji: '🏭', color: '#f59e0b', desc: 'Fund a product into existence' },
  { label: 'Single Seed', value: 'single_seed', emoji: '🌱', color: '#10b981', desc: 'One seed, one bestow' },
]

const TYPE_CONFIG = {
  community: { color: '#6366f1', bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.4)', emoji: '🏘️', label: 'Community Orchard' },
  production: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', emoji: '🏭', label: 'Production Orchard' },
  single_seed: { color: '#10b981', bg: 'rgba(34,211,238,0.15)', border: 'rgba(34,211,238,0.35)', emoji: '🌱', label: 'Single Seed' },
  full_value: { color: '#10b981', bg: 'rgba(34,211,238,0.15)', border: 'rgba(34,211,238,0.35)', emoji: '🌱', label: 'Single Seed' },
}

const normalizeSongTitle = (title) =>
  (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

function UrgencyBar({ percentage }) {
  const isHot = percentage >= 70
  const isWarm = percentage >= 40
  const color = isHot ? '#ef4444' : isWarm ? '#f59e0b' : '#10b981'
  const label = isHot ? '🔥 Almost Full!' : isWarm ? '⚡ Filling Fast' : '🌱 Just Started'
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span style={{ fontSize: 11, color, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{percentage}%</span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ height: '100%', background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: 4, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
    </div>
  )
}

function OrchardCard({ orchard, index }) {
  const typeConfig = TYPE_CONFIG[orchard.orchard_type] || TYPE_CONFIG.single_seed
  const isHot = orchard.completion_percentage >= 70
  const pocketPrice = orchard.pocket_bestow || orchard.pocket_price || 2

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -4, scale: 1.01 }}
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        border: `1px solid ${typeConfig.border}`,
        borderRadius: 20, overflow: 'hidden',
        boxShadow: isHot ? `0 0 30px ${typeConfig.color}30` : '0 4px 20px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', height: 200 }}>
        {orchard.main_image ? (
          <img src={orchard.main_image} alt={orchard.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <GradientPlaceholder type="orchard" title={orchard.title} className="w-full h-full" size="lg" />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0f172a 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', top: 12, left: 12, background: typeConfig.bg, border: `1px solid ${typeConfig.border}`, borderRadius: 20, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5, backdropFilter: 'blur(8px)' }}>
          <span style={{ fontSize: 14 }}>{typeConfig.emoji}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: typeConfig.color }}>{typeConfig.label}</span>
        </div>
        {isHot && (
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(239,68,68,0.9)', borderRadius: 20, padding: '4px 10px' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>🔥 HOT</span>
          </motion.div>
        )}
        <div style={{ position: 'absolute', bottom: 12, left: 12 }}>
          <span style={{ background: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: '3px 8px', fontSize: 11, color: '#94a3b8', backdropFilter: 'blur(4px)' }}>
            {WANDERING_ROLES.find(r => r.value === orchard.category)?.emoji} {orchard.category}
          </span>
        </div>
      </div>

      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, lineHeight: 1.3 }}>{orchard.title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#64748b' }}>
            <span>👤 {orchard.grower_name}</span>
            {orchard.location && <span>📍 {orchard.location}</span>}
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{orchard.description}</p>
        <UrgencyBar percentage={orchard.completion_percentage} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8' }}>Pocket</div>
            <div style={{ color: typeConfig.color, fontWeight: 700, fontSize: 15 }}>${pocketPrice}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8' }}>Left</div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>{Math.max(0, (orchard.total_pockets || 0) - (orchard.filled_pockets || 0))}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8' }}>Supporters</div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>{orchard.supporters || 0}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8' }}>Views</div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>{orchard.views || 0}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/animated-orchard/${orchard.id}`} style={{ flex: 2, textDecoration: 'none' }}>
            <LivingButton variant="enter" height={48} borderRadius={12} fontSize={13} letterSpacing="1px">
              <Heart style={{ width: 16, height: 16 }} />
              Bestow ${pocketPrice}
            </LivingButton>
          </Link>
          <Link to={`/live-seed/${orchard.id}`} style={{ flex: 1, textDecoration: 'none' }}>
            <LivingButton variant="live" height={48} borderRadius={12} fontSize={12} letterSpacing="1px">
              Go Live
            </LivingButton>
          </Link>
        </div>

        {orchard.isOwner && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={`/edit-orchard/${orchard.id}`} style={{ flex: 1, textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '8px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>✏️ Edit</button>
            </Link>
            <button onClick={orchard.onDelete} style={{ flex: 1, padding: '8px 0', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>🗑️ Delete</button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function MediaGrid({ kind, items, loading }) {
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Loader2 style={{ width: 40, height: 40, color: '#10b981' }} /></div>
  if (!items.length) return <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>No {kind} from the tribe yet.</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
      {items.map((it, i) => (
        <motion.div key={it.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ aspectRatio: '16/9', background: '#020617', position: 'relative', overflow: 'hidden' }}>
            {it.image ? <img src={it.image} alt={it.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42 }}>{it.emoji}</div>}
            <div style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 8, background: 'rgba(0,0,0,0.6)', fontSize: 11, color: '#fff', fontWeight: 700 }}>{it.emoji} {kind.toUpperCase()}</div>
          </div>
          <div style={{ padding: 12 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>by {it.sower || 'Anonymous Sower'}</div>
            {it.link && (
              <Link to={it.link} style={{ textDecoration: 'none' }}>
                <LivingButton variant="enter" height={40} borderRadius={10} fontSize={12} letterSpacing="1px">
                  Open
                </LivingButton>
              </Link>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

const TABS = [
  { value: 'orchards', label: 'Orchards', emoji: '🌳' },
  { value: 'seeds', label: 'Seeds', emoji: '🌱' },
  { value: 'music', label: 'Music', emoji: '🎵' },
  { value: 'books', label: 'Books', emoji: '📚' },
  { value: 'videos', label: 'Videos', emoji: '🎬' },
]

export default function BrowseOrchardsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { formatAmount } = useCurrency()
  const [orchards, setOrchards] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [activeTab, setActiveTab] = useState('orchards')
  const [tribeSeeds, setTribeSeeds] = useState([])
  const [music, setMusic] = useState([])
  const [books, setBooks] = useState([])
  const [videos, setVideos] = useState([])
  const [mediaLoading, setMediaLoading] = useState(false)

  const fetchOrchards = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orchards')
        .select(`*, profiles:profile_id (first_name, last_name, display_name, location)`)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (error) throw error
      setOrchards(data || [])
    } catch (err) {
      toast.error('Failed to load orchards')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrchards() }, [])

  useEffect(() => {
    if (activeTab === 'orchards') return
    let cancelled = false
    ;(async () => {
      setMediaLoading(true)
      try {
        const [seedsRes, orchardSeedsRes, musicRes, booksRes, videosRes, productsRes] = await Promise.all([
          supabase.from('seeds')
            .select('id, title, description, images, gifter_id, created_at')
            .order('created_at', { ascending: false })
            .limit(60),
          // Also include all tribe orchards as seeds (every orchard IS a seed)
          supabase.from('orchards')
            .select('id, title, description, images, user_id, profile_id, created_at')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(60),
          supabase.from('dj_music_tracks')
            .select('id, track_title, artist_name, music_genre, genre, cover_image_url, file_url, dj_id, upload_date, created_at')
            .eq('is_public', true)
            .order('upload_date', { ascending: false })
            .limit(60),
          supabase.from('sower_books')
            .select('id, title, cover_image_url, image_urls, user_id, sower_id, created_at')
            .eq('is_available', true)
            .order('created_at', { ascending: false })
            .limit(60),
          supabase.from('community_videos')
            .select('id, title, description, thumbnail_url, video_url, uploader_id, uploader_profile_id, created_at')
            .in('status', ['approved', 'published'])
            .order('created_at', { ascending: false })
            .limit(60),
          // Also include all sower products (music/books/etc. uploaded as products)
          supabase.from('products')
            .select('id, title, description, type, cover_image_url, image_urls, sower_id, artist_name, created_at')
            .order('created_at', { ascending: false })
            .limit(200),
        ])
        if (cancelled) return
        const djIds = (musicRes.data || []).map(m => m.dj_id).filter(Boolean)
        const { data: djs } = djIds.length
          ? await supabase.from('radio_djs').select('id, user_id, dj_name, avatar_url').in('id', djIds)
          : { data: [] }
        const djMap = new Map((djs || []).map(d => [d.id, d]))
        const sowerIds = Array.from(new Set((productsRes.data || []).map(p => p.sower_id).filter(Boolean)
          .concat((booksRes.data || []).map(b => b.sower_id).filter(Boolean))))
        const { data: sowersRows } = sowerIds.length
          ? await supabase.from('sowers').select('id, user_id, display_name').in('id', sowerIds)
          : { data: [] }
        const sowerMap = new Map((sowersRows || []).map(s => [s.id, s]))
        const profileIds = Array.from(new Set([
          ...(seedsRes.data || []).map(s => s.gifter_id),
          ...(orchardSeedsRes.data || []).flatMap(o => [o.user_id, o.profile_id]),
          ...(booksRes.data || []).flatMap(b => [b.user_id, b.sower_id]),
          ...(videosRes.data || []).flatMap(v => [v.uploader_id, v.uploader_profile_id]),
          ...(djs || []).map(d => d.user_id),
          ...(sowersRows || []).map(s => s.user_id),
        ].filter(Boolean)))
        const { data: profiles } = profileIds.length
          ? await supabase.from('profiles').select('id, user_id, first_name, last_name, display_name').or(`id.in.(${profileIds.join(',')}),user_id.in.(${profileIds.join(',')})`)
          : { data: [] }
        const profileMap = new Map()
        ;(profiles || []).forEach(p => { if (p.id) profileMap.set(p.id, p); if (p.user_id) profileMap.set(p.user_id, p) })
        const sowerName = (p) => p?.display_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Anonymous Sower'
        const nameFromSower = (sowerId) => {
          const s = sowerMap.get(sowerId)
          return s?.display_name || sowerName(profileMap.get(s?.user_id)) || 'Anonymous Sower'
        }
        const musicCoverByTitle = new Map()
        ;(musicRes.data || []).forEach(m => {
          const key = normalizeSongTitle(m.track_title)
          if (key && m.cover_image_url) musicCoverByTitle.set(key, m.cover_image_url)
        })
        const seedsFromTable = (seedsRes.data || []).map(s => ({
          id: `seed-${s.id}`, title: s.title, image: (s.images && s.images[0]) || null, emoji: '🌱',
          sower: sowerName(profileMap.get(s.gifter_id)), link: '/orchard-alive', created_at: s.created_at,
        }))
        const seedsFromOrchards = (orchardSeedsRes.data || []).map(o => ({
          id: `orch-${o.id}`, title: o.title, image: (o.images && o.images[0]) || null, emoji: '🌳',
          sower: sowerName(profileMap.get(o.user_id) || profileMap.get(o.profile_id)), link: `/orchard/${o.id}`, created_at: o.created_at,
        }))
        const productRows = productsRes.data || []
        const musicFromProducts = productRows.filter(p => p.type === 'music').map(p => ({
          id: `prod-${p.id}`, title: p.title, image: p.cover_image_url || musicCoverByTitle.get(normalizeSongTitle(p.title)) || null, emoji: '🎵',
          sower: p.artist_name || nameFromSower(p.sower_id), link: '/music-library', created_at: p.created_at,
        }))
        const booksFromProducts = productRows.filter(p => p.type === 'ebook' || p.type === 'book').map(p => ({
          id: `prod-${p.id}`, title: p.title, image: p.cover_image_url || (p.image_urls && p.image_urls[0]) || null, emoji: '📚',
          sower: nameFromSower(p.sower_id), link: '/my-s2g-library', created_at: p.created_at,
        }))
        const seedsFromProducts = productRows.filter(p => !['music','ebook','book'].includes(p.type)).map(p => ({
          id: `prod-${p.id}`, title: p.title, image: p.cover_image_url || (p.image_urls && p.image_urls[0]) || null, emoji: '🌱',
          sower: nameFromSower(p.sower_id), link: '/products', created_at: p.created_at,
        }))
        const musicItems = [
          ...(musicRes.data || []).map(m => ({
            id: m.id, title: m.track_title, image: m.cover_image_url || null, emoji: '🎵',
            sower: m.artist_name || djMap.get(m.dj_id)?.dj_name || 'Tribe Music', link: '/music-library', created_at: m.upload_date || m.created_at,
          })),
          ...musicFromProducts,
        ]
        const bookItems = [
          ...(booksRes.data || []).map(b => ({
            id: b.id, title: b.title, image: b.cover_image_url || (b.image_urls && b.image_urls[0]) || null, emoji: '📚',
            sower: sowerName(profileMap.get(b.user_id) || profileMap.get(b.sower_id)), link: '/my-s2g-library', created_at: b.created_at,
          })),
          ...booksFromProducts,
        ]
        const videoItems = (videosRes.data || [])
          .filter(v => !String(v.title || '').toLowerCase().includes('broadcast') && !String(v.description || '').toLowerCase().includes('auto-imported from orchard upload'))
          .map(v => ({
          id: v.id, title: v.title, image: v.thumbnail_url || null, emoji: '🎬',
          sower: sowerName(profileMap.get(v.uploader_id) || profileMap.get(v.uploader_profile_id)), link: '/community-videos', created_at: v.created_at,
        }))
        setTribeSeeds([...seedsFromTable, ...seedsFromOrchards, ...seedsFromProducts, ...musicItems, ...bookItems, ...videoItems].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
        setMusic(musicItems)
        setBooks(bookItems)
        setVideos(videoItems)

      } catch (e) {
        console.error('media load error', e)
      } finally {
        if (!cancelled) setMediaLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [activeTab])

  const handleDelete = async (orchardId) => {
    if (!window.confirm('Delete this orchard?')) return
    const { error } = await supabase.from('orchards').delete().eq('id', orchardId)
    if (error) toast.error('Failed to delete')
    else { toast.success('Deleted'); fetchOrchards() }
  }

  const processed = useMemo(() => {
    const withUrls = processOrchardsUrls(orchards)
    return withUrls.map(o => {
      const total = (o.intended_pockets && o.intended_pockets > 1) ? o.intended_pockets : o.total_pockets || 1
      return {
        ...o,
        completion_percentage: Math.min(100, Math.round(((o.filled_pockets || 0) / total) * 100)),
        grower_name: o.profiles?.display_name || `${o.profiles?.first_name || ''} ${o.profiles?.last_name || ''}`.trim() || 'Anonymous Sower',
        main_image: o.images?.[0] || null,
        isOwner: user && o.user_id === user.id,
        onDelete: () => handleDelete(o.id),
      }
    })
  }, [orchards, user])

  const filtered = useMemo(() => {
    let results = processed
    if (selectedRole !== 'all') results = results.filter(o => o.category === selectedRole)
    if (selectedType !== 'all') results = results.filter(o => o.orchard_type === selectedType)
    results.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'hottest') return b.completion_percentage - a.completion_percentage
      if (sortBy === 'cheapest') return (a.pocket_bestow || a.pocket_price || 0) - (b.pocket_bestow || b.pocket_price || 0)
      return 0
    })
    return results
  }, [processed, selectedRole, selectedType, sortBy])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)', color: '#f1f5f9', paddingBottom: 90 }}>
      <style>{`
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 10px rgba(34,211,238,0.30)} 50%{box-shadow:0 0 25px rgba(34,211,238,0.55)} }
        .live-dot { width:8px;height:8px;border-radius:50%;background:#10b981;animation:pulse-glow 2s infinite; }
        @keyframes orchardBuzz {
          0%,100% { transform: translateY(0); opacity: 0.8; }
          50% { transform: translateY(-3px); opacity: 1; }
        }
        @keyframes fireflyDrift {
          0% { transform: translate(0,0); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translate(120px,-60px); opacity: 0; }
        }
        .firefly { position:absolute; width:4px; height:4px; border-radius:50%; background:#fbbf24; box-shadow:0 0 8px #fbbf24; animation: fireflyDrift 6s linear infinite; }
      `}</style>

      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{ position: 'sticky', top: 10, left: 20, zIndex: 120, margin: '12px 0 0 20px', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 14, border: '1px solid rgba(34,211,238,0.30)', background: 'rgba(2,6,23,0.92)', color: '#f1f5f9', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}
      >
        ← Go Back
      </button>

      {/* ── Buzzing tribal welcome banner ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse at top, rgba(34,211,238,0.14) 0%, rgba(2,6,23,0) 70%)',
        borderBottom: '1px solid rgba(34,211,238,0.15)',
        padding: '18px 20px 20px',
      }}>
        {/* fireflies */}
        {[...Array(8)].map((_,i)=>(
          <span key={i} className="firefly" style={{
            left: `${10 + i*11}%`, top: `${30 + (i%3)*20}%`,
            animationDelay: `${i*0.7}s`,
          }} />
        ))}
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', position: 'relative' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div className="live-dot" />
              <span style={{ fontSize: 11, color: '#10b981', fontWeight: 800, letterSpacing: '0.2em' }}>YOU'VE STEPPED INTO THE ORCHARD</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#e0f2fe', textShadow: '0 2px 12px rgba(34,211,238,0.35)', animation: 'orchardBuzz 3s ease-in-out infinite' }}>
              The tribe is buzzing — find your seed 🌿
            </h1>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
              Bestow on someone's vision · Sow your own · Or step into a Live Seed and meet the tribe
            </p>
          </div>
          <Link to="/dashboard" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, padding: '8px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>← Dashboard</Link>
        </div>
      </div>

      <div style={{ padding: '16px 20px 0', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={fetchOrchards} disabled={loading} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading ? <Loader2 style={{ width: 16, height: 16 }} /> : <RefreshCw style={{ width: 16, height: 16 }} />}
            Refresh
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
          {TABS.map(t => (
            <button key={t.value} onClick={() => setActiveTab(t.value)}
              style={{ padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                background: activeTab === t.value ? 'linear-gradient(135deg, #22d3ee, #0891b2)' : 'rgba(255,255,255,0.04)',
                color: activeTab === t.value ? '#fff' : '#94a3b8',
                boxShadow: activeTab === t.value ? '0 4px 15px rgba(34,211,238,0.35)' : 'none', transition: 'all 0.2s' }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'orchards' && (<>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Active Orchards', value: orchards.length, icon: '🌳', color: '#10b981' },
            { label: 'Hot (70%+)', value: processed.filter(o => o.completion_percentage >= 70).length, icon: '🔥', color: '#ef4444' },
            { label: 'Min Bestow', value: '$2', icon: '💚', color: '#6366f1' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'rgba(15,23,42,0.7)',
              border: `1px solid ${stat.color}40`,
              borderRadius: 16, padding: '12px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: `0 0 24px ${stat.color}22`,
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: `${stat.color}22`, border: `1px solid ${stat.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{stat.icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '.05em' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', marginBottom: 8 }}>FILTER BY WANDERING ROLE</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {WANDERING_ROLES.map(role => {
              const active = selectedRole === role.value
              return (
                <motion.button key={role.value}
                  whileTap={{ scale: 0.94 }} whileHover={{ y: -2, scale: 1.03 }}
                  onClick={() => setSelectedRole(role.value)}
                  style={{
                    padding: '10px 16px', borderRadius: 999, cursor: 'pointer',
                    fontWeight: 700, fontSize: 13,
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: active ? 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(8,145,178,0.10))' : 'rgba(15,23,42,0.6)',
                    color: active ? '#e0f7ff' : '#cbd5e1',
                    border: `1px solid ${active ? 'rgba(34,211,238,0.65)' : 'rgba(255,255,255,0.10)'}`,
                    boxShadow: active ? '0 0 24px rgba(34,211,238,0.35), inset 0 0 18px rgba(34,211,238,0.10)' : '0 2px 10px rgba(0,0,0,0.25)',
                    backdropFilter: 'blur(8px)', transition: 'all 0.25s',
                  }}>
                  <span style={{ fontSize: 16 }}>{role.emoji}</span> {role.label}
                </motion.button>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', marginBottom: 8 }}>FILTER BY TYPE</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ORCHARD_TYPES.map(type => {
              const active = selectedType === type.value
              const c = type.color || '#22d3ee'
              return (
                <motion.button key={type.value}
                  whileTap={{ scale: 0.94 }} whileHover={{ y: -2, scale: 1.03 }}
                  onClick={() => setSelectedType(type.value)}
                  style={{
                    padding: '10px 16px', borderRadius: 999, cursor: 'pointer',
                    fontWeight: 700, fontSize: 13,
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: active ? `linear-gradient(135deg, ${c}33, ${c}10)` : 'rgba(15,23,42,0.6)',
                    color: active ? '#fff' : '#cbd5e1',
                    border: `1px solid ${active ? `${c}aa` : 'rgba(255,255,255,0.10)'}`,
                    boxShadow: active ? `0 0 24px ${c}55, inset 0 0 18px ${c}22` : '0 2px 10px rgba(0,0,0,0.25)',
                    backdropFilter: 'blur(8px)', transition: 'all 0.25s',
                  }}>
                  {type.emoji && <span style={{ fontSize: 16 }}>{type.emoji}</span>} {type.label}
                </motion.button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {[{ label: '🕐 Newest', value: 'newest', c: '#22d3ee' }, { label: '🔥 Hottest', value: 'hottest', c: '#f97316' }, { label: '💚 Cheapest', value: 'cheapest', c: '#10b981' }].map(s => {
            const active = sortBy === s.value
            return (
              <motion.button key={s.value}
                whileTap={{ scale: 0.94 }} whileHover={{ y: -2 }}
                onClick={() => setSortBy(s.value)}
                style={{
                  padding: '9px 16px', borderRadius: 12, cursor: 'pointer',
                  background: active ? `linear-gradient(135deg, ${s.c}33, ${s.c}10)` : 'rgba(15,23,42,0.6)',
                  color: active ? '#fff' : '#94a3b8',
                  border: `1px solid ${active ? `${s.c}aa` : 'rgba(255,255,255,0.10)'}`,
                  boxShadow: active ? `0 0 18px ${s.c}55` : 'none',
                  fontWeight: 700, fontSize: 13, transition: 'all 0.25s',
                  backdropFilter: 'blur(8px)',
                }}>
                {s.label}
              </motion.button>
            )
          })}
        </div>
        </>)}
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 40px' }}>
        {activeTab === 'orchards' ? (
          loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <Loader2 style={{ width: 40, height: 40, color: '#10b981' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
              <h3 style={{ color: '#f1f5f9', fontSize: 20, marginBottom: 8 }}>No orchards found</h3>
              <p style={{ color: '#64748b' }}>Try a different filter or be the first to plant!</p>
              <Link to="/create-orchard" style={{ textDecoration: 'none' }}>
                <motion.button whileHover={{ scale: 1.05 }}
                  style={{ marginTop: 20, padding: '12px 24px', background: 'linear-gradient(135deg, #22d3ee, #0891b2)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                  🌱 Plant First Seed
                </motion.button>
              </Link>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Showing <span style={{ color: '#10b981', fontWeight: 700 }}>{filtered.length}</span> orchards
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                <AnimatePresence>
                  {filtered.map((orchard, i) => <OrchardCard key={orchard.id} orchard={orchard} index={i} />)}
                </AnimatePresence>
              </div>
            </>
          )
        ) : activeTab === 'seeds' ? (
          <MediaGrid kind="seeds" items={tribeSeeds} loading={mediaLoading} />
        ) : activeTab === 'music' ? (
          <MediaGrid kind="music" items={music} loading={mediaLoading} />
        ) : activeTab === 'books' ? (
          <MediaGrid kind="books" items={books} loading={mediaLoading} />
        ) : (
          <MediaGrid kind="videos" items={videos} loading={mediaLoading} />
        )}
      </div>

      {/* ── Sticky tribal action bar — Plant / Go Live / Chat ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', gap: 8, padding: '10px 12px',
        background: 'rgba(8,13,23,0.95)', backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(34,211,238,0.15)',
        zIndex: 100,
      }}>
        <Link to="/create-orchard" style={{ flex: 1, textDecoration: 'none' }}>
          <LivingButton variant="enter" height={48} borderRadius={14} fontSize={12} letterSpacing="1px">
            🌱 Plant Seed
          </LivingButton>
        </Link>
        <Link to="/chatapp" style={{ flex: 1, textDecoration: 'none' }}>
          <LivingButton variant="share" height={48} borderRadius={14} fontSize={12} letterSpacing="1px">
            💬 Chat
          </LivingButton>
        </Link>
      </div>
    </div>
  )
}
