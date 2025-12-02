import React, { useState, useEffect } from 'react'
import { Heart, X } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { calculateCreatorDate } from '@/utils/dashboardCalendar'
import { getCreatorTime } from '@/utils/customTime'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { useAuth } from '@/hooks/useAuth'
import { isFirebaseConfigured } from '@/integrations/firebase/config'
import { saveJournalEntry } from '@/integrations/firebase/firestore'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface PrayerFormProps {
  selectedDate: Date
  yhwhDate: ReturnType<typeof calculateCreatorDate>
  onClose: () => void
  onSave?: () => void
}

export function PrayerForm({ selectedDate, yhwhDate, onClose, onSave }: PrayerFormProps) {
  const { user: firebaseUser } = useFirebaseAuth()
  const { user: supabaseUser } = useAuth()
  const { toast } = useToast()
  const user = firebaseUser || supabaseUser

  const [prayerRequests, setPrayerRequests] = useState<string[]>([])
  const [answeredPrayers, setAnsweredPrayers] = useState<string[]>([])
  const [newPrayerRequest, setNewPrayerRequest] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadEntry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, yhwhDate.month, yhwhDate.day, yhwhDate.year, user])

  const loadEntry = async () => {
    if (!user) return
    
    const yhwhDateStr = `Month${yhwhDate.month}Day${yhwhDate.day}`
    
    if (isFirebaseConfigured && firebaseUser) {
      try {
        const { getJournalEntry } = await import('@/integrations/firebase/firestore')
        const result = await getJournalEntry(firebaseUser.uid, yhwhDateStr)
        if (result.success && result.data) {
          const entry = result.data
          setPrayerRequests(entry.prayerRequests || [])
          setAnsweredPrayers(entry.answeredPrayers || [])
        }
      } catch (error) {
        console.error('Error loading entry:', error)
      }
    }
    
    if (supabaseUser) {
      try {
        const { data } = await supabase
          .from('journal_entries')
          .select('prayer_requests, answered_prayers')
          .eq('user_id', supabaseUser.id)
          .eq('yhwh_year', yhwhDate.year)
          .eq('yhwh_month', yhwhDate.month)
          .eq('yhwh_day', yhwhDate.day)
          .single()
        
        if (data) {
          setPrayerRequests(Array.isArray(data.prayer_requests) ? data.prayer_requests as string[] : [])
          setAnsweredPrayers(Array.isArray(data.answered_prayers) ? data.answered_prayers as string[] : [])
        }
      } catch (error) {
        // Entry doesn't exist yet
      }
    }
  }

  const addPrayerRequest = () => {
    if (newPrayerRequest.trim()) {
      setPrayerRequests([...prayerRequests, newPrayerRequest.trim()])
      setNewPrayerRequest('')
      handleSave()
    }
  }

  const markPrayerAnswered = (index: number) => {
    const prayer = prayerRequests[index]
    setPrayerRequests(prayerRequests.filter((_, i) => i !== index))
    setAnsweredPrayers([...answeredPrayers, prayer])
    handleSave()
  }

  const handleSave = async () => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to save entries',
      })
      return
    }

    setSaving(true)
    
    const yhwhDateStr = `Month${yhwhDate.month}Day${yhwhDate.day}`
    const time = getCreatorTime(selectedDate, 0, 0)
    
    const entryData = {
      yhwhYear: yhwhDate.year,
      yhwhMonth: yhwhDate.month,
      yhwhDay: yhwhDate.day,
      yhwhWeekday: yhwhDate.weekDay,
      yhwhDayOfYear: yhwhDate.dayOfYear,
      gregorianDate: selectedDate.toISOString().split('T')[0],
      prayerRequests,
      answeredPrayers,
      partOfYowm: time.part,
      watch: Math.floor(time.part / 4.5) + 1,
      isShabbat: yhwhDate.weekDay === 7,
      isTequvah: false,
    }
    
    try {
      if (isFirebaseConfigured && firebaseUser) {
        await saveJournalEntry(firebaseUser.uid, yhwhDateStr, entryData)
      }
      
      if (supabaseUser) {
        const gregorianDateStr = selectedDate.toISOString().split('T')[0]
        
        const { data: existingEntry } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('user_id', supabaseUser.id)
          .eq('yhwh_year', yhwhDate.year)
          .eq('yhwh_month', yhwhDate.month)
          .eq('yhwh_day', yhwhDate.day)
          .maybeSingle()
        
        const entryPayload: any = {
          user_id: supabaseUser.id,
          yhwh_year: yhwhDate.year,
          yhwh_month: yhwhDate.month,
          yhwh_day: yhwhDate.day,
          yhwh_weekday: yhwhDate.weekDay,
          yhwh_day_of_year: yhwhDate.dayOfYear || 1,
          gregorian_date: gregorianDateStr,
          prayer_requests: prayerRequests || [],
          answered_prayers: answeredPrayers || [],
          part_of_yowm: time.part || null,
          watch: Math.floor((time.part || 0) / 4.5) + 1 || null,
          is_shabbat: yhwhDate.weekDay === 7,
          is_tequvah: false,
        }
        
        if (existingEntry) {
          await supabase
            .from('journal_entries')
            .update(entryPayload)
            .eq('id', existingEntry.id)
        } else {
          await supabase
            .from('journal_entries')
            .insert(entryPayload)
        }
        
        window.dispatchEvent(new CustomEvent('journalEntriesUpdated'))
      }
      
      toast({
        title: 'Saved!',
        description: 'Your prayers have been saved',
      })
      
      onSave?.()
    } catch (error) {
      console.error('Error saving:', error)
      toast({
        title: 'Error',
        description: 'Failed to save entry',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-pink-950 via-rose-900 to-purple-900 text-white overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="h-6 w-6" />
            Add Prayer
          </h2>
          <button onClick={onClose} className="text-2xl hover:scale-125 transition">
            <X className="w-6 h-6" />
          </button>
        </div>
        <p className="text-sm text-gray-300">
          Month {yhwhDate.month}, Day {yhwhDate.day} · {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Prayer Requests</label>
          <div className="flex gap-2">
            <Input
              value={newPrayerRequest}
              onChange={(e) => setNewPrayerRequest(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPrayerRequest()}
              placeholder="Add prayer request..."
              className="bg-white/10 border-white/20 text-white"
            />
            <Button onClick={addPrayerRequest}>Add</Button>
          </div>
          {prayerRequests.length > 0 && (
            <div className="space-y-2 mt-4">
              {prayerRequests.map((prayer, idx) => (
                <div key={idx} className="bg-white/10 p-3 rounded-lg flex justify-between items-start">
                  <p className="flex-1">{prayer}</p>
                  <Button
                    onClick={() => markPrayerAnswered(idx)}
                    size="sm"
                    variant="outline"
                    className="ml-2"
                  >
                    Mark Answered
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Answered Prayers</label>
          {answeredPrayers.length > 0 ? (
            <div className="space-y-2">
              {answeredPrayers.map((prayer, idx) => (
                <div key={idx} className="bg-green-900/50 p-3 rounded-lg border border-green-500">
                  <p className="text-green-200">{prayer}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No answered prayers yet</p>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 p-6 border-t border-white/10 flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-pink-600 hover:bg-pink-500"
        >
          {saving ? 'Saving...' : 'Save Prayers'}
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          Close
        </Button>
      </div>
    </div>
  )
}
