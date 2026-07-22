import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { launchSparkles, floatingScore, playSoundEffect } from '@/utils/confetti'

interface MyGardenPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function MyGardenPanel({ isOpen, onClose }: MyGardenPanelProps) {
  const navigate = useNavigate()

  const closeGarden = () => {
    onClose()
    document.body.style.overflow = '' // Restore scrolling
  }

  // Handle body scroll when panel opens/closes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    } else {
      document.body.style.overflow = '' // Restore scrolling
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

      const mysterySeed = () => {
        const gifts = [1, 2, 5, 10];
        const won = gifts[Math.floor(Math.random() * gifts.length)];
        playSoundEffect('mysterySeed', 0.9);
        floatingScore(won);
        launchSparkles();
        alert(`You found ${won} USDC inside the seed! Check Community Music →`)
        navigate('/products?filter=music')
        closeGarden()
      }

  const surpriseMe = () => {
    launchSparkles();
    const routes = ['/products?filter=music', '/products?filter=video', '/products']
    const randomRoute = routes[Math.floor(Math.random() * routes.length)]
    navigate(randomRoute)
    closeGarden()
  }

      const quickRain = () => {
        const rainAmount = 0.50;
        if (typeof window !== 'undefined') {
          if (window.launchConfetti) {
            window.launchConfetti();
          }
          if (window.floatingScore) {
            window.floatingScore(rainAmount, window.innerWidth - 100, window.innerHeight - 100);
          }
        }
        playSoundEffect('quickRain', 1.0);
        alert("0.50 USDC sent to a random creator!")
        closeGarden()
      }

  // Garden cards - EXACTLY matching "My Content" dropdown items
  const gardenCards = [
    { href: '/my-orchards', title: 'My S2G Orchards', subtitle: '3 growing · +12 fruits today' },
    { 
      href: '/364yhvh-orchards', 
      title: 'S2G Community Orchards', 
      subtitle: '50+ projects need your rain',
      badge: '2 new'
    },
    { href: '/my-products', title: 'My S2G Products', subtitle: '11 items · earned 83 USDC' },
    { href: '/products', title: 'Community Creations', subtitle: 'Everything in one place' },
    { href: '/music-library', title: 'My S2G Music Library', subtitle: '8 tracks · 41 plays today' },
    { href: '/products?filter=music', title: 'Community Music', subtitle: 'Now inside Creations' },
    { href: '/my-s2g-library', title: 'My S2G Library', subtitle: 'Upload your first e-book!' },
    { href: '/products?filter=ebook', title: 'Community Library', subtitle: 'E-books, courses, docs' },
    { href: '/products?filter=video', title: 'Marketing Videos', subtitle: 'All videos here now' },
    { href: '/eternal-forest', title: 'Eternal Forest', subtitle: 'See every soul growing live' },
    { 
      onClick: () => {
        if (typeof window !== 'undefined' && window.startJitsi) {
          window.startJitsi('GardenRadioLive');
        }
        closeGarden();
      },
      title: 'Garden Radio Live', 
      subtitle: 'Jump in now – 12 listening' 
    }
  ]

  // Quick action routes - matching actual upload/create routes
  const quickActions = [
    { href: '/create-orchard', label: 'New Orchard', color: 'bg-green-600 hover:bg-green-500' },
    { href: '/music-library', label: 'Drop Music', color: 'bg-pink-600 hover:bg-pink-500' }, // Music uploads happen on music-library page
    { href: '/products/upload', label: 'New Resource', color: 'bg-yellow-600 hover:bg-yellow-500' }, // Product upload route
    { href: '/seller/business-settings', label: 'Business Settings', color: 'bg-blue-600 hover:bg-blue-500' },
    { href: '#', label: 'Rain Now', color: 'bg-red-600 hover:bg-red-500', onClick: quickRain } // Quick Rain action
  ]

