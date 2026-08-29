import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import RoleButton, { ROLE_CONFIG } from '../components/RoleButton'
import { VIDEOS } from '@/data/learnShareVideos'
import { useReferralCode } from '@/hooks/useReferralCode'

// ── Colored Living Button — share animation in any color ────────────────────

const ROLES = [
  { value: 'all', label: 'All', emoji: '🌿' },
  { value: 'Wheel', label: 'Wheel', emoji: '🚗', color: '#06b6d4' },
  { value: 'Hand', label: 'Hand', emoji: '🤲', color: '#22c55e' },
  { value: 'Whisperer', label: 'Whisperer', emoji: '🌬️', color: '#a855f7' },
  { value: 'Pillow', label: 'Pillow', emoji: '🛏️', color: '#ec4899' },
  { value: 'Field', label: 'Field', emoji: '🌾', color: '#eab308' },
  { value: 'Hearth', label: 'Hearth', emoji: '🔥', color: '#f97316' },
  { value: 'Forge', label: 'Forge', emoji: '⚒️', color: '#64748b' },
  { value: 'Heart', label: 'Heart', emoji: '💚', color: '#10b981' },
  { value: 'Story', label: 'Story', emoji: '🎥', color: '#6366f1' },
  { value: 'Platform', label: 'Platform', emoji: '🏛️', color: '#0ea5e9' },
  { value: 'Orchard', label: 'Orchard', emoji: '🌳', color: '#16a34a' },
]

