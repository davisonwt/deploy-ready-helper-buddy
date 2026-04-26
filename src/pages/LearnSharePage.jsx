import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'


const REFERRAL_CODES = {
  '04754d57-d41d-4ea7-93df-542047a6785b': 'S2G-XDAVU6VP'
}

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

const VIDEOS = [
  { id: 1, role: 'Wheel', title: 'Become a Wandering Wheel', desc: 'How to register as a driver & transport provider', color: '#06b6d4', emoji: '🚗', url: null },
  { id: 2, role: 'Wheel', title: 'Book a Wandering Wheel', desc: 'How to find and book a driver near you', color: '#06b6d4', emoji: '🚗', url: null },
  { id: 3, role: 'Hand', title: 'Become a Wandering Hand', desc: 'How to register your skilled service', color: '#22c55e', emoji: '🤲', url: null },
  { id: 4, role: 'Hand', title: 'Connect with a Hand', desc: 'How to find and hire skilled tribe members', color: '#22c55e', emoji: '🤲', url: null },
  { id: 5, role: 'Whisperer', title: 'Become a Whisperer', desc: 'How to earn by referring seeds & orchards', color: '#a855f7', emoji: '🌬️', url: null },
  { id: 6, role: 'Whisperer', title: 'How Whispering Works', desc: 'What affiliate marketing means in Sow2Grow', color: '#a855f7', emoji: '🌬️', url: null },
  { id: 7, role: 'Pillow', title: 'Become a Wandering Pillow', desc: 'How to list your accommodation', color: '#ec4899', emoji: '🛏️', url: null },
  { id: 8, role: 'Pillow', title: 'Reserve a Stay', desc: 'How to book a Wandering Pillow', color: '#ec4899', emoji: '🛏️', url: null },
  { id: 9, role: 'Field', title: 'Become a Wandering Field', desc: 'How to list your farm produce', color: '#eab308', emoji: '🌾', url: null },
  { id: 10, role: 'Field', title: 'Order from the Field', desc: 'How to buy from farmers in your tribe', color: '#eab308', emoji: '🌾', url: null },
  { id: 11, role: 'Hearth', title: 'Become a Hearth Creator', desc: 'How to list music, art, books & creations', color: '#f97316', emoji: '🔥', url: null },
  { id: 12, role: 'Hearth', title: 'Bestow a Hearth Seed', desc: 'How to support a creator through bestowal', color: '#f97316', emoji: '🔥', url: null },
  { id: 13, role: 'Forge', title: 'Become a Wandering Forge', desc: 'How to list your craft & manufacturing skills', color: '#64748b', emoji: '⚒️', url: null },
  { id: 14, role: 'Forge', title: 'Commission a Forge', desc: 'How to order custom made items', color: '#64748b', emoji: '⚒️', url: null },
  { id: 15, role: 'Heart', title: 'Become a Wandering Heart', desc: 'How to offer care & community support', color: '#10b981', emoji: '💚', url: null },
  { id: 16, role: 'Heart', title: 'Find a Heart', desc: 'How to find care & support in your tribe', color: '#10b981', emoji: '💚', url: null },
  { id: 17, role: 'Story', title: 'Become a Story Teller', desc: 'How to share your content & media', color: '#6366f1', emoji: '🎥', url: null },
  { id: 18, role: 'Story', title: 'Watch a Story', desc: 'How to find & support tribe storytellers', color: '#6366f1', emoji: '🎥', url: null },
  { id: 19, role: 'Platform', title: 'What is Sow2Grow', desc: 'The full platform explained', color: '#0ea5e9', emoji: '🏛️', url: null },
  { id: 20, role: 'Platform', title: 'How Bestowing Works', desc: 'Understanding pockets & bestowals', color: '#0ea5e9', emoji: '🏛️', url: null },
  { id: 21, role: 'Platform', title: 'How to Create a Seed', desc: 'Step by step seed creation guide', color: '#0ea5e9', emoji: '🏛️', url: null },
  { id: 22, role: 'Platform', title: 'Community Orchard Explained', desc: 'How tribe needs become community orchards', color: '#0ea5e9', emoji: '🏛️', url: null },
  { id: 23, role: 'Platform', title: 'Production Orchard Explained', desc: 'How to fund a product into existence', color: '#0ea5e9', emoji: '🏛️', url: null },
  { id: 24, role: 'Platform', title: 'The Referral System', desc: 'How to earn 1% forever through your tribe', color: '#0ea5e9', emoji: '🏛️', url: null },
  { id: 25, role: 'Orchard', title: 'Browse Community Orchards', desc: 'How to find and bestow into orchards', color: '#16a34a', emoji: '🌳', url: null },
  { id: 26, role: 'Orchard', title: 'The Grove Station', desc: 'How to use the 24hr community radio', color: '#16a34a', emoji: '🌳', url: null },
  { id: 27, role: 'Orchard', title: 'My Garden Guide', desc: 'How to manage your seeds & orchards', color: '#16a34a', emoji: '🌳', url: null },
  { id: 28, role: 'Orchard', title: 'Go Live on a Seed', desc: 'How to host a live session for a seed', color: '#16a34a', emoji: '🌳', url: null },
  { id: 29, role: 'Orchard', title: 'The Wandering Directory', desc: 'How to find tribe members by role', color: '#16a34a', emoji: '🌳', url: null },
  { id: 30, role: 'Orchard', title: '364yhvh Calendar', desc: 'How the sacred calendar works in S2G', color: '#16a34a', emoji: '🌳', url: null },
  { id: 31, role: 'Orchard', title: 'Let It Rain', desc: 'How to bestow blessings to the tribe', color: '#16a34a', emoji: '🌳', url: null },
  { id: 32, role: 'Orchard', title: 'The Music Library', desc: 'How to upload and share your music', color: '#16a34a', emoji: '🌳', url: null },
  { id: 33, role: 'Orchard', title: 'S2G Wallet Setup', desc: 'How to set up USDC payments', color: '#16a34a', emoji: '🌳', url: null },
  { id: 34, role: 'Orchard', title: 'Become a Sower & Grower', desc: 'The complete S2G onboarding guide', color: '#16a34a', emoji: '🌳', url: 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/s2g%20become%20a%20sower%20and%20grower%20(1).mp4' },
]

export default function LearnSharePage() {
  const { user } = useAuth()
  const [selectedRole, setSelectedRole] = useState('all')
  const [playingId, setPlayingId] = useState(null)

  const referralCode = REFERRAL_CODES[user?.id] || 'S2G-XXXXXX'
  const filtered = selectedRole === 'all' ? VIDEOS : VIDEOS.filter(v => v.role === selectedRole)

  const handleShare = async (video) => {
    const shareUrl = `${window.location.origin}/register?ref=${referralCode}`
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
    const script = `Hey! 👋 Check out this video about S2G — ${video.title}.\n${video.desc}\n\nJoin our tribe 🌱 ${window.location.origin}/register?ref=${referralCode}`
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
            Your referral code: <span style={{ color: '#10b981', fontWeight: 800, fontSize: 15 }}>{referralCode}</span>
          </div>
        </div>

        {/* Referral Banner */}
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
          🌿 Share any video with your referral code embedded. When someone registers via your link, they join your tribe. You earn <span style={{ color: '#10b981', fontWeight: 700 }}>1%</span> on every bestowal made on their seeds — forever.
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
          {ROLES.map(role => (
            <motion.button
              key={role.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedRole(role.value)}
              style={{
                padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13,
                background: selectedRole === role.value
                  ? `linear-gradient(135deg, ${role.color || '#10b981'}, ${role.color || '#059669'})`
                  : 'rgba(255,255,255,0.05)',
                color: selectedRole === role.value ? '#fff' : '#94a3b8',
                boxShadow: selectedRole === role.value ? `0 4px 15px ${role.color || '#10b981'}40` : 'none',
                transition: 'all 0.2s',
              }}
            >
              {role.emoji} {role.label}
            </motion.button>
          ))}
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
                  style={{ position: 'relative', height: 160, background: `${video.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: video.url ? 'pointer' : 'default' }}
                  onClick={() => video.url && setPlayingId(playingId === video.id ? null : video.id)}
                >
                  {video.url && playingId === video.id ? (
                    <video src={video.url} autoPlay controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: video.url ? video.color : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: video.url ? `0 0 20px ${video.color}60` : 'none' }}>
                        <span style={{ fontSize: 22, color: '#fff' }}>▶</span>
                      </div>
                      {!video.url && (
                        <div style={{ position: 'absolute', top: 10, right: 10, background: '#1e293b', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: '0.1em' }}>SOON</div>
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

                  {/* Living Buttons */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>

                    {/* Share — living constellation effect */}
                    <div style={{ flex: 1 }}>
                      <LivingButton
                        variant="share"
                        height={42}
                        borderRadius={10}
                        fontSize={12}
                        letterSpacing="1px"
                        fontWeight={700}
                        onClick={() => handleShare(video)}
                      >
                        ↗ Share
                      </LivingButton>
                    </div>

                    {/* Copy Script — small icon */}
                    <motion.button
                      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                      onClick={() => handleCopyScript(video)}
                      title="Copy share script"
                      style={{
                        width: 42, height: 42, flexShrink: 0,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10, color: '#94a3b8',
                        fontSize: 16, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                    >
                      📋
                    </motion.button>

                    {/* Go Live — breathing pulse */}
                    <div style={{ width: 42, flexShrink: 0 }}>
                      <Link to={`/live-seed/learn-${video.role.toLowerCase()}-${video.id}`} style={{ textDecoration: 'none', display: 'block', height: 42 }}>
                        <LivingButton
                          variant="live"
                          height={42}
                          borderRadius={10}
                          fontSize={14}
                          letterSpacing="0px"
                          fontWeight={400}
                        >
                          {''}
                        </LivingButton>
                      </Link>
                    </div>

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
