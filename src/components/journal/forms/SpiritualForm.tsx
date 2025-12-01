import React, { useState, useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'
import { Button } from '../../ui/button'
import { Textarea } from '../../ui/textarea'
import { calculateCreatorDate } from '@/utils/dashboardCalendar'
import { getCreatorTime } from '@/utils/customTime'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { useAuth } from '@/hooks/useAuth'
import { isFirebaseConfigured } from '@/integrations/firebase/config'
import { saveJournalEntry } from '@/integrations/firebase/firestore'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface SpiritualFormProps {
  selectedDate: Date
  yhwhDate: ReturnType<typeof calculateCreatorDate>
  onClose: () => void
  onSave?: () => void
}

export function SpiritualForm({ selectedDate, yhwhDate, onClose, onSave }: SpiritualFormProps) {
  const { user: firebaseUser } = useFirebaseAuth()
  const { user: supabaseUser } = useAuth()
  const { toast } = useToast()
  const user = firebaseUser || supabaseUser

  const [propheticWords, setPropheticWords] = useState<string[]>([])
  const [newPropheticWord, setNewPropheticWord] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadEntry()
  }, [selectedDate, yhwhDate])

  const loadEntry = async () => {
    if (!user) return
    
    const yhwhDateStr = `Month${yhwhDate.month}Day${yhwhDate.day}`
    
    if (isFirebaseConfigured && firebaseUser) {
      try {
        const { getJournalEntry } = await import('@/integrations/firebase/firestore')
        const entry = await getJournalEntry(firebaseUser.uid, yhwhDateStr)
        if (entry?.success && entry.data) {
          setPropheticWords(entry.data.propheticWords || [])
          setAiPrompt(entry.data.aiPrompt || '')
        }
      } catch (error) {
        console.error('Error loading entry:', error)
      }
    }
  }

  const addPropheticWord = () => {
    if (newPropheticWord.trim()) {
      setPropheticWords([...propheticWords, newPropheticWord.trim()])
      setNewPropheticWord('')
      handleSave()
    }
  }

  const generateAIPrompt = async () => {
    setLoadingAI(true)
    try {
      // Simple AI prompt generation (can be enhanced with actual AI API)
      const prompts = [
        "What is YHVH speaking to you today?",
        "How is the Creator moving in your life?",
        "What revelation have you received?",
        "What is the Spirit saying to the remnant?",
        "What breakthrough is coming?"
      ]
      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)]
      setAiPrompt(randomPrompt)
    } catch (error) {
      console.error('Error generating prompt:', error)
    } finally {
      setLoadingAI(false)
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
      propheticWords,
      aiPrompt,
      partOfYowm: time.part,
      watch: Math.floor(time.part / 4.5) + 1,
      isShabbat: yhwhDate.weekDay === 7,
      isTequvah: false,
    }
    
    try {
      if (isFirebaseConfigured && firebaseUser) {
        await saveJournalEntry(firebaseUser.uid, yhwhDateStr, entryData)
      }
      
      toast({
        title: 'Saved!',
        description: 'Your spiritual entry has been saved',
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
    <div className="h-full flex flex-col bg-gradient-to-br from-yellow-950 via-amber-900 to-orange-900 text-white overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Add Spiritual
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
        {/* Prophetic Words / Rhema */}
        <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 p-4 rounded-lg border-2 border-yellow-500">
          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            Prophetic Words / Rhema
          </label>
          <div className="flex gap-2 mb-2">
            <Textarea
              value={newPropheticWord}
              onChange={(e) => setNewPropheticWord(e.target.value)}
              placeholder="Record prophetic word..."
              rows={3}
              className="bg-yellow-900/30 border-yellow-500/50 text-white placeholder:text-gray-300"
            />
            <Button onClick={addPropheticWord}>Add</Button>
          </div>
          {propheticWords.length > 0 && (
            <div className="space-y-2">
              {propheticWords.map((word, idx) => (
                <div key={idx} className="bg-yellow-900/30 p-3 rounded border border-yellow-500/50">
                  <p className="text-yellow-100">{word}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Daily Prompt */}
        <div className="bg-white/10 p-4 rounded-lg">
          <label className="text-sm font-medium mb-2 block">AI Daily Prompt</label>
          <Button
            onClick={generateAIPrompt}
            disabled={loadingAI}
            className="mb-2"
          >
            {loadingAI ? 'Generating...' : 'Inspire Me'}
          </Button>
          {aiPrompt && (
            <div className="bg-white/5 p-3 rounded border border-white/20">
              <p className="text-sm whitespace-pre-wrap">{aiPrompt}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 p-6 border-t border-white/10 flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-yellow-600 hover:bg-yellow-500"
        >
          {saving ? 'Saving...' : 'Save Spiritual Entry'}
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
