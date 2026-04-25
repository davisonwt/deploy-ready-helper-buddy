import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { JitsiMeeting } from '@jitsi/react-sdk'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'sonner'
import { Heart, Users, Radio, BookOpen, Zap, GraduationCap, Share2, X, ChevronRight } from 'lucide-react'

const SESSION_TYPES = [
  { value: 'training', label: 'Training', emoji: '🎓', color: '#6366f1', desc: 'Teach skills related to this seed' },
  { value: 'classroom', label: 'Classroom', emoji: '📚', color: '#f59e0b', desc: 'Structured learning session' },
  { value: 'skilldrop', label: 'Skill Drop', emoji: '⚡', color: '#10b981', desc: 'Quick skill share — in and out' },
  { value: 'radio', label: 'Radio', emoji: '📻', color: '#ec4899', desc: 'Audio broadcast with seed story' },
]

function SessionPicker({ seed, onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24, padding: 32, maxWidth: 480, width: '100%',
          position: 'relative'
        }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>✕</button>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>🔴 GO LIVE WITH THIS SEED</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>{seed?.title}</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Choose your live session type</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {SESSION_TYPES.map(type => (
            <motion.button
              key={type.value}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(type)}
              style={{
                background: `${type.color}15`,
                border: `1px solid ${type.color}40`,
                borderRadius: 16, padding: '20px 16px',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{type.emoji}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: type.color, marginBottom: 4 }}>{type.label}</div>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{type.desc}</div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function LiveSeedPage() {
  const { orchardId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [seed, setSeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionType, setSessionType] = useState(null)
  const [showPicker, setShowPicker] = useState(true)
  const [liveCount, setLiveCount] = useState(0)
  const [bestowCount, setBestowCount] = useState(0)
  const [showShareToast, setShowShareToast] = useState(false)

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

  // Simulate live viewer count
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

  const roomName = `s2g-seed-${orchardId}-${sessionType?.value || 'live'}`
  const displayName = user?.email?.split('@')[0] || 'Sower'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 2s infinite' }}>🌱</div>
          <div style={{ color: '#10b981', fontWeight: 700 }}>Loading seed...</div>
        </div>
      </div>
    )
  }

  const pocketPrice = seed?.pocket_bestow || seed?.pocket_price || 2
  const typeConfig = sessionType || SESSION_TYPES[0]

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)', color: '#f1f5f9', overflow: 'hidden' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes glow { 0%,100%{box-shadow:0 0 10px rgba(239,68,68,0.4)} 50%{box-shadow:0 0 30px rgba(239,68,68,0.8)} }
        .live-badge { animation: glow 2s infinite; }
      `}</style>

      <AnimatePresence>
        {showPicker && seed && (
          <SessionPicker
            seed={seed}
            onSelect={(type) => { setSessionType(type); setShowPicker(false) }}
            onClose={() => navigate(-1)}
          />
        )}
      </AnimatePresence>

      {sessionType && (
        <>
          {/* Top Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', background: 'rgba(0,0,0,0.5)',
            borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
            position: 'sticky', top: 0, zIndex: 100
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link to="/browse-orchards" style={{ textDecoration: 'none', color: '#64748b', fontSize: 13 }}>← Exit</Link>
              <div className="live-badge" style={{
                background: '#ef4444', borderRadius: 20, padding: '4px 12px',
                fontSize: 11, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 6
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                LIVE
              </div>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{sessionType.emoji} {sessionType.label}</span>
              <span style={{ fontSize: 13, color: '#64748b' }}>·</span>
              <span style={{ fontSize: 13, color: '#10b981' }}>👁 {liveCount} watching</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Share2 style={{ width: 14, height: 14 }} /> Share Live
              </motion.button>
            </div>
          </div>

          {/* Main Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', height: 'calc(100vh - 53px)', overflow: 'hidden' }}>

            {/* Left: Jitsi */}
            <div style={{ position: 'relative', background: '#000' }}>
              <JitsiMeeting
                domain="meet.sow2growapp.com"
                roomName={roomName}
                configOverwrite={{
                  startWithAudioMuted: sessionType.value === 'radio' ? false : false,
                  startWithVideoMuted: sessionType.value === 'radio',
                  disableVideo: sessionType.value === 'radio',
                  prejoinPageEnabled: false,
                  disableDeepLinking: true,
                }}
                interfaceConfigOverwrite={{
                  TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'chat', 'raisehand', 'tileview'],
                  DISABLE_VIDEO_BACKGROUND: false,
                  SHOW_JITSI_WATERMARK: false,
                  SHOW_BRAND_WATERMARK: false,
                }}
                userInfo={{ displayName, email: user?.email || '' }}
                onApiReady={(api) => {
                  api.addListener('readyToClose', () => navigate('/browse-orchards'))
                  api.addListener('participantJoined', () => setLiveCount(c => c + 1))
                  api.addListener('participantLeft', () => setLiveCount(c => Math.max(1, c - 1)))
                }}
                getIFrameRef={(ref) => {
                  if (ref) {
                    ref.style.width = '100%'
                    ref.style.height = '100%'
                    ref.style.border = 'none'
                  }
                }}
              />
            </div>

            {/* Right: Seed Info Panel */}
            <div style={{
              background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              overflowY: 'auto', display: 'flex', flexDirection: 'column'
            }}>
              {/* Seed Image */}
              {seed?.images?.[0] && (
                <div style={{ position: 'relative', height: 180 }}>
                  <img src={seed.images[0]} alt={seed.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0f172a, transparent)' }} />
                </div>
              )}

              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                {/* Session type badge */}
                <div style={{
                  background: `${typeConfig.color}20`,
                  border: `1px solid ${typeConfig.color}40`,
                  borderRadius: 12, padding: '8px 12px',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span style={{ fontSize: 18 }}>{typeConfig.emoji}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: typeConfig.color }}>{typeConfig.label} Session</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{typeConfig.desc}</div>
                  </div>
                </div>

                {/* Seed Title */}
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>🌱 SEED</div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', margin: 0, lineHeight: 1.3 }}>{seed?.title}</h2>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    by {seed?.profiles?.display_name || seed?.profiles?.first_name || 'Anonymous Sower'}
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                  {seed?.description}
                </p>

                {/* Live Stats */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12, padding: '12px',
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{liveCount}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Watching Live</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{seed?.filled_pockets || 0}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Pockets Filled</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: typeConfig.color }}>${pocketPrice}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Per Pocket</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#94a3b8' }}>
                      {Math.max(0, (seed?.total_pockets || 0) - (seed?.filled_pockets || 0))}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Pockets Left</div>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Seed Progress</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>
                      {Math.min(100, Math.round(((seed?.filled_pockets || 0) / (seed?.total_pockets || 1)) * 100))}%
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.round(((seed?.filled_pockets || 0) / (seed?.total_pockets || 1)) * 100))}%` }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: 4, boxShadow: '0 0 8px rgba(16,185,129,0.6)' }}
                    />
                  </div>
                </div>

                {/* Bestow Button */}
                <Link to={`/animated-orchard/${orchardId}`} style={{ textDecoration: 'none' }}>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      width: '100%', padding: '16px 0',
                      background: `linear-gradient(135deg, ${typeConfig.color}, ${typeConfig.color}99)`,
                      border: 'none', borderRadius: 14, color: '#fff',
                      fontWeight: 800, fontSize: 16, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: `0 8px 30px ${typeConfig.color}50`,
                    }}
                  >
                    <Heart style={{ width: 20, height: 20 }} />
                    Bestow from ${pocketPrice}
                  </motion.button>
                </Link>

                {/* Share */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleShare}
                  style={{
                    width: '100%', padding: '12px 0',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12, color: '#64748b',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  <Share2 style={{ width: 14, height: 14 }} />
                  Share this live session
                </motion.button>

                <div style={{ fontSize: 11, color: '#374151', textAlign: 'center', paddingBottom: 8 }}>
                  S2G Live · Powered by sow2growapp.com
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}