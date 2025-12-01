import React from 'react'
import { X, FileText, Image, Heart, Users, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

interface DateOptionsMenuProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  yhwhDate: { month: number; day: number; year: number; weekDay: number }
  onSelectOption: (tab: 'notes' | 'media' | 'prayer' | 'life' | 'spiritual') => void
}

export function DateOptionsMenu({ isOpen, onClose, selectedDate, yhwhDate, onSelectOption }: DateOptionsMenuProps) {
  if (!isOpen) return null

  const closeMenu = () => {
    onClose()
    document.body.style.overflow = ''
  }

  // Handle body scroll when menu opens/closes
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const options = [
    { 
      id: 'notes', 
      label: 'Add Notes', 
      icon: FileText, 
      color: 'bg-blue-600 hover:bg-blue-500',
      description: 'Rich text notes & dream journal'
    },
    { 
      id: 'media', 
      label: 'Add Media', 
      icon: Image, 
      color: 'bg-purple-600 hover:bg-purple-500',
      description: 'Photos, videos & voice notes'
    },
    { 
      id: 'prayer', 
      label: 'Add Prayer', 
      icon: Heart, 
      color: 'bg-pink-600 hover:bg-pink-500',
      description: 'Prayer requests & answered prayers'
    },
    { 
      id: 'life', 
      label: 'Add Life Entry', 
      icon: Users, 
      color: 'bg-green-600 hover:bg-green-500',
      description: 'Birthdays, health, tithes & more'
    },
    { 
      id: 'spiritual', 
      label: 'Add Spiritual', 
      icon: Sparkles, 
      color: 'bg-yellow-600 hover:bg-yellow-500',
      description: 'Prophetic words & AI prompts'
    }
  ]

  return (
    <>
      {/* Menu Panel - Only visible when isOpen is true */}
      <div
        className="fixed inset-0 z-50 pointer-events-auto"
      >
        {/* Dark backdrop */}
        <div
          onClick={closeMenu}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500 opacity-100"
        />

        {/* Sliding panel */}
        <div
          className="absolute inset-y-0 left-0 w-full max-w-md bg-gradient-to-br from-purple-950 via-indigo-900 to-teal-900 shadow-2xl transform transition-transform duration-500 pointer-events-auto overflow-y-auto translate-x-0"
        >
          <div className="p-8 pb-32 space-y-8 text-white">
            {/* Close X */}
            <div className="flex justify-end">
              <button
                onClick={closeMenu}
                className="text-4xl hover:scale-125 transition"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* Date Header */}
            <div className="text-center -mt-6">
              <h2 className="text-4xl font-bold flex items-center justify-center gap-4">
                <span>Month {yhwhDate.month}, Day {yhwhDate.day}</span>
              </h2>
              <p className="text-yellow-300 text-lg mt-3">
                {yhwhDate.weekDay === 7 ? 'Shabbat' : `Day ${yhwhDate.weekDay}`} · Year {yhwhDate.year}
              </p>
              <p className="text-sm text-gray-300 mt-1">
                {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Options grid */}
            <div className="space-y-4">
              {options.map((option, index) => {
                const Icon = option.icon
                return (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => {
                      onSelectOption(option.id as 'notes' | 'media' | 'prayer' | 'life' | 'spiritual')
                      closeMenu()
                    }}
                    className={`${option.color} rounded-3xl p-6 text-left w-full transition-all hover:scale-105 shadow-xl`}
                  >
                    <div className="flex items-start gap-4">
                      <Icon className="h-8 w-8 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-bold text-xl mb-1">{option.label}</div>
                        <div className="text-sm opacity-90">{option.description}</div>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

