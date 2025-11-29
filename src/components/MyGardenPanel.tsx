import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

export function MyGardenPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const openGarden = () => {
    setIsOpen(true)
    document.body.style.overflow = 'hidden' // Prevent background scrolling
  }

  const closeGarden = () => {
    setIsOpen(false)
    document.body.style.overflow = '' // Restore scrolling
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const mysterySeed = () => {
    alert("You just unlocked a hidden blessing! Check Community Music →")
    navigate('/s2g-community-music')
    closeGarden()
  }

  const surpriseMe = () => {
    const routes = ['/s2g-community-music', '/marketing-videos', '/products']
    const randomRoute = routes[Math.floor(Math.random() * routes.length)]
    navigate(randomRoute)
    closeGarden()
  }

  const quickRain = () => {
    alert("0.50 USDC sent to a random creator!")
    closeGarden()
  }

  const gardenCards = [
    { href: '/my-orchards', title: 'My Orchards', subtitle: '3 growing · +12 fruits today' },
    { 
      href: '/364yhvh-orchards', 
      title: 'Community Orchards', 
      subtitle: '50+ projects need your rain',
      badge: '2 new'
    },
    { href: '/my-products', title: 'My Creations', subtitle: '11 items · earned 83 USDC' },
    { href: '/products', title: 'Community Creations', subtitle: 'Fresh drops every hour' },
    { href: '/music-library', title: 'My Music Garden', subtitle: '8 tracks · 41 plays today' },
    { href: '/s2g-community-music', title: 'Community Music', subtitle: '26 new tracks · preview free' },
    { href: '/my-s2g-library', title: 'My Library', subtitle: 'Upload your first e-book!' },
    { href: '/s2g-community-library', title: 'Community Library', subtitle: 'Free & paid resources' },
    { href: '/marketing-videos', title: 'Marketing Videos', subtitle: '4 inspiring videos · autoplay' }
  ]

  // Quick action routes - update these to match your actual routes
  const quickActions = [
    { href: '/create-orchard', label: 'New Orchard', color: 'bg-green-600 hover:bg-green-500' },
    { href: '/upload-music', label: 'Drop Music', color: 'bg-pink-600 hover:bg-pink-500' },
    { href: '/upload-product', label: 'New Resource', color: 'bg-yellow-600 hover:bg-yellow-500' },
    { href: '/tithing', label: 'Rain Now', color: 'bg-red-600 hover:bg-red-500' }
  ]

  return (
    <>
      {/* Open Garden Button */}
      <button
        onClick={openGarden}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-white font-bold px-8 py-4 rounded-full shadow-2xl transition-all duration-300 hover:shadow-xl text-xl"
      >
        <span className="text-3xl">My Garden</span>
      </button>

      {/* Garden Panel */}
      <div
        id="s2g-garden"
        className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        {/* Dark backdrop */}
        <div
          id="garden-backdrop"
          onClick={closeGarden}
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Sliding panel */}
        <div
          id="garden-panel"
          className={`absolute inset-y-0 left-0 w-full max-w-lg bg-gradient-to-br from-purple-950 via-indigo-900 to-teal-900 shadow-2xl transform transition-transform duration-500 pointer-events-auto overflow-y-auto ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-8 pb-32 space-y-8 text-white">
            {/* Close X */}
            <div className="flex justify-end">
              <button
                onClick={closeGarden}
                className="text-4xl hover:scale-125 transition"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* Hero greeting */}
            <div className="text-center -mt-6">
              <h2 className="text-4xl font-bold flex items-center justify-center gap-4">
                <span className="animate-bounce">Welcome back!</span>
              </h2>
              <p className="text-yellow-300 text-lg mt-3">
                Your garden grew 7 new fruits today · 5-day streak 🔥
              </p>
            </div>

            {/* Quick actions grid */}
            <div className="grid grid-cols-2 gap-5">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.href}
                  onClick={closeGarden}
                  className={`${action.color} rounded-3xl p-8 text-center font-bold text-xl shadow-2xl hover:scale-105 transition`}
                >
                  {action.label}
                </Link>
              ))}
            </div>

            {/* Garden cards */}
            <div className="space-y-5">
              {gardenCards.map((card, index) => (
                <Link
                  key={index}
                  to={card.href}
                  onClick={closeGarden}
                  className="garden-card relative overflow-hidden flex items-center justify-between bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-3xl p-6 transition-all hover:scale-105 shadow-xl"
                >
                  <div>
                    <div className="font-semibold text-lg">{card.title}</div>
                    <span className="text-teal-200 text-sm">{card.subtitle}</span>
                  </div>
                  {card.badge && (
                    <span className="absolute top-4 right-4 bg-yellow-400 text-black text-xs font-bold px-4 py-2 rounded-full animate-bounce">
                      {card.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Daily Mystery Seed */}
            <div
              onClick={mysterySeed}
              className="bg-gradient-to-r from-yellow-500 to-pink-600 rounded-3xl p-10 text-center cursor-pointer hover:scale-105 transition-all shadow-2xl"
            >
              <div className="text-7xl mb-4">🌱</div>
              <div className="text-2xl font-bold">Daily Mystery Seed</div>
              <div className="text-lg mt-2">Tap me – something beautiful grows…</div>
            </div>

            {/* Bottom fun buttons */}
            <div className="flex gap-5">
              <button
                onClick={surpriseMe}
                className="flex-1 bg-teal-600 hover:bg-teal-500 py-5 rounded-xl font-bold text-xl transition"
              >
                Surprise Me
              </button>
              <button
                onClick={quickRain}
                className="flex-1 bg-red-600 hover:bg-red-500 py-5 rounded-xl font-bold text-xl transition"
              >
                Quick Rain 0.50 USDC
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

