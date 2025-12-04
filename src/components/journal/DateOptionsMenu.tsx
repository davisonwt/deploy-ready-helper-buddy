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

  const handleOptionSelect = (optionId: 'notes' | 'media' | 'prayer' | 'life' | 'spiritual') => {
    setSelectedForm(optionId)
    onSelectOption?.(optionId)
  }

  const handleFormClose = () => {
    setSelectedForm(null)
  }

  const handleFormSave = () => {
    setSelectedForm(null)
    onClose()
  }

  const closeMenu = () => {
    setSelectedForm(null)
    onClose()
  }

  if (!isOpen) return null

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
    <div className="fixed inset-0 z-50">
      {/* Fixed backdrop - doesn't scroll */}
      <div
        onClick={closeMenu}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Scrollable container - covers full viewport */}
      <div className="fixed inset-0 overflow-y-auto">
        {/* Content wrapper with padding for scroll space */}
        <div className="min-h-full py-6 px-4 flex items-start justify-center">
          {/* Options Menu Panel */}
          <div
            className={`relative z-10 ${selectedForm ? 'flex gap-4 w-full max-w-4xl' : 'w-full max-w-md'}`}
          >
            {/* Main Options Panel */}
            <div className={`${selectedForm ? 'w-80 flex-shrink-0' : 'w-full'} bg-gradient-to-br from-purple-950 via-indigo-900 to-teal-900 rounded-2xl shadow-2xl`}>
              {/* Close Button */}
              <div className="flex justify-end p-4">
                <button
                  onClick={closeMenu}
                  className="text-white hover:scale-110 transition bg-white/20 rounded-full p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="px-6 pb-8 space-y-6 text-white">
                {/* Date Header */}
                <div className="text-center">
                  <h2 className="text-3xl font-bold">
                    Month {yhwhDate.month}, Day {yhwhDate.day}
                  </h2>
                  <p className="text-yellow-300 text-lg mt-2">
                    {yhwhDate.weekDay === 7 ? 'Shabbat' : `Day ${yhwhDate.weekDay}`} · Year {yhwhDate.year}
                  </p>
                  <p className="text-sm text-gray-300 mt-1">
                    {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                {/* Options grid */}
                <div className="space-y-4 pb-4">
                  {options.map((option, index) => {
                    const Icon = option.icon
                    return (
                      <motion.button
                        key={option.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleOptionSelect(option.id as 'notes' | 'media' | 'prayer' | 'life' | 'spiritual')}
                        className={`${option.color} rounded-2xl p-5 text-left w-full transition-all hover:scale-[1.02] shadow-lg`}
                      >
                        <div className="flex items-start gap-4">
                          <Icon className="h-7 w-7 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-bold text-lg">{option.label}</div>
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
              <div className="flex-1 bg-black/50 rounded-2xl overflow-hidden">
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
      </div>
    </div>
  )
}
