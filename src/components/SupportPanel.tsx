import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Heart, Users, HandHeart } from 'lucide-react'

interface SupportPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SupportPanel({ isOpen, onClose }: SupportPanelProps) {
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

  const supportCards = [
    { href: '/support-us', title: 'Support Us', subtitle: 'Help grow the community', icon: Heart },
    { href: '/364yhvh-orchards', title: 'Community Orchards', subtitle: 'Support community projects', icon: Users },
    { href: '/tithing', title: 'Tithing', subtitle: 'Give 10% · Support the work', icon: HandHeart },
    { href: '/free-will-gifting', title: 'Free-Will Gifting', subtitle: 'Give as led · Any amount', icon: Heart },
  ]

  const quickActions = [
    { href: '/support-us', label: 'Support Us', color: 'bg-pink-600 hover:bg-pink-500', icon: Heart },
    { href: '/364yhvh-orchards', label: 'Community', color: 'bg-red-600 hover:bg-red-500', icon: Users },
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
        <div className="absolute inset-y-0 left-0 w-full max-w-lg bg-gradient-to-br from-pink-950 via-rose-900 to-red-900 shadow-2xl transform transition-transform duration-500 pointer-events-auto overflow-y-auto translate-x-0">
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
                <Heart className="w-10 h-10" />
                <span>Support</span>
              </h2>
              <p className="text-yellow-300 text-lg mt-3">
                Help grow the community · Support the work · Make a difference ❤️
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
              {supportCards.map((card, index) => (
                <Link
                  key={index}
                  to={card.href}
                  onClick={closePanel}
                  className="garden-card relative overflow-hidden flex items-center justify-between bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-3xl p-6 transition-all hover:scale-105 shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    {card.icon && <card.icon className="w-8 h-8 text-pink-300" />}
                    <div>
                      <div className="font-semibold text-lg">{card.title}</div>
                      <span className="text-pink-200 text-sm">{card.subtitle}</span>
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


