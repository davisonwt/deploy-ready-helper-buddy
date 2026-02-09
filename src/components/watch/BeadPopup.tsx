import React, { useState, useEffect } from 'react'
import { X, FileText, Image, Heart, Users, Sparkles, Calendar, Star, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { calculateCreatorDate } from '@/utils/dashboardCalendar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { useToast } from '@/hooks/use-toast'

interface BeadPopupProps {
  isOpen: boolean
  onClose: () => void
  year: number
  month: number
  day: number
}

// Function to get feast day name based on month and day
function getFeastDayName(month: number, day: number): string | null {
  if (month === 1) {
    if (day === 10) return 'Pick Lamb'
    if (day === 14) return 'Slaughter Lamb (Evening)'
    if (day >= 15 && day <= 21) return 'Feast of Unleavened Bread'
  }
  if (month === 2) {
    if (day === 10) return 'Pick Lamb (for those who missed Month 1)'
    if (day === 14) return 'Pesach'
    if (day >= 15 && day <= 21) return 'Unleavened Bread'
  }
  if (month === 3) {
    if (day === 15) return 'Shavuot'
    if (day === 31) return 'Intercalary Day'
  }
  if (month === 5) {
    if (day === 3) return 'Feast of New Wine'
  }
  if (month === 6) {
    if (day === 22) return 'Feast of New Oil'
    if (day >= 23 && day <= 27) return 'Wood Gathering Days'
    if (day === 31) return 'Intercalary Day'
  }
  if (month === 7) {
    if (day === 1) return 'Yowm Teruah'
    if (day >= 9 && day <= 10) return 'Yowm Kippur'
    if (day >= 15 && day <= 22) return 'Sukkot'
  }
  if (month !== 1 && month !== 2 && month !== 3 && month !== 5 && month !== 6 && month !== 7) {
    if (day === 1 || day === 15) return 'Feast Day'
  }
  return null
}

export function BeadPopup({ isOpen, onClose, year, month, day }: BeadPopupProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [journalEntry, setJournalEntry] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [yhwhDate, setYhwhDate] = useState<ReturnType<typeof calculateCreatorDate> | null>(null)

  useEffect(() => {
    if (isOpen && year && month && day) {
      const gregorianDate = getGregorianDateForYhwh(year, month, day)
      const creatorDate = calculateCreatorDate(gregorianDate)
      setYhwhDate(creatorDate)
    }
  }, [isOpen, year, month, day])

  useEffect(() => {
    if (isOpen && user && yhwhDate) {
      loadJournalEntry()
    }
  }, [isOpen, user, yhwhDate])

  const loadJournalEntry = async () => {
    if (!user || !yhwhDate) return

    setLoading(true)
    try {
      const { data } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('yhwh_year', yhwhDate.year)
        .eq('yhwh_month', yhwhDate.month)
        .eq('yhwh_day', yhwhDate.day)
        .single()

      if (data) {
        setJournalEntry(data)
      }
    } catch (error) {
      console.error('Error loading journal entry:', error)
    } finally {
      setLoading(false)
    }
  }

  function getGregorianDateForYhwh(yhwhYear: number, yhwhMonth: number, yhwhDay: number): Date {
    const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31]
    const EPOCH_DATE = new Date(2025, 2, 20)

    let daysFromEpoch = (yhwhYear - 6028) * 364

    for (let i = 0; i < yhwhMonth - 1; i++) {
      daysFromEpoch += monthDays[i]
    }

    daysFromEpoch += yhwhDay - 1

    const gregorianDate = new Date(EPOCH_DATE)
    gregorianDate.setDate(gregorianDate.getDate() + daysFromEpoch)
    return gregorianDate
  }

  const handleDelete = async (type: string) => {
    if (!user || !journalEntry?.id) return
    
    if (!confirm(`Are you sure you want to delete this ${type} entry?`)) return

    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({ content: null })
        .eq('id', journalEntry.id)

      if (error) throw error

      toast({ title: `${type} deleted` })
      loadJournalEntry()
    } catch (error) {
      console.error('Error deleting:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete entry',
        variant: 'destructive'
      })
    }
  }

  if (!isOpen) return null

  const isShabbat = yhwhDate?.weekDay === 7
  const feastDayName = getFeastDayName(month, day)

  const hasNotes = journalEntry?.content || journalEntry?.richText || journalEntry?.dreamEntry
  const hasMedia = journalEntry?.images?.length > 0 || journalEntry?.photos?.length > 0 || journalEntry?.voiceNotes?.length > 0 || journalEntry?.videos?.length > 0
  const hasPrayer = journalEntry?.prayer_requests?.length > 0 || journalEntry?.prayerRequests?.length > 0 || journalEntry?.answered_prayers?.length > 0 || journalEntry?.answeredPrayers?.length > 0
  const hasLife = journalEntry?.mood || journalEntry?.gratitude || journalEntry?.isSpecialDay
  const hasSpiritual = journalEntry?.propheticWords?.length > 0 || journalEntry?.aiPrompt

  const hasAnyContent = hasNotes || hasMedia || hasPrayer || hasLife || hasSpiritual

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Cloud-shaped Popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative max-w-lg w-full mx-4"
      >
        {/* Main cloud body */}
        <div 
          className="relative bg-gradient-to-br from-white/95 via-sky-50/95 to-blue-100/95 backdrop-blur-xl rounded-[40px] shadow-2xl overflow-hidden"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(135, 206, 250, 0.3), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          {/* Decorative cloud bumps at top */}
          <div className="absolute -top-4 left-1/4 w-16 h-16 bg-gradient-to-br from-white to-sky-100 rounded-full opacity-80" />
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-gradient-to-br from-white to-sky-100 rounded-full opacity-90" />
          <div className="absolute -top-4 right-1/4 w-14 h-14 bg-gradient-to-br from-white to-sky-100 rounded-full opacity-80" />
          
          {/* Content */}
          <div className="relative z-10 pt-8">
            {/* Header */}
            <div className="px-6 pb-4 border-b border-sky-200/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">
                    {year} / {String(month).padStart(2, '0')} / {String(day).padStart(2, '0')}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {isShabbat && (
                      <Badge className="bg-amber-400 text-amber-900 font-bold shadow-sm">
                        <Star className="w-3 h-3 mr-1" />
                        Shabbat
                      </Badge>
                    )}
                    {feastDayName && (
                      <Badge className="bg-blue-500 text-white font-bold shadow-sm">
                        <Calendar className="w-3 h-3 mr-1" />
                        {feastDayName}
                      </Badge>
                    )}
                    {yhwhDate && (
                      <Badge variant="outline" className="text-slate-600 border-slate-300">
                        Day {yhwhDate.weekDay === 7 ? 'Shabbat' : yhwhDate.weekDay} of Week
                      </Badge>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <ScrollArea className="max-h-[60vh]">
              <div className="p-6 space-y-4">
                {loading ? (
                  <div className="text-center text-slate-500 py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
                    Loading...
                  </div>
                ) : hasAnyContent ? (
                  <>
                    {hasNotes && (
                      <div className="bg-blue-50/80 rounded-2xl p-4 border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                            <span className="font-semibold text-slate-700">Notes</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete('notes')}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-slate-600 text-sm line-clamp-3">
                          {(journalEntry.content || journalEntry.richText || '').replace(/<[^>]*>/g, '').substring(0, 200)}
                          {(journalEntry.content || journalEntry.richText || '').length > 200 ? '...' : ''}
                        </p>
                      </div>
                    )}

                    {hasMedia && (
                      <div className="bg-purple-50/80 rounded-2xl p-4 border border-purple-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Image className="w-5 h-5 text-purple-500" />
                            <span className="font-semibold text-slate-700">Media</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete('media')}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-slate-600 text-sm space-y-1">
                          {(journalEntry.images?.length > 0 || journalEntry.photos?.length > 0) && (
                            <p>📷 {journalEntry.images?.length || journalEntry.photos?.length} photo(s)</p>
                          )}
                          {journalEntry.voiceNotes?.length > 0 && (
                            <p>🎤 {journalEntry.voiceNotes.length} voice note(s)</p>
                          )}
                          {journalEntry.videos?.length > 0 && (
                            <p>🎬 {journalEntry.videos.length} video(s)</p>
                          )}
                        </div>
                      </div>
                    )}

                    {hasPrayer && (
                      <div className="bg-pink-50/80 rounded-2xl p-4 border border-pink-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Heart className="w-5 h-5 text-pink-500" />
                            <span className="font-semibold text-slate-700">Prayer</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete('prayer')}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-slate-600 text-sm space-y-1">
                          {(journalEntry.prayer_requests?.length > 0 || journalEntry.prayerRequests?.length > 0) && (
                            <p>🙏 {journalEntry.prayer_requests?.length || journalEntry.prayerRequests?.length} prayer request(s)</p>
                          )}
                          {(journalEntry.answered_prayers?.length > 0 || journalEntry.answeredPrayers?.length > 0) && (
                            <p>✨ {journalEntry.answered_prayers?.length || journalEntry.answeredPrayers?.length} answered prayer(s)</p>
                          )}
                        </div>
                      </div>
                    )}

                    {hasLife && (
                      <div className="bg-green-50/80 rounded-2xl p-4 border border-green-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-green-500" />
                            <span className="font-semibold text-slate-700">Life</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete('life')}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-slate-600 text-sm space-y-1">
                          {journalEntry.mood && <p>😊 Mood: {journalEntry.mood}</p>}
                          {journalEntry.gratitude && <p>🙌 Gratitude recorded</p>}
                        </div>
                      </div>
                    )}

                    {hasSpiritual && (
                      <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            <span className="font-semibold text-slate-700">Spiritual</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete('spiritual')}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-slate-600 text-sm space-y-1">
                          {journalEntry.propheticWords?.length > 0 && (
                            <p>✝️ {journalEntry.propheticWords.length} prophetic word(s)</p>
                          )}
                          {journalEntry.aiPrompt && <p>🤖 AI insight available</p>}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-slate-500 py-8">
                    <div className="text-4xl mb-3">☁️</div>
                    <p className="text-lg font-medium mb-1">No entries for this day</p>
                    <p className="text-sm">Click on this date in the calendar to add entries</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
