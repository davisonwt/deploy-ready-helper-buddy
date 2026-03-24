import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Cloud, HandHeart, Gift, Heart, Droplets, Sparkles, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface LetItRainPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function LetItRainPanel({ isOpen, onClose }: LetItRainPanelProps) {
  const closePanel = () => {
    onClose()
    document.body.style.overflow = ''
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const quickRain = (amount: number, label: string) => {
    toast.success(`${amount.toFixed(2)} USDC bestowed to a random creator!`, {
      description: `${label} — May it grow abundantly 🌱`,
      icon: <Droplets className="w-5 h-5 text-amber-400" />,
      duration: 4000,
    })
    closePanel()
  }

  const rainCards = [
    {
      href: '/tithing',
      title: 'Tithing',
      subtitle: 'Give 10% · Support the work',
      icon: HandHeart,
      accent: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-400',
    },
    {
      href: '/free-will-gifting',
      title: 'Free-Will Bestowing',
      subtitle: 'Give as led · Any amount',
      icon: Gift,
      accent: 'from-orange-500/20 to-rose-500/20',
      iconColor: 'text-orange-400',
    },
    {
      href: '/364yhvh-orchards',
      title: 'Rain on Orchards',
      subtitle: 'Support community orchards',
      icon: Cloud,
      accent: 'from-rose-500/20 to-pink-500/20',
      iconColor: 'text-rose-400',
    },
    {
      href: '/support-us',
      title: 'Support Us',
      subtitle: 'Help grow the community',
      icon: Heart,
      accent: 'from-pink-500/20 to-amber-500/20',
      iconColor: 'text-pink-400',
    },
  ]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closePanel}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="absolute inset-y-0 left-0 w-full max-w-md shadow-2xl pointer-events-auto overflow-y-auto"
          style={{
            background: 'linear-gradient(165deg, #2d1810 0%, #3d1f14 30%, #4a2518 60%, #2a1a12 100%)',
          }}
        >
          <div className="flex flex-col min-h-full">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/30 border-b border-amber-800/30">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-amber-50">Let It Rain</h2>
                    <p className="text-xs text-amber-300/70">Bestow · Bless · Grow 💧</p>
                  </div>
                </div>
                <button
                  onClick={closePanel}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                >
                  <X className="w-5 h-5 text-amber-200" />
                </button>
              </div>
            </div>

            {/* Quick Rain Actions */}
            <div className="px-5 pt-5 pb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/60 mb-3">
                Quick Bestow
              </p>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => quickRain(0.50, 'Quick Rain')}
                  className="relative overflow-hidden rounded-2xl p-4 text-center bg-gradient-to-br from-amber-600/80 to-orange-700/80 hover:from-amber-500/90 hover:to-orange-600/90 transition-all shadow-lg"
                >
                  <Droplets className="w-7 h-7 text-amber-100 mx-auto mb-2" />
                  <span className="block text-amber-50 font-bold text-sm">Quick Rain</span>
                  <span className="block text-amber-200/80 text-xs mt-0.5">0.50 USDC</span>
                  <Sparkles className="absolute top-2 right-2 w-4 h-4 text-amber-300/40" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => quickRain(1.00, 'Body Rain')}
                  className="relative overflow-hidden rounded-2xl p-4 text-center bg-gradient-to-br from-orange-600/80 to-rose-700/80 hover:from-orange-500/90 hover:to-rose-600/90 transition-all shadow-lg"
                >
                  <Cloud className="w-7 h-7 text-orange-100 mx-auto mb-2" />
                  <span className="block text-orange-50 font-bold text-sm">Body Rain</span>
                  <span className="block text-orange-200/80 text-xs mt-0.5">1.00 USDC</span>
                  <TrendingUp className="absolute top-2 right-2 w-4 h-4 text-orange-300/40" />
                </motion.button>
              </div>
            </div>

            {/* Vertical Feed Cards */}
            <div className="px-5 pt-2 pb-8 space-y-3 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/60 mb-1">
                Ways to Bestow
              </p>
              {rainCards.map((card, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <Link
                    to={card.href}
                    onClick={closePanel}
                    className={`block rounded-2xl p-4 bg-gradient-to-r ${card.accent} border border-amber-700/20 hover:border-amber-500/40 backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-[0.98]`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0">
                        <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-amber-50 text-sm">{card.title}</div>
                        <span className="text-amber-300/60 text-xs">{card.subtitle}</span>
                      </div>
                      <div className="text-amber-500/40 text-lg">›</div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
