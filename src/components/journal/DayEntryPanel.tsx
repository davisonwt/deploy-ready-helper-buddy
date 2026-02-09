/**
 * Day Entry Panel - Simplified version using Supabase only
 */

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { calculateCreatorDate } from '@/utils/dashboardCalendar'
import { NotesForm } from './forms/NotesForm'
import { MediaForm } from './forms/MediaForm'
import { PrayerForm } from './forms/PrayerForm'
import { LifeForm } from './forms/LifeForm'
import { SpiritualForm } from './forms/SpiritualForm'

interface DayEntryPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  yhwhDate: ReturnType<typeof calculateCreatorDate>
  initialTab?: 'notes' | 'media' | 'prayer' | 'life' | 'spiritual'
}

export function DayEntryPanel({ isOpen, onClose, selectedDate, yhwhDate, initialTab = 'notes' }: DayEntryPanelProps) {
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const closePanel = () => {
    onClose()
    document.body.style.overflow = ''
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      <div onClick={closePanel} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="absolute top-0 left-0 right-0 bottom-0 w-full max-w-4xl mx-auto shadow-2xl pointer-events-auto flex flex-col bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-white/10 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-white">
              Month {yhwhDate.month}, Day {yhwhDate.day}
            </h2>
            <p className="text-yellow-300 mt-1">
              {yhwhDate.weekDay === 7 ? 'Shabbat' : `Day ${yhwhDate.weekDay}`} · Year {yhwhDate.year}
            </p>
            <p className="text-sm text-gray-300 mt-1">
              {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button onClick={closePanel} className="text-white hover:scale-110 transition">
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-5 w-full bg-white/10 mx-6 mt-4" style={{ width: 'calc(100% - 3rem)' }}>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="prayer">Prayer</TabsTrigger>
            <TabsTrigger value="life">Life</TabsTrigger>
            <TabsTrigger value="spiritual">Spiritual</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="notes" className="h-full m-0">
              <NotesForm selectedDate={selectedDate} yhwhDate={yhwhDate} onClose={closePanel} />
            </TabsContent>
            <TabsContent value="media" className="h-full m-0">
              <MediaForm selectedDate={selectedDate} yhwhDate={yhwhDate} onClose={closePanel} />
            </TabsContent>
            <TabsContent value="prayer" className="h-full m-0">
              <PrayerForm selectedDate={selectedDate} yhwhDate={yhwhDate} onClose={closePanel} />
            </TabsContent>
            <TabsContent value="life" className="h-full m-0">
              <LifeForm selectedDate={selectedDate} yhwhDate={yhwhDate} onClose={closePanel} />
            </TabsContent>
            <TabsContent value="spiritual" className="h-full m-0">
              <SpiritualForm selectedDate={selectedDate} yhwhDate={yhwhDate} onClose={closePanel} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
