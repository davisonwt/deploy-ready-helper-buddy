import React, { useState, useEffect } from 'react'
import { X, FileText, Image, Heart, Users, Sparkles, Calendar, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { calculateCreatorDate } from '@/utils/dashboardCalendar'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { useAuth } from '@/hooks/useAuth'
import { isFirebaseConfigured } from '@/integrations/firebase/config'
import { getJournalEntry } from '@/integrations/firebase/firestore'
import { supabase } from '@/integrations/supabase/client'
import { Badge } from '../ui/badge'

interface BeadPopupProps {
  isOpen: boolean
  onClose: () => void
  year: number
  month: number
  day: number
}

// Function to get feast day name based on month and day
function getFeastDayName(month: number, day: number): string | null {
  // Month 1
  if (month === 1) {
    if (day === 10) return 'Pick Lamb'
    if (day === 14) return 'Slaughter Lamb (Evening)'
    if (day >= 15 && day <= 21) return 'Feast of Unleavened Bread'
  }
  
  // Month 2
  if (month === 2) {
    if (day === 10) return 'Pick Lamb (for those who missed Month 1)'
    if (day === 14) return 'Pesach'
    if (day >= 15 && day <= 21) return 'Unleavened Bread'
  }
  
  // Month 3
  if (month === 3) {
    if (day === 15) return 'Shavuot'
    if (day === 31) return 'Intercalary Day'
  }
  
  // Month 5
  if (month === 5) {
    if (day === 3) return 'Feast of New Wine'
  }
  
  // Month 6
  if (month === 6) {
    if (day === 22) return 'Feast of New Oil'
    if (day >= 23 && day <= 27) return 'Wood Gathering Days'
    if (day === 31) return 'Intercalary Day'
  }
  
  // Month 7
  if (month === 7) {
    if (day === 1) return 'Yowm Teruah'
    if (day >= 9 && day <= 10) return 'Yowm Kippur'
    if (day >= 15 && day <= 22) return 'Sukkot'
  }
  
  // General feast days (1st and 15th of other months)
  if (month !== 1 && month !== 2 && month !== 3 && month !== 5 && month !== 6 && month !== 7) {
    if (day === 1 || day === 15) return 'Feast Day'
  }
  
  return null
}

export function BeadPopup({ isOpen, onClose, year, month, day }: BeadPopupProps) {
  const { user: firebaseUser } = useFirebaseAuth()
  const { user: supabaseUser } = useAuth()
  const user = firebaseUser || supabaseUser

  const [journalEntry, setJournalEntry] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [yhwhDate, setYhwhDate] = useState<ReturnType<typeof calculateCreatorDate> | null>(null)

  // Calculate YHWH date info
  useEffect(() => {
    if (isOpen && year && month && day) {
      // Create a Gregorian date for this YHWH date
      const gregorianDate = getGregorianDateForYhwh(year, month, day)
      const creatorDate = calculateCreatorDate(gregorianDate)
      setYhwhDate(creatorDate)
    }
  }, [isOpen, year, month, day])

  // Load journal entry
  useEffect(() => {
    if (isOpen && user && yhwhDate) {
      loadJournalEntry()
    }
  }, [isOpen, user, yhwhDate])

  const loadJournalEntry = async () => {
    if (!user || !yhwhDate) return

    setLoading(true)
    try {
      const yhwhDateStr = `Month${yhwhDate.month}Day${yhwhDate.day}`

      // Try Firebase first
      if (isFirebaseConfigured && firebaseUser) {
        const result = await getJournalEntry(firebaseUser.uid, yhwhDateStr)
        if (result.success && result.data) {
          setJournalEntry(result.data)
          setLoading(false)
          return
        }
      }

      // Try Supabase
      if (supabaseUser) {
        const { data } = await supabase
          .from('journal_entries')
          .select('content')
          .eq('user_id', supabaseUser.id)
          .eq('yhwh_year', yhwhDate.year)
          .eq('yhwh_month', yhwhDate.month)
          .eq('yhwh_day', yhwhDate.day)
          .single()

        if (data?.content) {
          setJournalEntry(data.content)
        }
      }
    } catch (error) {
      console.error('Error loading journal entry:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to convert YHWH date to Gregorian
  function getGregorianDateForYhwh(yhwhYear: number, yhwhMonth: number, yhwhDay: number): Date {
    const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31]
    const EPOCH_DATE = new Date(2025, 2, 20) // March 20, 2025

    let daysFromEpoch = (yhwhYear - 6028) * 364

    for (let i = 0; i < yhwhMonth - 1; i++) {
      daysFromEpoch += monthDays[i]
    }

    daysFromEpoch += yhwhDay - 1

    const gregorianDate = new Date(EPOCH_DATE)
    gregorianDate.setDate(gregorianDate.getDate() + daysFromEpoch)
    return gregorianDate
  }

  if (!isOpen) return null

  const isShabbat = yhwhDate?.weekDay === 7
  const feastDayName = getFeastDayName(month, day)

  const hasNotes = journalEntry?.richText || journalEntry?.dreamEntry
  const hasMedia = journalEntry?.photos?.length > 0 || journalEntry?.voiceNotes?.length > 0 || journalEntry?.videos?.length > 0
  const hasPrayer = journalEntry?.prayerRequests?.length > 0 || journalEntry?.answeredPrayers?.length > 0
  const hasLife = journalEntry?.isSpecialDay || journalEntry?.fastingType || journalEntry?.tithesOfferings?.length > 0 || journalEntry?.familyTags?.length > 0 || journalEntry?.mood || journalEntry?.gratitude
  const hasSpiritual = journalEntry?.propheticWords?.length > 0 || journalEntry?.aiPrompt

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-gradient-to-br from-purple-950 via-indigo-900 to-teal-900 rounded-3xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-purple-500/30 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">
                {year} / {String(month).padStart(2, '0')} / {String(day).padStart(2, '0')}
              </h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {isShabbat && (
                  <Badge className="bg-yellow-500 text-black font-bold">
                    <Star className="w-3 h-3 mr-1" />
                    Shabbat
                  </Badge>
                )}
                {feastDayName && (
                  <Badge className="bg-blue-500 text-white font-bold">
                    <Calendar className="w-3 h-3 mr-1" />
                    {feastDayName}
                  </Badge>
                )}
                {yhwhDate && (
                  <Badge variant="outline" className="text-gray-300">
                    Day {yhwhDate.weekDay === 7 ? 'Shabbat' : yhwhDate.weekDay} of Week
                  </Badge>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-400 transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center text-gray-300 py-8">Loading...</div>
          ) : journalEntry ? (
            <>
              {/* Journal Entries Summary */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-4">Journal Entries</h3>

                {hasNotes && (
                  <div className="bg-black/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <span className="font-semibold text-white">Notes</span>
                    </div>
                    {journalEntry.richText && (
                      <p className="text-gray-300 text-sm mt-2 line-clamp-3">
                        {journalEntry.richText.replace(/<[^>]*>/g, '').substring(0, 200)}...
                      </p>
                    )}
                    {journalEntry.dreamEntry && (
                      <p className="text-gray-300 text-sm mt-2 line-clamp-3">
                        <span className="font-semibold">Dream:</span> {journalEntry.dreamEntry.substring(0, 200)}...
                      </p>
                    )}
                  </div>
                )}

                {hasMedia && (
                  <div className="bg-black/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Image className="w-5 h-5 text-purple-400" />
                      <span className="font-semibold text-white">Media</span>
                    </div>
                    <div className="text-gray-300 text-sm mt-2">
                      {journalEntry.photos?.length > 0 && (
                        <p>{journalEntry.photos.length} photo(s)</p>
                      )}
                      {journalEntry.voiceNotes?.length > 0 && (
                        <p>{journalEntry.voiceNotes.length} voice note(s)</p>
                      )}
                      {journalEntry.videos?.length > 0 && (
                        <p>{journalEntry.videos.length} video(s)</p>
                      )}
                    </div>
                  </div>
                )}

                {hasPrayer && (
                  <div className="bg-black/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-5 h-5 text-pink-400" />
                      <span className="font-semibold text-white">Prayer</span>
                    </div>
                    <div className="text-gray-300 text-sm mt-2">
                      {journalEntry.prayerRequests?.length > 0 && (
                        <p>{journalEntry.prayerRequests.length} prayer request(s)</p>
                      )}
                      {journalEntry.answeredPrayers?.length > 0 && (
                        <p>{journalEntry.answeredPrayers.length} answered prayer(s)</p>
                      )}
                    </div>
                  </div>
                )}

                {hasLife && (
                  <div className="bg-black/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-green-400" />
                      <span className="font-semibold text-white">Life</span>
                    </div>
                    <div className="text-gray-300 text-sm mt-2">
                      {journalEntry.isSpecialDay && (
                        <p>Special Day: {journalEntry.specialDayType} - {journalEntry.specialDayPerson}</p>
                      )}
                      {journalEntry.fastingType && journalEntry.fastingType !== 'none' && (
                        <p>Fasting: {journalEntry.fastingType}</p>
                      )}
                      {journalEntry.tithesOfferings?.length > 0 && (
                        <p>{journalEntry.tithesOfferings.length} tithe/offering(s)</p>
                      )}
                      {journalEntry.familyTags?.length > 0 && (
                        <p>Family tags: {journalEntry.familyTags.join(', ')}</p>
                      )}
                      {journalEntry.mood && (
                        <p>Mood: {journalEntry.mood}</p>
                      )}
                    </div>
                  </div>
                )}

                {hasSpiritual && (
                  <div className="bg-black/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      <span className="font-semibold text-white">Spiritual</span>
                    </div>
                    <div className="text-gray-300 text-sm mt-2">
                      {journalEntry.propheticWords?.length > 0 && (
                        <p>{journalEntry.propheticWords.length} prophetic word(s)</p>
                      )}
                      {journalEntry.aiPrompt && (
                        <p>AI Prompt available</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-300 py-8">
              <p className="text-lg mb-2">No journal entries for this day</p>
              <p className="text-sm">Click on this date in the calendar to add entries</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

