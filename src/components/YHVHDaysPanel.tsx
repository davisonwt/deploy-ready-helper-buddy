import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Calendar, Circle } from 'lucide-react'

interface YHVHDaysPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function YHVHDaysPanel({ isOpen, onClose }: YHVHDaysPanelProps) {
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

  const menuItems = [
    { 
      href: '/enochian-calendar-design', 
      title: "Ed's Beads", 
      subtitle: 'Bead calendar with monthly strands',
      icon: Circle,
      gradient: 'from-purple-600 to-pink-600'
    },
    { 
      href: '/wheels-in-itself', 
      title: 'Wheels in Itself', 
      subtitle: 'YHVH 6-wheel rotating calendar',
      icon: Calendar,
      gradient: 'from-amber-600 to-orange-600'
    }
  ]

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* Dark backdrop */}
      <div
        onClick={closePanel}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500 opacity-100"
      />

      {/* Sliding panel */}
      <div className="absolute inset-y-0 left-0 w-full max-w-lg bg-gradient-to-br from-indigo-950 via-purple-900 to-amber-900 shadow-2xl transform transition-transform duration-500 pointer-events-auto overflow-y-auto translate-x-0">
        <div className="p-8 pb-32 space-y-8 text-white">
          {/* Close X */}
          <div className="flex justify-end">
            <button
              onClick={closePanel}
              className="text-4xl hover:scale-125 transition"
            >
              <X className="w-8 h-8" />
            </button>
          </div>

          {/* Hero */}
          <div className="text-center -mt-6">
            <h2 className="text-4xl font-bold flex items-center justify-center gap-4">
              <Calendar className="w-10 h-10 text-amber-400" />
              <span>364yhvh Days</span>
            </h2>
            <p className="text-amber-300 text-lg mt-3">
              Experience the Creator's calendar systems
            </p>
          </div>

          {/* Menu items */}
          <div className="space-y-5">
            {menuItems.map((item, index) => {
              const Icon = item.icon
              return (
                <Link
                  key={index}
                  to={item.href}
                  onClick={closePanel}
                  className={`relative overflow-hidden flex items-center gap-6 bg-gradient-to-r ${item.gradient} hover:scale-105 backdrop-blur-lg rounded-3xl p-8 transition-all shadow-xl`}
                >
                  <div className="p-4 bg-white/20 rounded-2xl">
                    <Icon className="w-10 h-10" />
                  </div>
                  <div>
                    <div className="font-bold text-2xl">{item.title}</div>
                    <span className="text-white/80 text-lg">{item.subtitle}</span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Decorative element */}
          <div className="mt-12 text-center">
            <div className="inline-block p-8 bg-gradient-to-r from-amber-500/20 to-purple-500/20 rounded-full">
              <div className="text-6xl">🌍</div>
              <p className="mt-4 text-amber-200 font-medium">
                Wheels within wheels, as in Ezekiel
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
