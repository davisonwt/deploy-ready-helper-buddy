import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Settings, Radio, Wallet, Sprout, Megaphone, Shield, BarChart3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface GosatPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function GosatPanel({ isOpen, onClose }: GosatPanelProps) {
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

  const gosatCards = [
    {
      href: '/admin/dashboard',
      title: 'Admin Dashboard',
      subtitle: 'Manage settings & oversight',
      icon: Settings,
      accent: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-400',
    },
    {
      href: '/admin/radio',
      title: 'AOD Station Radio',
      subtitle: 'Radio management & scheduling',
      icon: Radio,
      accent: 'from-orange-500/20 to-rose-500/20',
      iconColor: 'text-orange-400',
    },
    {
      href: '/gosat/wallets',
      title: 'Organization Wallets',
      subtitle: 'Manage organization funds',
      icon: Wallet,
      accent: 'from-rose-500/20 to-pink-500/20',
      iconColor: 'text-rose-400',
    },
    {
      href: '/admin/seeds',
      title: 'Seeds Management',
      subtitle: 'Manage seeds & orchards',
      icon: Sprout,
      accent: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      href: '/gosat/wallets?tab=announcements',
      title: 'Announcements',
      subtitle: 'Send bulk messages to users',
      icon: Megaphone,
      accent: 'from-pink-500/20 to-amber-500/20',
      iconColor: 'text-pink-400',
    },
  ]

  const quickActions = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: BarChart3, gradient: 'from-amber-600/80 to-orange-700/80' },
    { href: '/admin/radio', label: 'Radio', icon: Radio, gradient: 'from-orange-600/80 to-rose-700/80' },
    { href: '/gosat/wallets', label: 'Wallets', icon: Wallet, gradient: 'from-rose-600/80 to-pink-700/80' },
    { href: '/admin/seeds', label: 'Seeds', icon: Sprout, gradient: 'from-emerald-600/80 to-teal-700/80' },
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
            background: 'linear-gradient(165deg, #1a1510 0%, #2a1d14 30%, #352218 60%, #1e1610 100%)',
          }}
        >
          <div className="flex flex-col min-h-full">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/30 border-b border-amber-800/30">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-amber-50">GoSat's</h2>
                    <p className="text-xs text-amber-300/70">Admin · Radio · Organization ⚙️</p>
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

            {/* Quick Actions Grid */}
            <div className="px-5 pt-5 pb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/60 mb-3">
                Quick Access
              </p>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={action.href}
                      onClick={closePanel}
                      className={`block rounded-2xl p-4 text-center bg-gradient-to-br ${action.gradient} hover:brightness-110 transition-all shadow-lg active:scale-95`}
                    >
                      <action.icon className="w-7 h-7 text-amber-100 mx-auto mb-2" />
                      <span className="block text-amber-50 font-bold text-sm">{action.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Vertical Feed Cards */}
            <div className="px-5 pt-2 pb-8 space-y-3 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/60 mb-1">
                Management Tools
              </p>
              {gosatCards.map((card, index) => (
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
