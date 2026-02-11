import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, ChevronDown } from 'lucide-react'
import { launchSparkles, floatingScore, playSoundEffect } from '@/utils/confetti'
import { supabase } from '@/integrations/supabase/client'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface MyGardenPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function MyGardenPanel({ isOpen, onClose }: MyGardenPanelProps) {
  const navigate = useNavigate()
  const [serviceCounts, setServiceCounts] = useState({ drivers: 0, whisperers: 0, serviceProviders: 0 })

  // Fetch approved service provider counts
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
    document.body.style.overflow = '' // Restore scrolling
  }

  // Handle body scroll and fetch data when panel opens/closes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      fetchServiceCounts()
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, fetchServiceCounts])

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

  // Garden sections with collapsible groups
  const gardenSections = [
    {
      id: 'my-content',
      title: 'My Content',
      emoji: '📦',
      cards: [
        { href: '/my-orchards', title: 'My S2G Orchards', subtitle: '3 growing · +12 fruits today' },
        { href: '/my-products', title: 'My S2G Seeds', subtitle: '11 items · earned 83 USDC' },
        { href: '/music-library', title: 'My S2G Music Library', subtitle: '8 tracks · 41 plays today' },
        { href: '/my-s2g-library', title: 'My S2G Library', subtitle: 'Upload your first e-book!' },
      ]
    },
    {
      id: 'community',
      title: 'Community',
      emoji: '🌍',
      cards: [
        { 
          href: '/364yhvh-orchards', 
          title: 'S2G Community Orchards', 
          subtitle: '50+ projects need your rain',
          badge: '2 new'
        },
        { href: '/products', title: 'Community Creations', subtitle: 'Everything in one place' },
        { href: '/community-music-library', title: 'Community Music Library', subtitle: 'Build your album from sower tracks' },
        { href: '/s2g-community-library', title: 'Community Library', subtitle: 'E-books, courses, docs' },
        { href: '/eternal-forest', title: 'Eternal Forest', subtitle: 'See every soul growing live' },
      ]
    },
    {
      id: 'services',
      title: 'Services',
      emoji: '🛠️',
      cards: [
        { 
          href: '/community-drivers', 
          title: 'S2G Community Drivers', 
          subtitle: serviceCounts.drivers > 0 
            ? `${serviceCounts.drivers} approved driver${serviceCounts.drivers !== 1 ? 's' : ''} available`
            : 'Find drivers for deliveries & transport',
          badge: serviceCounts.drivers > 0 ? `${serviceCounts.drivers} available` : undefined
        },
        { 
          href: '/community-services', 
          title: 'S2G Community Services', 
          subtitle: serviceCounts.serviceProviders > 0 
            ? `${serviceCounts.serviceProviders} service provider${serviceCounts.serviceProviders !== 1 ? 's' : ''} ready to help`
            : 'Find skilled service providers',
          badge: serviceCounts.serviceProviders > 0 ? `${serviceCounts.serviceProviders} available` : undefined
        },
        { 
          href: '/become-whisperer', 
          title: 'Browse Whisperers', 
          subtitle: serviceCounts.whisperers > 0 
            ? `${serviceCounts.whisperers} whisperer${serviceCounts.whisperers !== 1 ? 's' : ''} ready to promote`
            : 'Find marketing agents to grow your seeds',
          badge: serviceCounts.whisperers > 0 ? `${serviceCounts.whisperers} active` : undefined
        },
        { href: '/ambassador-thumbnail', title: 'Become a S2G Ambassador', subtitle: 'Join our ambassador program' },
      ]
    },
    {
      id: 'tools',
      title: 'Tools',
      emoji: '⚙️',
      cards: [
        { href: '/profile?tab=journal', title: 'Journal & Calendar', subtitle: 'Track your spiritual journey' },
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
    }
  ]

  // Default open sections
  const [openSections, setOpenSections] = useState<string[]>(['my-content', 'community'])

  // Quick action routes - matching actual upload/create routes
  const quickActions = [
    { href: '/create-orchard', label: 'New Orchard', color: 'bg-green-600 hover:bg-green-500' },
    { href: '/music-library', label: 'Drop Music', color: 'bg-pink-600 hover:bg-pink-500' }, // Music uploads happen on music-library page
    { href: '/products/upload', label: 'New Resource', color: 'bg-yellow-600 hover:bg-yellow-500' }, // Product upload route
    { href: '#', label: 'Rain Now', color: 'bg-red-600 hover:bg-red-500', onClick: quickRain } // Quick Rain action
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
          className="absolute inset-y-0 left-0 w-full max-w-lg bg-gradient-to-br from-purple-950 via-indigo-900 to-teal-900 shadow-2xl transform transition-transform duration-500 pointer-events-auto overflow-y-auto translate-x-0"
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

            {/* Garden sections with accordion */}
            <Accordion 
              type="multiple" 
              value={openSections}
              onValueChange={setOpenSections}
              className="space-y-3"
            >
              {gardenSections.map((section) => (
                <AccordionItem 
                  key={section.id} 
                  value={section.id}
                  className="border-0 bg-white/5 rounded-2xl overflow-hidden"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-white/10 transition-colors [&[data-state=open]>svg]:rotate-180">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{section.emoji}</span>
                      <span className="font-semibold text-lg">{section.title}</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                        {section.cards.length}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-2">
                      {section.cards.map((card, cardIndex) => {
                        if (card.onClick) {
                          return (
                            <button
                              key={cardIndex}
                              onClick={card.onClick}
                              className="garden-card relative overflow-hidden flex items-center justify-between bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-xl p-4 transition-all hover:scale-[1.02] shadow-lg w-full text-left"
                            >
                              <div>
                                <div className="font-medium text-base">{card.title}</div>
                                <span className="text-teal-200 text-xs">{card.subtitle}</span>
                              </div>
                              {card.badge && (
                                <span className="bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                                  {card.badge}
                                </span>
                              )}
                            </button>
                          );
                        }
                        return (
                          <Link
                            key={cardIndex}
                            to={card.href}
                            onClick={closeGarden}
                            className="garden-card relative overflow-hidden flex items-center justify-between bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-xl p-4 transition-all hover:scale-[1.02] shadow-lg block"
                          >
                            <div>
                              <div className="font-medium text-base">{card.title}</div>
                              <span className="text-teal-200 text-xs">{card.subtitle}</span>
                            </div>
                            {card.badge && (
                              <span className="bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                                {card.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

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

