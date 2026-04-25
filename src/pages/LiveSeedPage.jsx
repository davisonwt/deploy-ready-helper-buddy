import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'sonner'
import { Heart, Loader2 } from 'lucide-react'

const SESSION_TYPES = [
  { value: 'training', label: 'Training', emoji: '🎓', color: '#6366f1', desc: 'Teach skills related to this seed' },
  { value: 'classroom', label: 'Classroom', emoji: '📚', color: '#f59e0b', desc: 'Structured learning session' },
  { value: 'skilldrop', label: 'Skill Drop', emoji: '⚡', color: '#10b981', desc: 'Quick skill share — in and out' },
  { value: 'radio', label: 'Radio', emoji: '📻', color: '#ec4899', desc: 'Audio broadcast with seed story' },
]

export default function LiveSeedPage() {
  const { orchardId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [seed, setSeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionType, setSessionType] = useState(null)
  const [liveCount, setLiveCount] = useState(0)

  useEffect(() => {
    const fetchSeed = async () => {
      const { data } = await supabase
        .from('orchards')
        .select('*, profiles:profile_id(first_name, last_name, display_name)')
        .eq('id', orchardId)
        .single()
      setSeed(data)
      setLoading(false)
    }
    fetchSeed()
  }, [orchardId])

  useEffect(() => {
    if (!sessionType) return
    setLiveCount(Math.floor(Math.random() * 8) + 1)
    const interval = setInterval(() => {
      setLiveCount(c => Math.max(1, c + Math.floor(Math.random() * 3) - 1))
    }, 5000)
    return () => clearInterval(interval)
  }, [sessionType])

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/live-seed/${orchardId}`)
    toast.success('Live session link copied!')
  }

  const pocketPrice = seed?.pocket_bestow || seed?.pocket_price || 2
  const typeConfig = sessionType || SESSION_TYPES[0]

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 40, height: 40, color: '#10b981' }} />
      </div>
    )
  }

  if (!sessionType) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020617, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 32, maxWidth: 480, width: '100%' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: 20, fontSize: 13 }}>← Back</button>
          <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>🔴 GO LIVE WITH THIS SEED</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>{seed?.title}</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Choose your live session type</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {SESSION_TYPES.map(type => (
              <motion.button key={type.value} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setSessionType(type)}
                style={{ background: `${type.color}15`, border: `1px solid ${type.color}40`, borderRadius: 16, padding: '20px 16px', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{type.emoji}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: type.color, marginBottom: 4 }}>{type.label}</div>
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{type.desc}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  const roomUrl = `https://meet.sow2growapp.com/s2g-seed-${orchardId}-${sessionType.value}`

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)', color: '#f1f5f9' }}>
      <style>{`@keyframes glow{0%,100%{box-shadow:0 0 10px rgba(239,68,68,0.4)}50%{box-shadow:0 0 30px rgba(239,68,68,0.8)}}.live-badge{animation:glow 2s infinite}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/browse-orchards" style={{ textDecoration: 'none', color: '#64748b', fontSize: 13 }}>← Exit</Link>
          <div className="live-badge" style={{ background: '#ef4444', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />LIVE
          </div>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>{sessionType.emoji} {sessionType.label}</span>
          <span style={{ fontSize: 13, color: '#10b981' }}>👁 {liveCount} watching</span>
        </div>
        <button onClick={handleShare} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          📤 Share Live
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', height: 'calc(100vh - 53px)', overflow: 'hidden' }}>
        <div style={{ background: '#000' }}>
          <iframe src={roomUrl} style={{ width: '100%', height: '100%', border: 'none' }}
            allow="camera; microphone; fullscreen; display-capture" title="Live Session" />
        </div>
        <div style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)', borderLeft: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {seed?.images?.[0] && (
            <div style={{ position: 'relative', height: 180 }}>
              <img src={seed.images[0]} alt={seed.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0f172a, transparent)' }} />
            </div>
          )}
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            <div style={{ background: `${typeConfig.color}20`, border: `1px solid ${typeConfig.color}40`, borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{typeConfig.emoji}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: typeConfig.color }}>{typeConfig.label} Session</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{typeConfig.desc}</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>🌱 SEED</div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', margin: 0, lineHeight: 1.3 }}>{seed?.title}</h2>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>by {seed?.profiles?.display_name || seed?.profiles?.first_name || 'Anonymous Sower'}</div>
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{seed?.description}</p>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{liveCount}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Watching</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: typeConfig.color }}>${pocketPrice}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Per Pocket</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{seed?.filled_pockets || 0}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Filled</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#94a3b8' }}>{Math.max(0, (seed?.total_pockets || 0) - (seed?.filled_pockets || 0))}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Left</div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Progress</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{Math.min(100, Math.round(((seed?.filled_pockets || 0) / (seed?.total_pockets || 1)) * 100))}%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.round(((seed?.filled_pockets || 0) / (seed?.total_pockets || 1)) * 100))}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: 4 }} />
              </div>
            </div>
            <Link to={`/animated-orchard/${orchardId}`} style={{ textDecoration: 'none' }}>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ width: '100%', padding: '16px 0', background: `linear-gradient(135deg, ${typeConfig.color}, ${typeConfig.color}99)`, border: 'none', borderRadius: 14, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Heart style={{ width: 20, height: 20 }} />
                Bestow from ${pocketPrice}
              </motion.button>
            </Link>
            <button onClick={handleShare} style={{ width: '100%', padding: '12px 0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              📤 Share this live session
            </button>
            <div style={{ fontSize: 11, color: '#374151', textAlign: 'center', paddingBottom: 8 }}>S2G Live · sow2growapp.com</div>
          </div>
        </div>
      </div>
    </div>
  )
}
