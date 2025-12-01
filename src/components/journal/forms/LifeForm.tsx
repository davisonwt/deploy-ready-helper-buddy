import React, { useState, useEffect } from 'react'
import { Users, X, Droplet, Gift, Smile } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { Badge } from '../../ui/badge'
import { calculateCreatorDate } from '@/utils/dashboardCalendar'
import { getCreatorTime } from '@/utils/customTime'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { useAuth } from '@/hooks/useAuth'
import { isFirebaseConfigured } from '@/integrations/firebase/config'
import { saveJournalEntry } from '@/integrations/firebase/firestore'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface LifeFormProps {
  selectedDate: Date
  yhwhDate: ReturnType<typeof calculateCreatorDate>
  onClose: () => void
  onSave?: () => void
}

export function LifeForm({ selectedDate, yhwhDate, onClose, onSave }: LifeFormProps) {
  const { user: firebaseUser } = useFirebaseAuth()
  const { user: supabaseUser } = useAuth()
  const { toast } = useToast()
  const user = firebaseUser || supabaseUser

  const [isSpecialDay, setIsSpecialDay] = useState(false)
  const [specialDayType, setSpecialDayType] = useState<'birthday' | 'anniversary' | null>(null)
  const [specialDayPerson, setSpecialDayPerson] = useState('')
  const [fastingType, setFastingType] = useState<'none' | 'water' | 'daniel' | 'full'>('none')
  const [waterIntake, setWaterIntake] = useState(0)
  const [tithesOfferings, setTithesOfferings] = useState<Array<{ amount: number; category: string; date: string }>>([])
  const [newOfferingAmount, setNewOfferingAmount] = useState('')
  const [newOfferingCategory, setNewOfferingCategory] = useState('firstfruits')
  const [familyTags, setFamilyTags] = useState<string[]>([])
  const [newFamilyTag, setNewFamilyTag] = useState('')
  const [mood, setMood] = useState<'joyful' | 'peaceful' | 'grateful' | 'hopeful' | 'blessed' | null>(null)
  const [gratitude, setGratitude] = useState('')
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
          setIsSpecialDay(entry.isSpecialDay || false)
          setSpecialDayType(entry.specialDayType || null)
          setSpecialDayPerson(entry.specialDayPerson || '')
          setFastingType(entry.fastingType || 'none')
          setWaterIntake(entry.waterIntake || 0)
          setTithesOfferings(entry.tithesOfferings || [])
          setFamilyTags(entry.familyTags || [])
          setMood(entry.mood || null)
          setGratitude(entry.gratitude || '')
        }
      } catch (error) {
        console.error('Error loading entry:', error)
      }
    }
    
    if (supabaseUser) {
      try {
        const { data } = await supabase
          .from('journal_entries')
          .select('mood, tags, gratitude')
          .eq('user_id', supabaseUser.id)
          .eq('yhwh_year', yhwhDate.year)
          .eq('yhwh_month', yhwhDate.month)
          .eq('yhwh_day', yhwhDate.day)
          .maybeSingle()
        
        if (data) {
          setMood(data.mood || null)
          setFamilyTags(data.tags || [])
          setGratitude(data.gratitude || '')
        }
      } catch (error) {
        // Entry doesn't exist yet
      }
    }
  }

  const addOffering = () => {
    if (newOfferingAmount && parseFloat(newOfferingAmount) > 0) {
      setTithesOfferings([...tithesOfferings, {
        amount: parseFloat(newOfferingAmount),
        category: newOfferingCategory,
        date: selectedDate.toISOString().split('T')[0]
      }])
      setNewOfferingAmount('')
      handleSave()
    }
  }

  const addFamilyTag = () => {
    if (newFamilyTag.trim()) {
      setFamilyTags([...familyTags, newFamilyTag.trim()])
      setNewFamilyTag('')
      handleSave()
    }
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
      isSpecialDay,
      specialDayType,
      specialDayPerson,
      fastingType,
      waterIntake,
      tithesOfferings,
      familyTags,
      mood,
      gratitude,
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
          mood: mood || null,
          tags: familyTags || [],
          gratitude: gratitude || null,
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
        description: 'Your life entry has been saved',
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
    <div className="h-full flex flex-col bg-gradient-to-br from-green-950 via-emerald-900 to-teal-900 text-white overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Add Life Entry
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
        {/* Birthdays & Anniversaries */}
        <div className="bg-white/10 p-4 rounded-lg">
          <label className="text-sm font-medium mb-2 block">Birthdays & Anniversaries</label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={isSpecialDay}
              onChange={(e) => setIsSpecialDay(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Mark as special day (glows gold every year)</span>
          </div>
          {isSpecialDay && (
            <div className="space-y-2 mt-2">
              <select
                value={specialDayType || ''}
                onChange={(e) => setSpecialDayType(e.target.value as 'birthday' | 'anniversary' || null)}
                className="bg-white/10 border-white/20 text-white rounded p-2 w-full"
              >
                <option value="">Select type</option>
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
              </select>
              <Input
                value={specialDayPerson}
                onChange={(e) => setSpecialDayPerson(e.target.value)}
                placeholder="Person's name"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          )}
        </div>

        {/* Health / Fasting Tracker */}
        <div className="bg-white/10 p-4 rounded-lg">
          <label className="text-sm font-medium mb-2 block">Health / Fasting Tracker</label>
          <div className="space-y-2">
            <select
              value={fastingType}
              onChange={(e) => setFastingType(e.target.value as 'none' | 'water' | 'daniel' | 'full')}
              className="bg-white/10 border-white/20 text-white rounded p-2 w-full"
            >
              <option value="none">No fasting</option>
              <option value="water">Water only</option>
              <option value="daniel">Daniel fast</option>
              <option value="full">Full fast</option>
            </select>
            <div className="flex items-center gap-2">
              <Droplet className="h-4 w-4" />
              <Input
                type="number"
                value={waterIntake}
                onChange={(e) => setWaterIntake(parseInt(e.target.value) || 0)}
                placeholder="Water intake (glasses)"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
        </div>

        {/* Tithes & Offerings */}
        <div className="bg-white/10 p-4 rounded-lg">
          <label className="text-sm font-medium mb-2 block">Tithes & Offerings</label>
          <div className="flex gap-2 mb-2">
            <Input
              type="number"
              value={newOfferingAmount}
              onChange={(e) => setNewOfferingAmount(e.target.value)}
              placeholder="Amount"
              className="bg-white/10 border-white/20 text-white"
            />
            <select
              value={newOfferingCategory}
              onChange={(e) => setNewOfferingCategory(e.target.value)}
              className="bg-white/10 border-white/20 text-white rounded p-2"
            >
              <option value="firstfruits">Firstfruits</option>
              <option value="terumah">Terumah</option>
              <option value="tithe">Tithe</option>
              <option value="offering">Offering</option>
            </select>
            <Button onClick={addOffering}>Add</Button>
          </div>
          {tithesOfferings.length > 0 && (
            <div className="space-y-1">
              {tithesOfferings.map((offering, idx) => (
                <div key={idx} className="text-sm">
                  {offering.category}: ${offering.amount.toFixed(2)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Family Memory Tags */}
        <div className="bg-white/10 p-4 rounded-lg">
          <label className="text-sm font-medium mb-2 block">Family Memory Tags</label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newFamilyTag}
              onChange={(e) => setNewFamilyTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addFamilyTag()}
              placeholder="Tag family member..."
              className="bg-white/10 border-white/20 text-white"
            />
            <Button onClick={addFamilyTag}>Add</Button>
          </div>
          {familyTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {familyTags.map((tag, idx) => (
                <Badge key={idx} className="bg-blue-500">{tag}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Mood & Gratitude */}
        <div className="bg-white/10 p-4 rounded-lg">
          <label className="text-sm font-medium mb-2 block">Mood & Gratitude</label>
          <div className="flex gap-2 mb-2">
            {['joyful', 'peaceful', 'grateful', 'hopeful', 'blessed'].map((m) => (
              <button
                key={m}
                onClick={() => setMood(m as any)}
                className={`p-2 rounded ${mood === m ? 'bg-yellow-500' : 'bg-white/10'}`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <Textarea
            value={gratitude}
            onChange={(e) => setGratitude(e.target.value)}
            placeholder="What are you grateful for today?"
            rows={3}
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex-shrink-0 p-6 border-t border-white/10 flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-green-600 hover:bg-green-500"
        >
          {saving ? 'Saving...' : 'Save Life Entry'}
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