  // Tribal Tiers — SeedFlows by scale (mirrors dashboard tier card)
  const tribalTiers = [
    { href: '/homestead',     emoji: '🏠', title: 'Homestead',     subtitle: 'Individual sowers · single-owned home businesses' },
    { href: '/grove',         emoji: '🌳', title: 'Grove',          subtitle: 'Small businesses with a tight tribe' },
    { href: '/orchard',       emoji: '🍎', title: 'Orchard',        subtitle: 'Medium businesses with rows of fruit' },
    { href: '/estate',        emoji: '🏛️', title: 'Estate',         subtitle: 'Large businesses with sprawling reach' },
    { href: '/harvest-works', emoji: '🏭', title: 'Harvest Works',  subtitle: 'Factories & manufacturing networks' },
    { href: '/dashboard/sower/upload', emoji: '📤', title: 'Bulk Upload Products', subtitle: 'Upload CSV / Excel / PDF — many products at once', badge: 'New' },
  ]

  // Don't render anything if panel is closed
  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Garden Panel - Only visible when isOpen is true */}
      <div
        id="s2g-garden"
        className="fixed inset-0 z-50 pointer-events-auto"
      >
        {/* Dark backdrop */}
        <div
          id="garden-backdrop"
          onClick={closeGarden}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500 opacity-100"
        />

        {/* Sliding panel */}
        <div
          id="garden-panel"
          className="absolute inset-y-0 left-0 w-full max-w-lg shadow-2xl transform transition-transform duration-500 pointer-events-auto overflow-y-auto translate-x-0" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)' }}
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
              {quickActions.map((action, index) => {
                if (action.onClick) {
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        action.onClick?.();
                        closeGarden();
                      }}
                      className={`${action.color} rounded-3xl p-8 text-center font-bold text-xl shadow-2xl hover:scale-105 transition`}
                    >
                      {action.label}
                    </button>
                  );
                }
                return (
                  <Link
                    key={index}
                    to={action.href}
                    onClick={closeGarden}
                    className={`${action.color} rounded-3xl p-8 text-center font-bold text-xl shadow-2xl hover:scale-105 transition`}
                  >
                    {action.label}
                  </Link>
                );
              })}
            </div>

            {/* Tribal Tiers — SeedFlows by scale */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-yellow-300/80 px-1">
                🌐 Tribal Tiers — SeedFlows by scale
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tribalTiers.map((tier) => (
                  <Link
                    key={tier.href}
                    to={tier.href}
                    onClick={closeGarden}
                    className="relative flex items-start gap-3 bg-white/5 hover:bg-white/15 border border-white/10 hover:border-yellow-400/40 rounded-2xl p-4 transition-all hover:scale-[1.02]"
                  >
                    <span className="text-2xl leading-none">{tier.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-base truncate">{tier.title}</div>
                      <div className="text-teal-200/80 text-xs leading-snug">{tier.subtitle}</div>
                    </div>
                    {tier.badge && (
                      <span className="absolute top-2 right-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {tier.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Garden cards */}
            <div className="space-y-5">
              {gardenCards.map((card, index) => {
                if (card.onClick) {
                  // Handle onClick cards (like Garden Radio Live)
                  return (
                    <button
                      key={index}
                      onClick={card.onClick}
                      className="garden-card relative overflow-hidden flex items-center justify-between bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-3xl p-6 transition-all hover:scale-105 shadow-xl w-full text-left"
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
                    </button>
                  );
                }
                // Handle Link cards (normal navigation)
                return (
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
                );
              })}
            </div>

            {/* Daily Mystery Seed */}
            <div
              onClick={mysterySeed}
              className="bg-gradient-to-r from-yellow-500 to-pink-600 rounded-3xl p-10 text-center cursor-pointer hover:scale-105 transition-all shadow-2xl"
            >
              <div className="text-7xl mb-4">🌱</div>
              <div className="text-2xl font-bold">Daily Mystery Seed</div>
              <div className="text-2xl font-bold mt-2">Tap me – something beautiful grows…</div>
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