export default function LearnSharePage() {
  const [selectedRole, setSelectedRole] = useState('all')
  const [playingId, setPlayingId] = useState(null)

  // Real per-user code from affiliates, never a placeholder — null until it
  // resolves, so Share/Copy stay disabled and the box shows a skeleton
  // rather than ever emitting a fake code. Reuses the existing
  // useReferralCode hook (src/hooks/useReferralCode.ts) rather than a
  // second mechanism.
  const { code: referralCode, loading: referralCodeLoading } = useReferralCode()
  const referralCodeError = !referralCodeLoading && !referralCode

  const filtered = selectedRole === 'all' ? VIDEOS : VIDEOS.filter(v => v.role === selectedRole)

  // Always share the public Sow2Grow domain so link previews show S2G branding
  // (not the internal lovableproject.com preview, which shows Lovable's OG card).
  const PUBLIC_ORIGIN = 'https://sow2growapp.com'

  // Public, unauthenticated video page — recipients see the video immediately,
  // no sign-in wall. Registering/logging in from there carries the referral
  // code and returns them to this exact video afterward.
  const shareUrlFor = (video) => `${PUBLIC_ORIGIN}/learn-share/${video.id}?ref=${referralCode}`

  const handleShare = async (video) => {
    if (!referralCode) return
    const shareUrl = shareUrlFor(video)
    const text = `🌱 ${video.title} — ${video.desc}\n\nWatch & join Sow2Grow: ${shareUrl}`
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, text, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(text)
        toast.success('Copied to clipboard!')
      }
    } catch {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard!')
    }
  }

  const handleCopyScript = async (video) => {
    if (!referralCode) return
    const script = `Hey! 👋 Check out this video about S2G — ${video.title}.\n${video.desc}\n\nWatch it here 🌱 ${shareUrlFor(video)}`
    await navigator.clipboard.writeText(script)
    toast.success('Script copied!')
  }


  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)', color: '#f1f5f9' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Back */}
        <Link to="/dashboard" style={{ textDecoration: 'none', color: '#64748b', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>← Back to Dashboard</Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>🎬</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', letterSpacing: '0.1em' }}>LEARN & SHARE</span>
              <span style={{ background: '#10b981', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{VIDEOS.length} videos</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Learn & Share</h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>Share videos with your referral code to grow your tribe</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#94a3b8' }}>
            Your referral code:{' '}
            {referralCode ? (
              <span style={{ color: '#10b981', fontWeight: 800, fontSize: 15 }}>{referralCode}</span>
            ) : referralCodeError ? (
              <span style={{ color: '#f87171', fontWeight: 600 }}>Couldn't load</span>
            ) : (
              <span
                aria-label="Loading your referral code"
                style={{
                  display: 'inline-block', width: 92, height: 15, borderRadius: 4,
                  background: 'rgba(148,163,184,0.25)', verticalAlign: 'middle',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            )}
          </div>
        </div>

        {/* Referral Banner */}
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
          🌿 Share any video with your referral code embedded. When someone registers via your link, they join your tribe. You earn <span style={{ color: '#10b981', fontWeight: 700 }}>1%</span> on every bestowal made on their seeds — forever.
        </div>

        {/* Role Filter — living role buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28, alignItems: 'center' }}>
          {/* All button — same size as role buttons */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setSelectedRole('all')}
            style={{
              width: 90, height: 64, borderRadius: 18, cursor: 'pointer',
              fontWeight: 600, fontSize: 11, letterSpacing: 2,
              textTransform: 'uppercase',
              background: selectedRole === 'all'
                ? 'linear-gradient(135deg, #10b98133, #05966922)'
                : 'rgba(255,255,255,0.03)',
              color: selectedRole === 'all' ? '#10b981' : '#64748b',
              boxShadow: selectedRole === 'all' ? '0 0 20px #10b98133, inset 0 0 20px #10b98111' : 'none',
              border: selectedRole === 'all' ? '1px solid #10b98144' : '1px solid rgba(255,255,255,0.06)',
              transition: 'all 0.3s',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <span style={{ fontSize: 22 }}>🌿</span>
            All
          </motion.button>

          {/* 9 Wandering Role buttons — living animations */}
          {Object.entries(ROLE_CONFIG).map(([key, role]) => (
            <div key={key} style={{ width: 90, height: 64 }}>
              <RoleButton
                role={key}
                size="sm"
                selected={selectedRole === role.name}
                onClick={() => setSelectedRole(role.name)}
                showBubbles={false}
              />
            </div>
          ))}

          {/* Platform + Orchard — same size as role buttons */}
          {['Platform', 'Orchard'].map(label => {
            const colors = { Platform: '#0ea5e9', Orchard: '#16a34a' }
            const emojis = { Platform: '🏛️', Orchard: '🌳' }
            const isSelected = selectedRole === label
            return (
              <motion.button
                key={label}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setSelectedRole(label)}
                style={{
                  width: 90, height: 64, borderRadius: 18, cursor: 'pointer',
                  fontWeight: 600, fontSize: 11, letterSpacing: 2,
                  textTransform: 'uppercase',
                  background: isSelected
                    ? `linear-gradient(135deg, ${colors[label]}33, ${colors[label]}22)`
                    : 'rgba(255,255,255,0.03)',
                  color: isSelected ? colors[label] : '#64748b',
                  boxShadow: isSelected ? `0 0 20px ${colors[label]}33, inset 0 0 20px ${colors[label]}11` : 'none',
                  border: isSelected ? `1px solid ${colors[label]}44` : '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.3s',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <span style={{ fontSize: 22 }}>{emojis[label]}</span>
                {label}
              </motion.button>
            )
          })}
        </div>

        {/* Video Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          <AnimatePresence>
            {filtered.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  background: `linear-gradient(135deg, ${video.color}15, #0f172a)`,
                  border: `1px solid ${video.color}30`,
                  borderRadius: 16, overflow: 'hidden',
                }}
              >
                {/* Video Area */}
                <div
                  style={{ position: 'relative', height: 160, background: `${video.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: video.url ? 'pointer' : 'default', overflow: 'hidden' }}
                  onClick={() => video.url && setPlayingId(playingId === video.id ? null : video.id)}
                >
                  {video.url && playingId === video.id ? (
                    <video src={video.url} autoPlay controls playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      {video.url && (
                        <video
                          src={`${video.url}#t=0.5`}
                          preload="metadata"
                          muted
                          playsInline
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
                        />
                      )}
                      <div style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', background: video.url ? video.color : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: video.url ? `0 0 20px ${video.color}60` : 'none' }}>
                        <span style={{ fontSize: 22, color: '#fff' }}>▶</span>
                      </div>
                      {!video.url && (
                        <div style={{ position: 'absolute', top: 10, right: 10, background: '#1e293b', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: '0.1em' }}>SOON</div>
                      )}
                      {video.url && (
                        <div style={{ position: 'absolute', top: 10, right: 10, background: video.color, borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>PLAY</div>
                      )}
                    </>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '14px 14px 16px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, lineHeight: 1.3 }}>
                    {video.emoji} {video.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.4 }}>{video.desc}</div>

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <motion.button
                      whileHover={referralCode ? { scale: 1.03 } : undefined} whileTap={referralCode ? { scale: 0.97 } : undefined}
                      onClick={() => handleShare(video)}
                      disabled={!referralCode}
                      style={{ flex: 1, padding: '10px 0', background: video.color, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: referralCode ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: referralCode ? 1 : 0.5 }}
                    >
                      ↗ Share
                    </motion.button>

                    {/* Copy Script */}
                    <motion.button
                      whileHover={referralCode ? { scale: 1.03 } : undefined} whileTap={referralCode ? { scale: 0.97 } : undefined}
                      onClick={() => handleCopyScript(video)}
                      disabled={!referralCode}
                      style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94a3b8', fontSize: 13, cursor: referralCode ? 'pointer' : 'not-allowed', opacity: referralCode ? 1 : 0.5 }}
                      title="Copy share script"
                    >
                      📋
                    </motion.button>

                    <Link to={`/live-seed/learn-${video.role.toLowerCase()}-${video.id}`} style={{ textDecoration: 'none' }}>
                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, color: '#ef4444', fontSize: 13, cursor: 'pointer' }}
                      >
                        🔴
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
