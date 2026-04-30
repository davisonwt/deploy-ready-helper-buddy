import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
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
  single_seed: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', emoji: '🌱', label: 'Single Seed' },
  full_value: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', emoji: '🌱', label: 'Single Seed' },
}

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
          <Link to={`/animated-orchard/${orchard.id}`} style={{ flex: 1, textDecoration: 'none' }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ width: '100%', padding: '14px 0', background: `linear-gradient(135deg, ${typeConfig.color}, ${typeConfig.color}99)`, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 4px 20px ${typeConfig.color}40` }}>
              <Heart style={{ width: 18, height: 18 }} />
              Bestow from ${pocketPrice}
            </motion.button>
          </Link>
          <Link to={`/live-seed/${orchard.id}`} style={{ textDecoration: 'none' }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, color: '#ef4444', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              🔴 Go Live
            </motion.button>
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
                <button style={{ width: '100%', padding: '8px 0', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Open</button>
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
  { value: 'music', label: 'Music', emoji: '🎵' },
  { value: 'books', label: 'Books', emoji: '📚' },
  { value: 'videos', label: 'Videos', emoji: '🎬' },
]

export default function BrowseOrchardsPage() {
  const { user } = useAuth()
  const { formatAmount } = useCurrency()
  const [orchards, setOrchards] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [activeTab, setActiveTab] = useState('orchards')
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)', color: '#f1f5f9' }}>
      <style>{`
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 10px rgba(16,185,129,0.3)} 50%{box-shadow:0 0 25px rgba(16,185,129,0.6)} }
        .live-dot { width:8px;height:8px;border-radius:50%;background:#10b981;animation:pulse-glow 2s infinite; }
      `}</style>

      <div style={{ padding: '24px 20px 0', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <Link to="/dashboard" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, marginBottom: 16, padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>← Back to Dashboard</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div className="live-dot" />
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700, letterSpacing: '0.1em' }}>LIVE ORCHARDS</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Community Orchards</h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>Every bestow plants a seed that changes a life 🌱</p>
          </div>
          <button onClick={fetchOrchards} disabled={loading} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 16px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading ? <Loader2 style={{ width: 16, height: 16 }} /> : <RefreshCw style={{ width: 16, height: 16 }} />}
            Refresh
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Active Orchards', value: orchards.length, icon: '🌳', color: '#10b981' },
            { label: 'Hot (70%+)', value: processed.filter(o => o.completion_percentage >= 70).length, icon: '🔥', color: '#ef4444' },
            { label: 'Min Bestow', value: '$2', icon: '💚', color: '#6366f1' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{stat.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', marginBottom: 8 }}>FILTER BY WANDERING ROLE</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {WANDERING_ROLES.map(role => (
              <motion.button key={role.value} whileTap={{ scale: 0.95 }} onClick={() => setSelectedRole(role.value)}
                style={{ padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: selectedRole === role.value ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.05)', color: selectedRole === role.value ? '#fff' : '#94a3b8', boxShadow: selectedRole === role.value ? '0 4px 15px rgba(16,185,129,0.4)' : 'none', transition: 'all 0.2s' }}>
                {role.emoji} {role.label}
              </motion.button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', marginBottom: 8 }}>FILTER BY TYPE</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ORCHARD_TYPES.map(type => (
              <motion.button key={type.value} whileTap={{ scale: 0.95 }} onClick={() => setSelectedType(type.value)}
                style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${selectedType === type.value ? (type.color || '#10b981') : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', fontWeight: 600, fontSize: 13, background: selectedType === type.value ? `${type.color || '#10b981'}22` : 'rgba(255,255,255,0.03)', color: selectedType === type.value ? (type.color || '#10b981') : '#94a3b8', transition: 'all 0.2s' }}>
                {type.emoji && `${type.emoji} `}{type.label}
              </motion.button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[{ label: '🕐 Newest', value: 'newest' }, { label: '🔥 Hottest', value: 'hottest' }, { label: '💚 Cheapest', value: 'cheapest' }].map(s => (
            <button key={s.value} onClick={() => setSortBy(s.value)}
              style={{ padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: sortBy === s.value ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)', color: sortBy === s.value ? '#fff' : '#64748b', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 40px' }}>
        {loading ? (
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
                style={{ marginTop: 20, padding: '12px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
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
        )}
      </div>
    </div>
  )
}
