import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import RoleButton, { ROLE_CONFIG } from '../components/RoleButton'
import becomeASowerVideo from '../assets/explainers/become-a-sower.mp4'
import becomeABestowerVideo from '../assets/explainers/become-a-bestower.mp4'
import becomeAWanderingHeartVideo from '../assets/explainers/become-a-wandering-heart.mp4'

// Banner videos (correct mapping per user instructions)
import communityOrchardVideo from '../assets/banners/banner-01-community-orchard.mp4'
import productionOrchardVideo from '../assets/banners/banner-02-production-orchard.mp4'
import singleSeedVideo from '../assets/banners/banner-03-single-seed.mp4'

import becomeAWanderingWheelVideo from '../assets/banners/banner-04-wandering-wheel.mp4'
import bookAWanderingWheelVideo from '../assets/banners/banner-04-wandering-wheel-book.mp4'

import becomeAWanderingHandVideo from '../assets/banners/banner-05-wandering-hand.mp4'

import becomeAWhispererVideo from '../assets/banners/banner-06-wandering-whisperer.mp4'
import bookAWhispererVideo from '../assets/banners/banner-06-wandering-whisperer-book.mp4'

import becomeAWanderingPillowVideo from '../assets/banners/banner-07-wandering-pillow.mp4'
import reserveAStayVideo from '../assets/banners/banner-07-wandering-pillow-book.mp4'

import becomeAWanderingFieldVideo from '../assets/banners/banner-08-wandering-field.mp4'
import orderFromTheFieldVideo from '../assets/banners/banner-08-wandering-field-book.mp4'

import becomeAHearthCreatorVideo from '../assets/banners/banner-09-wandering-hearth.mp4'
import bestowAHearthSeedVideo from '../assets/banners/banner-09-wandering-hearth-book.mp4'

import becomeAWanderingForgeVideo from '../assets/banners/banner-10-wandering-forge.mp4'
import commissionAForgeVideo from '../assets/banners/banner-10-wandering-forge-book.mp4'

import classroomVideo from '../assets/banners/banner-11-classroom.mp4'
import skilldropVideo from '../assets/banners/banner-12-skilldrop.mp4'
import trainingVideo from '../assets/banners/banner-13-training.mp4'
import radioVideo from '../assets/banners/banner-14-radio.mp4'
import oneOnOneVideo from '../assets/banners/banner-15-one-on-one.mp4'
import groupChatVideo from '../assets/banners/banner-16-group-chat.mp4'

// ── Colored Living Button — share animation in any color ────────────────────

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

// Public Supabase storage base for orchard-videos bucket. Filenames keep their
// original spaces — encodeURI() handles them safely at render time.
const VID = (file) =>
  `https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/${encodeURI(file)}`

