import React, { useState } from 'react'
import { X, FileText, Image, Heart, Users, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { NotesForm } from './forms/NotesForm'
import { MediaForm } from './forms/MediaForm'
import { PrayerForm } from './forms/PrayerForm'
import { LifeForm } from './forms/LifeForm'
import { SpiritualForm } from './forms/SpiritualForm'
import { calculateCreatorDate } from '@/utils/dashboardCalendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DateOptionsMenuProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  yhwhDate: ReturnType<typeof calculateCreatorDate>
  onSelectOption?: (tab: 'notes' | 'media' | 'prayer' | 'life' | 'spiritual') => void
}

export function DateOptionsMenu({ isOpen, onClose, selectedDate, yhwhDate, onSelectOption }: DateOptionsMenuProps) {
  const [selectedForm, setSelectedForm] = useState<'notes' | 'media' | 'prayer' | 'life' | 'spiritual' | null>(null)

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeMenu()}>
      <DialogContent className="max-w-md sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-purple-950 via-indigo-900 to-teal-900 border-purple-700 p-0">
        <div className={`${selectedForm ? 'flex flex-col sm:flex-row gap-4' : ''}`}>
          {/* Main Options Panel */}
          <div className={`${selectedForm ? 'sm:w-80 flex-shrink-0' : 'w-full'} p-6`}>
            <DialogHeader className="mb-6">
              <DialogTitle className="text-center text-white">
                <h2 className="text-3xl font-bold">
                  Month {yhwhDate.month}, Day {yhwhDate.day}
                </h2>
                <p className="text-yellow-300 text-lg mt-2 font-normal">
                  {yhwhDate.weekDay === 7 ? 'Shabbat' : `Day ${yhwhDate.weekDay}`} · Year {yhwhDate.year}
                </p>
                <p className="text-sm text-gray-300 mt-1 font-normal">
                  {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </DialogTitle>
            </DialogHeader>

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
                    className={`${option.color} rounded-2xl p-5 text-left w-full transition-all hover:scale-[1.02] shadow-lg text-white`}
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

          {/* Form Panel - Right Side (when form is selected) */}
          {selectedForm && (
            <div className="flex-1 bg-black/50 rounded-2xl overflow-hidden min-h-[400px]">
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
      </DialogContent>
    </Dialog>
  )
}
