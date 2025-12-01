import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, Cloud, HandHeart, Gift } from 'lucide-react'
import { launchSparkles, floatingScore, playSoundEffect } from '@/utils/confetti'

interface LetItRainPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function LetItRainPanel({ isOpen, onClose }: LetItRainPanelProps) {
  const navigate = useNavigate()

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

  const quickRain = () => {
    const rainAmount = 0.50
    if (typeof window !== 'undefined') {
      if (window.launchConfetti) {
        window.launchConfetti()
      }
      if (window.floatingScore) {
        window.floatingScore(rainAmount, window.innerWidth - 100, window.innerHeight - 100)
      }
    }
    playSoundEffect('quickRain', 1.0)
    alert("0.50 USDC sent to a random creator!")
    closePanel()
  }

  const rainAmount = () => {
    const rainAmount = 1.00
    if (typeof window !== 'undefined') {
      if (window.launchConfetti) {
        window.launchConfetti()
      }
      if (window.floatingScore) {
        window.floatingScore(rainAmount, window.innerWidth - 100, window.innerHeight - 100)
      }
    }
    playSoundEffect('quickRain', 1.0)
    alert("1.00 USDC sent to a random creator!")
    closePanel()
  }

  const rainCards = [
    { href: '/tithing', title: 'Tithing', subtitle: 'Give 10% · Support the work', icon: HandHeart },
    { href: '/free-will-gifting', title: 'Free-Will Gifting', subtitle: 'Give as led · Any amount', icon: Gift },
    { href: '/364yhvh-orchards', title: 'Rain on Orchards', subtitle: 'Support community projects', icon: Cloud },
  ]

  const quickActions = [
    { href: '/tithing', label: 'Tithing', color: 'bg-blue-600 hover:bg-blue-500', icon: HandHeart },
    { href: '/free-will-gifting', label: 'Free-Will Gift', color: 'bg-purple-600 hover:bg-purple-500', icon: Gift },
    { href: '#', label: 'Quick Rain 0.50', color: 'bg-green-600 hover:bg-green-500', onClick: quickRain },
    { href: '#', label: 'Body Rain 1.00', color: 'bg-teal-600 hover:bg-teal-500', onClick: bodyAmount },
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
        <div className="absolute inset-y-0 left-0 w-full max-w-lg bg-gradient-to-br from-blue-950 via-indigo-900 to-purple-900 shadow-2xl transform transition-transform duration-500 pointer-events-auto overflow-y-auto translate-x-0">
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
                <Cloud className="w-10 h-10" />
                <span>Let It Rain!</span>
              </h2>
              <p className="text-yellow-300 text-lg mt-3">
                Support the work · Bless the community · Make it rain! 💧
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {quickActions.map((action, index) => {
                if (action.onClick) {
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        action.onClick?.()
                        closePanel()
                      }}
                      className={`${action.color} rounded-3xl p-8 text-center font-bold text-xl shadow-2xl hover:scale-105 transition flex flex-col items-center gap-2`}
                    >
                      {action.icon && <action.icon className="w-8 h-8" />}
                      {action.label}
                    </button>
                  )
                }
                return (
                  <Link
                    key={index}
                    to={action.href}
                    onClick={closePanel}
                    className={`${action.color} rounded-3xl p-8 text-center font-bold text-xl shadow-2xl hover:scale-105 transition flex flex-col items-center gap-2`}
                  >
                    {action.icon && <action.icon className="w-8 h-8" />}
                    {action.label}
                  </Link>
                )
              })}
            </div>

            <div className="space-y-5">
              {rainCards.map((card, index) => (
                <Link
                  key={index}
                  to={card.href}
                  onClick={closePanel}
                  className="garden-card relative overflow-hidden flex items-center justify-between bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-3xl p-6 transition-all hover:scale-105 shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    {card.icon && <card.icon className="w-8 h-8 text-blue-300" />}
                    <div>
                      <div className="font-semibold text-lg">{card.title}</div>
                      <span className="text-blue-200 text-sm">{card.subtitle}</span>
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

