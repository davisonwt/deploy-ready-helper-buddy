import React, { useState, useEffect } from 'react'
import { Moon } from 'lucide-react'
import { Button } from '../../ui/button'
import { Textarea } from '../../ui/textarea'
import { Badge } from '../../ui/badge'
import { calculateCreatorDate } from '@/utils/dashboardCalendar'
import { getCreatorTime } from '@/utils/customTime'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface NotesFormProps {
  selectedDate: Date
  yhwhDate: ReturnType<typeof calculateCreatorDate>
  onClose: () => void
  onSave?: () => void
}

export function NotesForm({ selectedDate, yhwhDate, onClose, onSave }: NotesFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [richText, setRichText] = useState('')
  const [dreamEntry, setDreamEntry] = useState('')
  const [isNightMode, setIsNightMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // Check if it's night time for dream journal
  useEffect(() => {
    const hour = new Date().getHours()
    setIsNightMode(hour >= 20 || hour < 6)
  }, [])

  // Load existing entry
  useEffect(() => {
    loadEntry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, yhwhDate.month, yhwhDate.day, yhwhDate.year, user])

  const loadEntry = async () => {
    if (!user) return
    
    try {
      const { data } = await supabase
        .from('journal_entries')
        .select('content')
        .eq('user_id', user.id)
        .eq('yhwh_year', yhwhDate.year)
        .eq('yhwh_month', yhwhDate.month)
        .eq('yhwh_day', yhwhDate.day)
        .maybeSingle()
      
      if (data?.content) {
        setRichText(data.content)
      }
    } catch (error) {
      console.error('Error loading entry:', error)
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
    
    const time = getCreatorTime(selectedDate, 0, 0)
    
    try {
      const gregorianDateStr = selectedDate.toISOString().split('T')[0]
      
      const { data: existingEntry } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('yhwh_year', yhwhDate.year)
        .eq('yhwh_month', yhwhDate.month)
        .eq('yhwh_day', yhwhDate.day)
        .maybeSingle()
      
      const entryPayload = {
        user_id: user.id,
        yhwh_year: yhwhDate.year,
        yhwh_month: yhwhDate.month,
        yhwh_day: yhwhDate.day,
        yhwh_weekday: yhwhDate.weekDay,
        yhwh_day_of_year: yhwhDate.dayOfYear || 1,
        gregorian_date: gregorianDateStr,
        content: richText || '',
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
      
      toast({
        title: 'Saved!',
        description: 'Your notes have been saved',
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
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-950 via-indigo-900 to-purple-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Add Notes</h2>
        </div>
        <p className="text-sm text-gray-300">
          Month {yhwhDate.month}, Day {yhwhDate.day} · {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Rich Text Notes */}
        <div>
          <label className="text-sm font-medium mb-2 block">Rich Text Notes (Markdown supported)</label>
          <Textarea
            value={richText}
            onChange={(e) => setRichText(e.target.value)}
            placeholder="Write your thoughts... Use **bold**, *italic*, - lists, > quotes"
            rows={12}
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          />
          <div className="mt-2 text-xs text-gray-400">
            Supports markdown: **bold**, *italic*, - lists, &gt; quotes
          </div>
        </div>

        {/* Dream Journal */}
        <div className={`p-4 rounded-lg ${isNightMode ? 'bg-purple-900/50 border-2 border-purple-500' : 'bg-white/10'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Moon className="h-5 w-5" />
            <label className="font-medium">Dream Journal</label>
            {isNightMode && <Badge className="bg-purple-500">Night Mode</Badge>}
          </div>
          <Textarea
            value={dreamEntry}
            onChange={(e) => setDreamEntry(e.target.value)}
            placeholder="Record your dreams..."
            rows={6}
            className={`${isNightMode ? 'bg-purple-950 border-purple-700' : 'bg-white/10 border-white/20'} text-white placeholder:text-gray-400`}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-6 border-t border-white/10 flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-500"
        >
          {saving ? 'Saving...' : 'Save Notes'}
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