const VIDEOS = [
  { id: 1,  role: 'Wheel',     title: 'Become a Wandering Wheel',   desc: 'How to register as a driver & transport provider', color: '#06b6d4', emoji: '🚗', url: becomeAWanderingWheelVideo },
  { id: 2,  role: 'Wheel',     title: 'Book a Wandering Wheel',     desc: 'How to find and book a driver near you',           color: '#06b6d4', emoji: '🚗', url: bookAWanderingWheelVideo },
  { id: 3,  role: 'Hand',      title: 'Become a Wandering Hand',    desc: 'How to register your skilled service',             color: '#22c55e', emoji: '🤲', url: becomeAWanderingHandVideo },
  { id: 4,  role: 'Hand',      title: 'Connect with a Hand',        desc: 'How to find and hire skilled tribe members',       color: '#22c55e', emoji: '🤲', url: becomeAWanderingHandVideo },
  { id: 5,  role: 'Whisperer', title: 'Become a Whisperer',         desc: 'How to earn by referring seeds & orchards',        color: '#a855f7', emoji: '🌬️', url: becomeAWhispererVideo },
  { id: 6,  role: 'Whisperer', title: 'Connect with a Whisperer',   desc: 'How to book / connect with a wandering whisperer', color: '#a855f7', emoji: '🌬️', url: bookAWhispererVideo },
  { id: 7,  role: 'Pillow',    title: 'Become a Wandering Pillow',  desc: 'How to list your accommodation',                   color: '#ec4899', emoji: '🛏️', url: becomeAWanderingPillowVideo },
  { id: 8,  role: 'Pillow',    title: 'Reserve a Stay',             desc: 'How to book a Wandering Pillow',                   color: '#ec4899', emoji: '🛏️', url: reserveAStayVideo },
  { id: 9,  role: 'Field',     title: 'Become a Wandering Field',   desc: 'How to list your farm produce',                    color: '#eab308', emoji: '🌾', url: becomeAWanderingFieldVideo },
  { id: 10, role: 'Field',     title: 'Order from the Field',       desc: 'How to buy from farmers in your tribe',            color: '#eab308', emoji: '🌾', url: orderFromTheFieldVideo },
  { id: 11, role: 'Hearth',    title: 'Become a Hearth Creator',    desc: 'How to list music, art, books & creations',        color: '#f97316', emoji: '🔥', url: becomeAHearthCreatorVideo },
  { id: 12, role: 'Hearth',    title: 'Bestow a Hearth Seed',       desc: 'How to support a creator through bestowal',        color: '#f97316', emoji: '🔥', url: bestowAHearthSeedVideo },
  { id: 13, role: 'Forge',     title: 'Become a Wandering Forge',   desc: 'How to list your craft & manufacturing skills',    color: '#64748b', emoji: '⚒️', url: becomeAWanderingForgeVideo },
  { id: 14, role: 'Forge',     title: 'Commission a Forge',         desc: 'How to order custom made items',                   color: '#64748b', emoji: '⚒️', url: commissionAForgeVideo },
  { id: 15, role: 'Heart',     title: 'Become a Wandering Heart',   desc: 'How to offer care & community support',            color: '#10b981', emoji: '💚', url: becomeAWanderingHeartVideo },
  { id: 16, role: 'Heart',     title: 'Find a Heart',               desc: 'How to find care & support in your tribe',         color: '#10b981', emoji: '💚', url: null },
  { id: 17, role: 'Story',     title: 'Become a Story Teller',      desc: 'How to share your content & media',                color: '#6366f1', emoji: '🎥', url: null },
  { id: 18, role: 'Story',     title: 'Watch a Story',              desc: 'How to find & support tribe storytellers',         color: '#6366f1', emoji: '🎥', url: null },
  { id: 19, role: 'Platform',  title: 'What is Sow2Grow',           desc: 'The full platform explained',                      color: '#0ea5e9', emoji: '🏛️', url: null },
  { id: 20, role: 'Platform',  title: 'How Bestowing Works',        desc: 'Understanding pockets & bestowals',                color: '#0ea5e9', emoji: '🏛️', url: null },
  { id: 21, role: 'Platform',  title: 'Sow a Single Seed',          desc: 'Step by step seed creation guide',                 color: '#0ea5e9', emoji: '🏛️', url: singleSeedVideo },
  { id: 22, role: 'Platform',  title: 'Community Orchard Explained',desc: 'How tribe needs become community orchards',        color: '#0ea5e9', emoji: '🏛️', url: communityOrchardVideo },
  { id: 23, role: 'Platform',  title: 'Production Orchard Explained',desc:'How to fund a product into existence',             color: '#0ea5e9', emoji: '🏛️', url: productionOrchardVideo },
  { id: 24, role: 'Platform',  title: 'The Referral System',        desc: 'How to earn 1% forever through your tribe',        color: '#0ea5e9', emoji: '🏛️', url: null },
  { id: 35, role: 'Platform',  title: 'Host a Live Classroom',      desc: 'How to host a live classroom session',             color: '#0ea5e9', emoji: '🏛️', url: classroomVideo },
  { id: 36, role: 'Platform',  title: 'Open a Skilldrop Room',      desc: 'How to open a skilldrop room',                     color: '#0ea5e9', emoji: '🏛️', url: skilldropVideo },
  { id: 37, role: 'Platform',  title: 'Host a Training Session',    desc: 'How to host a live training session',              color: '#0ea5e9', emoji: '🏛️', url: trainingVideo },
  { id: 38, role: 'Platform',  title: 'Host Your Own Radio Show',   desc: 'How to start your own radio show',                 color: '#0ea5e9', emoji: '🏛️', url: radioVideo },
  { id: 39, role: 'Platform',  title: 'Start a 1-on-1 Chat',        desc: 'How to start a private 1-on-1 chat',               color: '#0ea5e9', emoji: '🏛️', url: oneOnOneVideo },
  { id: 40, role: 'Platform',  title: 'Start an S2G Group Chat',    desc: 'How to start an S2G group call',                   color: '#0ea5e9', emoji: '🏛️', url: groupChatVideo },
  { id: 25, role: 'Orchard',   title: 'Browse Community Orchards',  desc: 'How to find and bestow into orchards',             color: '#16a34a', emoji: '🌳', url: null },
  { id: 26, role: 'Orchard',   title: 'The Grove Station',          desc: 'How to use the 24hr community radio',              color: '#16a34a', emoji: '🌳', url: null },
  { id: 27, role: 'Orchard',   title: 'My Garden Guide',            desc: 'How to manage your seeds & orchards',              color: '#16a34a', emoji: '🌳', url: null },
  { id: 28, role: 'Orchard',   title: 'Go Live on a Seed',          desc: 'How to host a live session for a seed',            color: '#16a34a', emoji: '🌳', url: null },
  { id: 29, role: 'Orchard',   title: 'The Wandering Directory',    desc: 'How to find tribe members by role',                color: '#16a34a', emoji: '🌳', url: null },
  { id: 30, role: 'Orchard',   title: '364yhvh Calendar',           desc: 'How the sacred calendar works in S2G',             color: '#16a34a', emoji: '🌳', url: null },
  { id: 31, role: 'Orchard',   title: 'Let It Rain',                desc: 'How to bestow blessings to the tribe',             color: '#16a34a', emoji: '🌳', url: null },
  { id: 32, role: 'Orchard',   title: 'The Music Library',          desc: 'How to upload and share your music',               color: '#16a34a', emoji: '🌳', url: null },
  { id: 33, role: 'Orchard',   title: 'S2G Wallet Setup',           desc: 'How to set up USDC payments',                      color: '#16a34a', emoji: '🌳', url: null },
  { id: 34, role: 'Orchard',   title: 'Become a Sower & Grower',    desc: 'The complete S2G onboarding guide',                color: '#16a34a', emoji: '🌳', url: becomeASowerVideo },
]

export default function LearnSharePage() {
  const { user } = useAuth()
  const [selectedRole, setSelectedRole] = useState('all')
  const [playingId, setPlayingId] = useState(null)

  const referralCode = REFERRAL_CODES[user?.id] || 'S2G-XXXXXX'
  const filtered = selectedRole === 'all' ? VIDEOS : VIDEOS.filter(v => v.role === selectedRole)

  // Always share the public Sow2Grow domain so link previews show S2G branding
  // (not the internal lovableproject.com preview, which shows Lovable's OG card).
  const PUBLIC_ORIGIN = 'https://sow2growapp.com'

  const handleShare = async (video) => {
    const shareUrl = `${PUBLIC_ORIGIN}/register?ref=${referralCode}`
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
    const script = `Hey! 👋 Check out this video about S2G — ${video.title}.\n${video.desc}\n\nJoin our tribe 🌱 ${PUBLIC_ORIGIN}/register?ref=${referralCode}`
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
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleShare(video)}
                      style={{ flex: 1, padding: '10px 0', background: video.color, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      ↗ Share
                    </motion.button>

                    {/* Copy Script */}
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleCopyScript(video)}
                      style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}
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
