import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, ChevronDown, ChevronUp, Sparkles, Package, Globe, Wrench, Settings, Zap, Gift, Music, TreePine } from 'lucide-react'
import { launchSparkles, floatingScore, playSoundEffect } from '@/utils/confetti'
import { supabase } from '@/integrations/supabase/client'
import { getCurrentTheme } from '@/utils/dashboardThemes'
import { motion, AnimatePresence } from 'framer-motion'

interface MyGardenPanelProps {
  isOpen: boolean
  onClose: () => void
}

// Compact feed card component
function GardenFeedCard({ 
  title, emoji, children, defaultOpen = false, theme, delay = 0, count 
}: { 
  title: string; emoji: string; children: React.ReactNode; defaultOpen?: boolean; theme: any; delay?: number; count?: number 
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-2xl overflow-hidden border"
      style={{ 
        background: theme.cardBg, 
        borderColor: theme.cardBorder 
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ color: theme.textPrimary }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{emoji}</span>
          <span className="font-semibold text-sm">{title}</span>
          {count !== undefined && (
            <span 
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${theme.accent}30`, color: theme.accent }}
            >
              {count}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" style={{ color: theme.textSecondary }} />
        ) : (
          <ChevronDown className="h-4 w-4" style={{ color: theme.textSecondary }} />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Individual garden item link
function GardenLink({ 
  href, title, subtitle, badge, onClick, onClose, theme 
}: { 
  href?: string; title: string; subtitle: string; badge?: string; onClick?: () => void; onClose: () => void; theme: any 
}) {
  const content = (
    <div className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-all hover:scale-[1.01]"
      style={{ background: `${theme.textPrimary}08` }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" style={{ color: theme.textPrimary }}>{title}</p>
        <p className="text-xs truncate" style={{ color: theme.textSecondary }}>{subtitle}</p>
      </div>
      {badge && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 shrink-0"
          style={{ background: theme.accent, color: '#fff' }}
        >
          {badge}
        </span>
      )}
    </div>
  )

  if (onClick) {
    return <button className="w-full text-left" onClick={onClick}>{content}</button>
  }

  return (
    <Link to={href || '#'} onClick={onClose} className="block">
      {content}
    </Link>
  )
}

export function MyGardenPanel({ isOpen, onClose }: MyGardenPanelProps) {
  const navigate = useNavigate()
  const theme = getCurrentTheme()
  const [serviceCounts, setServiceCounts] = useState({ drivers: 0, whisperers: 0, serviceProviders: 0 })

  const fetchServiceCounts = useCallback(async () => {
    try {
      const [driversRes, whisperersRes, providersRes] = await Promise.all([
        supabase.from('community_drivers').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('whisperers').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('service_providers').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      ])
      setServiceCounts({
        drivers: driversRes.count || 0,
        whisperers: whisperersRes.count || 0,
        serviceProviders: providersRes.count || 0,
      })
    } catch (err) {
      console.error('Error fetching service counts:', err)
    }
  }, [])

  const closeGarden = () => {
    onClose()
    document.body.style.overflow = ''
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      fetchServiceCounts()
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, fetchServiceCounts])

  const mysterySeed = () => {
    const gifts = [1, 2, 5, 10]
    const won = gifts[Math.floor(Math.random() * gifts.length)]
    playSoundEffect('mysterySeed', 0.9)
    floatingScore(won)
    launchSparkles()
    alert(`You found ${won} USDC inside the seed! Check Community Music →`)
    navigate('/products?filter=music')
    closeGarden()
  }

  const quickRain = () => {
    if (typeof window !== 'undefined') {
      if ((window as any).launchConfetti) (window as any).launchConfetti()
    }
    playSoundEffect('quickRain', 1.0)
    alert("0.50 USDC sent to a random creator!")
    closeGarden()
  }

  if (!isOpen) return null

  const totalServices = serviceCounts.drivers + serviceCounts.whisperers + serviceCounts.serviceProviders

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeGarden}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="absolute inset-y-0 left-0 w-full max-w-md overflow-y-auto pointer-events-auto"
        style={{ background: theme.background }}
      >
        <div className="p-4 pb-32 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌿</span>
              <h2 className="text-lg font-bold" style={{ color: theme.textPrimary }}>My Garden</h2>
            </div>
            <button onClick={closeGarden} className="p-2 rounded-full transition-colors" style={{ color: theme.textSecondary }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions Row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-4 gap-2"
          >
            {[
              { href: '/create-orchard', label: 'New\nOrchard', icon: '🌳' },
              { href: '/music-library', label: 'Drop\nMusic', icon: '🎵' },
              { href: '/products/upload', label: 'New\nSeed', icon: '🌱' },
              { onClick: quickRain, label: 'Quick\nRain', icon: '🌧️' },
            ].map((action, i) => {
              const inner = (
                <div
                  className="flex flex-col items-center justify-center rounded-2xl py-3 px-2 text-center transition-transform active:scale-95"
                  style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
                >
                  <span className="text-2xl mb-1">{action.icon}</span>
                  <span className="text-[10px] font-semibold leading-tight whitespace-pre-line" style={{ color: theme.textPrimary }}>
                    {action.label}
                  </span>
                </div>
              )
              if (action.onClick) {
                return <button key={i} onClick={() => { action.onClick(); closeGarden() }}>{inner}</button>
              }
              return <Link key={i} to={action.href!} onClick={closeGarden}>{inner}</Link>
            })}
          </motion.div>

          {/* Mystery Seed Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            onClick={mysterySeed}
            className="rounded-2xl p-4 text-center cursor-pointer active:scale-[0.98] transition-transform"
            style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)` }}
          >
            <div className="text-4xl mb-1">🌱</div>
            <p className="text-sm font-bold text-white">Daily Mystery Seed</p>
            <p className="text-xs text-white/80">Tap me – something beautiful grows…</p>
          </motion.div>

          {/* Feed Sections */}
          <GardenFeedCard title="My Content" emoji="📦" defaultOpen={true} theme={theme} delay={0.2} count={5}>
            <GardenLink href="/my-orchards" title="My S2G Orchards" subtitle="3 growing · +12 fruits today" onClose={closeGarden} theme={theme} />
            <GardenLink href="/my-products" title="My S2G Seeds" subtitle="11 items · earned 83 USDC" onClose={closeGarden} theme={theme} />
            <GardenLink href="/music-library" title="My S2G Music Library" subtitle="8 tracks · 41 plays today" onClose={closeGarden} theme={theme} />
            <GardenLink href="/my-s2g-library" title="My S2G Library" subtitle="Upload your first e-book!" onClose={closeGarden} theme={theme} />
            <GardenLink href="/my-biz-ads" title="My S2G Biz Ads" subtitle="Upload ads for radio & community" onClose={closeGarden} theme={theme} />
          </GardenFeedCard>

          <GardenFeedCard title="Community" emoji="🌍" defaultOpen={true} theme={theme} delay={0.25} count={7}>
            <GardenLink href="/364yhvh-orchards" title="S2G Community Orchards" subtitle="50+ projects need your rain" badge="2 new" onClose={closeGarden} theme={theme} />
            <GardenLink href="/products" title="S2G Community Seeds" subtitle="Everything in one place" onClose={closeGarden} theme={theme} />
            <GardenLink href="/community-music-library" title="Community Music Library" subtitle="Build your album from sower tracks" onClose={closeGarden} theme={theme} />
            <GardenLink href="/s2g-community-library" title="Community Library" subtitle="E-books, courses, docs" onClose={closeGarden} theme={theme} />
            <GardenLink href="/community-biz-ads" title="Community Biz Ads" subtitle="Business ads from sowers" onClose={closeGarden} theme={theme} />
            <GardenLink href="/eternal-forest" title="Eternal Forest" subtitle="See every soul growing live" onClose={closeGarden} theme={theme} />
            <GardenLink href="/my-s2g-tribe" title="🌊 My S2G Tribe" subtitle="Send a ripple — start a wave" onClose={closeGarden} theme={theme} />
          </GardenFeedCard>

          <GardenFeedCard title="Services" emoji="🛠️" theme={theme} delay={0.3} count={totalServices || undefined}>
            <GardenLink 
              href="/community-drivers" title="S2G Community Drivers" 
              subtitle={serviceCounts.drivers > 0 ? `${serviceCounts.drivers} driver${serviceCounts.drivers !== 1 ? 's' : ''} available` : 'Find drivers for deliveries'}
              badge={serviceCounts.drivers > 0 ? `${serviceCounts.drivers}` : undefined}
              onClose={closeGarden} theme={theme} 
            />
            <GardenLink 
              href="/community-services" title="S2G Community Services" 
              subtitle={serviceCounts.serviceProviders > 0 ? `${serviceCounts.serviceProviders} provider${serviceCounts.serviceProviders !== 1 ? 's' : ''} ready` : 'Find skilled service providers'}
              badge={serviceCounts.serviceProviders > 0 ? `${serviceCounts.serviceProviders}` : undefined}
              onClose={closeGarden} theme={theme} 
            />
            <GardenLink 
              href="/become-whisperer" title="Browse Whisperers" 
              subtitle={serviceCounts.whisperers > 0 ? `${serviceCounts.whisperers} whisperer${serviceCounts.whisperers !== 1 ? 's' : ''} active` : 'Find marketing agents'}
              badge={serviceCounts.whisperers > 0 ? `${serviceCounts.whisperers}` : undefined}
              onClose={closeGarden} theme={theme} 
            />
            <GardenLink href="/ambassador-thumbnail" title="Become a S2G Ambassador" subtitle="Join our ambassador program" onClose={closeGarden} theme={theme} />
          </GardenFeedCard>

          <GardenFeedCard title="Tools" emoji="⚙️" theme={theme} delay={0.35}>
            <GardenLink href="/profile?tab=journal" title="Journal & Calendar" subtitle="Track your spiritual journey" onClose={closeGarden} theme={theme} />
            <GardenLink href="/weather" title="Weather" subtitle="Check your local weather" onClose={closeGarden} theme={theme} />
            <GardenLink 
              title="Garden Radio Live" subtitle="Jump in now – 12 listening" 
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).startJitsi) (window as any).startJitsi('GardenRadioLive')
                closeGarden()
              }}
              onClose={closeGarden} theme={theme} 
            />
          </GardenFeedCard>

          {/* Bottom quick rain */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-3"
          >
            <button
              onClick={() => { launchSparkles(); navigate('/products'); closeGarden() }}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-transform active:scale-95"
              style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, color: theme.textPrimary }}
            >
              ✨ Surprise Me
            </button>
            <button
              onClick={quickRain}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-transform active:scale-95"
              style={{ background: theme.accent }}
            >
              🌧️ Quick Rain 0.50
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
