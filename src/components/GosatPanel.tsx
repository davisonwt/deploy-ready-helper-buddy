import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Settings, Radio, Wallet, Sprout } from 'lucide-react'

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
    { href: '/admin/dashboard', title: 'Admin Dashboard', subtitle: 'Manage settings & wallets', icon: Settings },
    { href: '/admin/radio', title: 'AOD Station Radio', subtitle: 'Radio management', icon: Radio },
    { href: '/gosat/wallets', title: 'Organization Wallets', subtitle: 'Manage organization funds', icon: Wallet },
    { href: '/admin/seeds', title: 'Seeds Management', subtitle: 'Manage seeds & products', icon: Sprout },
  ]

  const quickActions = [
    { href: '/admin/dashboard', label: 'Dashboard', color: 'bg-indigo-600 hover:bg-indigo-500', icon: Settings },
    { href: '/admin/radio', label: 'Radio', color: 'bg-purple-600 hover:bg-purple-500', icon: Radio },
    { href: '/gosat/wallets', label: 'Wallets', color: 'bg-green-600 hover:bg-green-500', icon: Wallet },
    { href: '/admin/seeds', label: 'Seeds', color: 'bg-teal-600 hover:bg-teal-500', icon: Sprout },
  ]

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div className="fixed inset-0 z-50 pointer-events-auto">
        <div
          onClick={closePanel}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500 opacity-100"
        />
        <div className="absolute inset-y-0 left-0 w-full max-w-lg bg-gradient-to-br from-indigo-950 via-purple-900 to-teal-900 shadow-2xl transform transition-transform duration-500 pointer-events-auto overflow-y-auto translate-x-0">
          <div className="p-8 pb-32 space-y-8 text-white">
            <div className="flex justify-end">
              <button
                onClick={closePanel}
                className="text-4xl hover:scale-125 transition"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="text-center -mt-6">
              <h2 className="text-4xl font-bold flex items-center justify-center gap-4">
                <Settings className="w-10 h-10" />
                <span>Gosat's</span>
              </h2>
              <p className="text-yellow-300 text-lg mt-3">
                Admin tools · Radio management · Organization settings ⚙️
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.href}
                  onClick={closePanel}
                  className={`${action.color} rounded-3xl p-8 text-center font-bold text-xl shadow-2xl hover:scale-105 transition flex flex-col items-center gap-2`}
                >
                  {action.icon && <action.icon className="w-8 h-8" />}
                  {action.label}
                </Link>
              ))}
            </div>

            <div className="space-y-5">
              {gosatCards.map((card, index) => (
                <Link
                  key={index}
                  to={card.href}
                  onClick={closePanel}
                  className="garden-card relative overflow-hidden flex items-center justify-between bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-3xl p-6 transition-all hover:scale-105 shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    {card.icon && <card.icon className="w-8 h-8 text-indigo-300" />}
                    <div>
                      <div className="font-semibold text-lg">{card.title}</div>
                      <span className="text-indigo-200 text-sm">{card.subtitle}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

