import React, { useState, useEffect } from 'react'
import { X, FileText, Image, Heart, Users, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { NotesForm } from './forms/NotesForm'
import { MediaForm } from './forms/MediaForm'
import { PrayerForm } from './forms/PrayerForm'
import { LifeForm } from './forms/LifeForm'
import { SpiritualForm } from './forms/SpiritualForm'
import { calculateCreatorDate } from '@/utils/dashboardCalendar'

interface DateOptionsMenuProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  yhwhDate: ReturnType<typeof calculateCreatorDate>
  onSelectOption?: (tab: 'notes' | 'media' | 'prayer' | 'life' | 'spiritual') => void
}

export function DateOptionsMenu({ isOpen, onClose, selectedDate, yhwhDate, onSelectOption }: DateOptionsMenuProps) {
  const [selectedForm, setSelectedForm] = useState<'notes' | 'media' | 'prayer' | 'life' | 'spiritual' | null>(null)

  if (!isOpen) return null

  const closeMenu = () => {
    setSelectedForm(null)
    onClose()
    document.body.style.overflow = ''
  }

  const handleOptionSelect = (optionId: 'notes' | 'media' | 'prayer' | 'life' | 'spiritual') => {
    setSelectedForm(optionId)
    onSelectOption?.(optionId)
  }

  const handleFormClose = () => {
    setSelectedForm(null)
  }

  const handleFormSave = () => {
    // Form saved, can keep menu open or close
    // For now, keep menu open so user can add more entries
  }

  // Handle body scroll when menu opens/closes
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
    <div className="fixed inset-0 z-50 pointer-events-auto h-screen w-screen">
        {/* Dark backdrop */}
        <div
          onClick={closeMenu}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500 opacity-100"
        />

        {/* Container for menu and form side-by-side - positioned at top */}
        <div className="absolute top-0 left-0 right-0 bottom-0 flex h-screen overflow-hidden">
          {/* Options Menu - Left Side */}
          <div
            className={`${selectedForm ? 'w-80' : 'w-full max-w-md'} bg-gradient-to-br from-purple-950 via-indigo-900 to-teal-900 shadow-2xl transform transition-all duration-500 pointer-events-auto flex flex-col h-full overflow-hidden`}
          >
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-8 pb-32 space-y-8 text-white scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent" style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
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
            <div className="text-center">
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
                    onClick={() => handleOptionSelect(option.id as 'notes' | 'media' | 'prayer' | 'life' | 'spiritual')}
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

          {/* Form Panel - Right Side (when form is selected) */}
          {selectedForm && (
            <div className="flex-1 bg-black/50 pointer-events-auto overflow-hidden">
              {selectedForm === 'notes' && (
                <NotesForm
                  selectedDate={selectedDate}
                  yhwhDate={yhwhDate}
                  onClose={handleFormClose}
                  onSave={handleFormSave}
                />
              )}
              {selectedForm === 'media' && (
                <MediaForm
                  selectedDate={selectedDate}
                  yhwhDate={yhwhDate}
                  onClose={handleFormClose}
                  onSave={handleFormSave}
                />
              )}
              {selectedForm === 'prayer' && (
                <PrayerForm
                  selectedDate={selectedDate}
                  yhwhDate={yhwhDate}
                  onClose={handleFormClose}
                  onSave={handleFormSave}
                />
              )}
              {selectedForm === 'life' && (
                <LifeForm
                  selectedDate={selectedDate}
                  yhwhDate={yhwhDate}
                  onClose={handleFormClose}
                  onSave={handleFormSave}
                />
              )}
              {selectedForm === 'spiritual' && (
                <SpiritualForm
                  selectedDate={selectedDate}
                  yhwhDate={yhwhDate}
                  onClose={handleFormClose}
                  onSave={handleFormSave}
                />
              )}
            </div>
          )}
        </div>
    </div>
  )
}

