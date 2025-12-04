import React from 'react'
import { X, FileText, Image, Heart, Users, Sparkles, Calendar, Star, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'

interface CloudPopupProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  isShabbat?: boolean
  feastDayName?: string | null
  weekDay?: number
  journalEntry?: any
  loading?: boolean
  onDelete?: (type: string, id?: string) => void
}

export function CloudPopup({ 
  isOpen, 
  onClose, 
  title, 
  subtitle,
  isShabbat,
  feastDayName,
  weekDay,
  journalEntry,
  loading,
  onDelete
}: CloudPopupProps) {
  if (!isOpen) return null

  const hasNotes = journalEntry?.richText || journalEntry?.dreamEntry || journalEntry?.content
  const hasMedia = journalEntry?.photos?.length > 0 || journalEntry?.voiceNotes?.length > 0 || journalEntry?.videos?.length > 0 || journalEntry?.images?.length > 0
  const hasPrayer = journalEntry?.prayerRequests?.length > 0 || journalEntry?.answeredPrayers?.length > 0 || journalEntry?.prayer_requests?.length > 0
  const hasLife = journalEntry?.isSpecialDay || journalEntry?.fastingType || journalEntry?.tithesOfferings?.length > 0 || journalEntry?.familyTags?.length > 0 || journalEntry?.mood || journalEntry?.gratitude
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
        {/* Cloud shape with multiple layers */}
        <div className="relative">
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
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="text-sm text-slate-500">{subtitle}</p>
                    )}
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
                      {weekDay && (
                        <Badge variant="outline" className="text-slate-600 border-slate-300">
                          Day {weekDay === 7 ? 'Shabbat' : weekDay} of Week
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
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete('notes')}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-slate-600 text-sm line-clamp-3">
                            {(journalEntry.richText || journalEntry.content || '').replace(/<[^>]*>/g, '').substring(0, 200)}
                            {(journalEntry.richText || journalEntry.content || '').length > 200 ? '...' : ''}
                          </p>
                          {journalEntry.dreamEntry && (
                            <p className="text-slate-600 text-sm mt-2 italic">
                              <span className="font-medium">Dream:</span> {journalEntry.dreamEntry.substring(0, 100)}...
                            </p>
                          )}
                        </div>
                      )}

                      {hasMedia && (
                        <div className="bg-purple-50/80 rounded-2xl p-4 border border-purple-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Image className="w-5 h-5 text-purple-500" />
                              <span className="font-semibold text-slate-700">Media</span>
                            </div>
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete('media')}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="text-slate-600 text-sm space-y-1">
                            {(journalEntry.photos?.length > 0 || journalEntry.images?.length > 0) && (
                              <p>📷 {journalEntry.photos?.length || journalEntry.images?.length} photo(s)</p>
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
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete('prayer')}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="text-slate-600 text-sm space-y-1">
                            {(journalEntry.prayerRequests?.length > 0 || journalEntry.prayer_requests?.length > 0) && (
                              <p>🙏 {journalEntry.prayerRequests?.length || journalEntry.prayer_requests?.length} prayer request(s)</p>
                            )}
                            {journalEntry.answeredPrayers?.length > 0 && (
                              <p>✨ {journalEntry.answeredPrayers.length} answered prayer(s)</p>
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
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete('life')}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="text-slate-600 text-sm space-y-1">
                            {journalEntry.mood && <p>😊 Mood: {journalEntry.mood}</p>}
                            {journalEntry.gratitude && <p>🙌 Gratitude recorded</p>}
                            {journalEntry.isSpecialDay && (
                              <p>🎉 {journalEntry.specialDayType}: {journalEntry.specialDayPerson}</p>
                            )}
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
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete('spiritual')}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
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
        </div>
      </motion.div>
    </div>
  )
}
