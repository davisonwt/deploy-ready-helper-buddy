/**
 * Day Entry Panel - Comprehensive day entry with all 15 features
 * Opens when user clicks on any calendar day
 */

import { useState, useEffect, useRef } from 'react'
import { X, Camera, Mic, Video, Heart, BookOpen, Moon, Droplet, Gift, Users, Smile, Sparkles, FileText, Share2, Download, Image as ImageIcon, Trash2, Play, Pause, Volume2, MessageSquare } from 'lucide-react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { calculateCreatorDate } from '@/utils/dashboardCalendar'
import { getCreatorTime } from '@/utils/customTime'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { useAuth } from '@/hooks/useAuth'
import { isFirebaseConfigured } from '@/integrations/firebase/config'
import { db } from '@/integrations/firebase/config'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { saveJournalEntry, getJournalEntry, postToRemnantWall } from '@/integrations/firebase/firestore'
import { uploadUserPhoto, uploadVoiceNote, uploadVideo } from '@/integrations/firebase/storage'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface DayEntryPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  yhwhDate: ReturnType<typeof calculateCreatorDate>
  initialTab?: 'notes' | 'media' | 'prayer' | 'life' | 'spiritual'
}

export function DayEntryPanel({ isOpen, onClose, selectedDate, yhwhDate, initialTab = 'notes' }: DayEntryPanelProps) {
  const { user: firebaseUser, isAuthenticated } = useFirebaseAuth()
  const { user: supabaseUser } = useAuth()
  const { toast } = useToast()
  const user = firebaseUser || supabaseUser
  
  // Rich Text Notes
  const [richText, setRichText] = useState('')
  
  // Photos
  const [photos, setPhotos] = useState<string[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  
  // Voice Notes
  const [voiceNotes, setVoiceNotes] = useState<Array<{ url: string; transcript: string; duration: number }>>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  // Videos
  const [videos, setVideos] = useState<string[]>([])
  const [videoFiles, setVideoFiles] = useState<File[]>([])
  
  // Birthdays & Anniversaries
  const [isSpecialDay, setIsSpecialDay] = useState(false)
  const [specialDayType, setSpecialDayType] = useState<'birthday' | 'anniversary' | null>(null)
  const [specialDayPerson, setSpecialDayPerson] = useState('')
  
  // Prayer Requests
  const [prayerRequests, setPrayerRequests] = useState<string[]>([])
  const [answeredPrayers, setAnsweredPrayers] = useState<string[]>([])
  const [newPrayerRequest, setNewPrayerRequest] = useState('')
  
  // Dream Journal
  const [dreamEntry, setDreamEntry] = useState('')
  const [isNightMode, setIsNightMode] = useState(false)
  
  // 12 Love & Peace Themes (rotating every 2 hours) - High frequency love & peace
  const themes = [
    { name: 'Divine Love', colors: ['rgb(127 29 29)', 'rgb(157 23 77)', 'rgb(88 28 135)'] },
    { name: 'Peaceful Dawn', colors: ['rgb(30 58 138)', 'rgb(55 48 163)', 'rgb(88 28 135)'] },
    { name: 'Golden Harmony', colors: ['rgb(120 53 15)', 'rgb(154 52 18)', 'rgb(127 29 29)'] },
    { name: 'Serene Waters', colors: ['rgb(19 78 74)', 'rgb(14 116 144)', 'rgb(30 58 138)'] },
    { name: 'Lavender Dreams', colors: ['rgb(88 28 135)', 'rgb(91 33 182)', 'rgb(112 26 117)'] },
    { name: 'Sunset Peace', colors: ['rgb(124 45 18)', 'rgb(153 27 27)', 'rgb(157 23 77)'] },
    { name: 'Emerald Tranquility', colors: ['rgb(6 78 59)', 'rgb(22 101 52)', 'rgb(19 78 74)'] },
    { name: 'Crystal Clarity', colors: ['rgb(12 74 110)', 'rgb(30 64 175)', 'rgb(55 48 163)'] },
    { name: 'Blossom Bliss', colors: ['rgb(131 24 67)', 'rgb(159 18 57)', 'rgb(127 29 29)'] },
    { name: 'Moonlight Serenity', colors: ['rgb(15 23 42)', 'rgb(88 28 135)', 'rgb(55 48 163)'] },
    { name: 'Sunrise Joy', colors: ['rgb(113 63 18)', 'rgb(154 52 18)', 'rgb(120 53 15)'] },
    { name: 'Ocean Calm', colors: ['rgb(22 78 99)', 'rgb(30 64 175)', 'rgb(55 48 163)'] },
  ]
  
  // Get current theme based on 2-hour rotation
  const getCurrentTheme = () => {
    const now = new Date()
    const hours = now.getHours()
    // 24 hours / 12 themes = 2 hours per theme
    const themeIndex = Math.floor(hours / 2)
    return themes[themeIndex]
  }
  
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme())
  
  // Update theme every hour to check for 2-hour boundary
  useEffect(() => {
    const updateTheme = () => {
      setCurrentTheme(getCurrentTheme())
    }
    updateTheme()
    const interval = setInterval(updateTheme, 60 * 60 * 1000) // Check every hour
    return () => clearInterval(interval)
  }, [])
  
  // Health / Fasting Tracker
  const [fastingType, setFastingType] = useState<'none' | 'water' | 'daniel' | 'full'>('none')
  const [waterIntake, setWaterIntake] = useState(0)
  
  // Tithes & Offerings
  const [tithesOfferings, setTithesOfferings] = useState<Array<{ amount: number; category: string; date: string }>>([])
  const [newOfferingAmount, setNewOfferingAmount] = useState('')
  const [newOfferingCategory, setNewOfferingCategory] = useState('firstfruits')
  
  // Family Memory Tags
  const [familyTags, setFamilyTags] = useState<string[]>([])
  const [newFamilyTag, setNewFamilyTag] = useState('')
  
  // Mood & Gratitude
  const [mood, setMood] = useState<'joyful' | 'peaceful' | 'grateful' | 'hopeful' | 'blessed' | null>(null)
  const [gratitude, setGratitude] = useState('')
  
  // Prophetic Words / Rhema
  const [propheticWords, setPropheticWords] = useState<string[]>([])
  const [newPropheticWord, setNewPropheticWord] = useState('')
  
  // AI Daily Prompt
  const [aiPrompt, setAiPrompt] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  
  // Active tab
  const [activeTab, setActiveTab] = useState(initialTab)
  
  // Update activeTab when initialTab changes (when panel opens with a specific tab)
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])
  
  // Update activeTab when initialTab changes (when panel opens with a specific tab)
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  const closePanel = () => {
    onClose()
    document.body.style.overflow = ''
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      loadDayEntry()
      // Check if it's night time for dream journal
      const hour = new Date().getHours()
      setIsNightMode(hour >= 18 || hour < 6)
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, selectedDate])

  // Load existing entry for this day
  const loadDayEntry = async () => {
    if (!isFirebaseConfigured || !user) return
    
    const yhwhDateStr = `Month${yhwhDate.month}Day${yhwhDate.day}`
    const result = await getJournalEntry(user.uid, yhwhDateStr)
    
    if (result.success && result.data) {
      const entry = result.data
      setRichText(entry.richText || '')
      setPhotos(entry.photos || [])
      setVoiceNotes(entry.voiceNotes || [])
      setVideos(entry.videos || [])
      setIsSpecialDay(entry.isSpecialDay || false)
      setSpecialDayType(entry.specialDayType || null)
      setSpecialDayPerson(entry.specialDayPerson || '')
      setPrayerRequests(entry.prayerRequests || [])
      setAnsweredPrayers(entry.answeredPrayers || [])
      setDreamEntry(entry.dreamEntry || '')
      setFastingType(entry.fastingType || 'none')
      setWaterIntake(entry.waterIntake || 0)
      setTithesOfferings(entry.tithesOfferings || [])
      setFamilyTags(entry.familyTags || [])
      setMood(entry.mood || null)
      setGratitude(entry.gratitude || '')
      setPropheticWords(entry.propheticWords || [])
      setAiPrompt(entry.aiPrompt || '')
    }
  }

  // Auto-save function
  const autoSave = async () => {
    if (!user) return
    
    const yhwhDateStr = `Month${yhwhDate.month}Day${yhwhDate.day}`
    // Use default location (can be enhanced later)
    const time = getCreatorTime(selectedDate, 0, 0)
    
    const entryData = {
      yhwhYear: yhwhDate.year,
      yhwhMonth: yhwhDate.month,
      yhwhDay: yhwhDate.day,
      yhwhWeekday: yhwhDate.weekDay,
      yhwhDayOfYear: yhwhDate.dayOfYear,
      gregorianDate: selectedDate.toISOString().split('T')[0],
      richText,
      photos,
      voiceNotes,
      videos,
      isSpecialDay,
      specialDayType,
      specialDayPerson,
      prayerRequests,
      answeredPrayers,
      dreamEntry,
      fastingType,
      waterIntake,
      tithesOfferings,
      familyTags,
      mood,
      gratitude,
      propheticWords,
      aiPrompt,
      partOfYowm: time.part,
      watch: Math.floor(time.part / 4.5) + 1,
      isShabbat: yhwhDate.weekDay === 7,
      isTequvah: false,
    }
    
    // Save to Firebase (if configured)
    if (isFirebaseConfigured && firebaseUser) {
      await saveJournalEntry(firebaseUser.uid, yhwhDateStr, entryData)
    }
    
    // Save to Supabase journal_entries (for Journal component sync)
    if (supabaseUser) {
      try {
        const gregorianDateStr = selectedDate.toISOString().split('T')[0]
        
        // Check if entry already exists
        const { data: existingEntry } = await supabase
          .from('journal_entries' as any)
          .select('id')
          .eq('user_id', supabaseUser.id)
          .eq('yhwh_year', yhwhDate.year)
          .eq('yhwh_month', yhwhDate.month)
          .eq('yhwh_day', yhwhDate.day)
          .maybeSingle()
        
        const entryPayload = {
          user_id: supabaseUser.id,
          yhwh_year: yhwhDate.year,
          yhwh_month: yhwhDate.month,
          yhwh_day: yhwhDate.day,
          yhwh_weekday: yhwhDate.weekDay,
          yhwh_day_of_year: yhwhDate.dayOfYear || 1,
          gregorian_date: gregorianDateStr,
          content: richText || '',
          mood: mood || null,
          tags: familyTags || [],
          images: photos || [],
          voice_notes: voiceNotes.map(v => v.url) || [],
          videos: videos || [],
          prayer_requests: prayerRequests || [],
          answered_prayers: answeredPrayers || [],
          gratitude: gratitude || null,
          part_of_yowm: time.part || null,
          watch: Math.floor((time.part || 0) / 4.5) + 1 || null,
          is_shabbat: yhwhDate.weekDay === 7,
          is_tequvah: false,
          feast: null,
        }
        
        if (existingEntry) {
          // Update existing entry
          await supabase
            .from('journal_entries' as any)
            .update(entryPayload)
            .eq('id', (existingEntry as any).id)
        } else {
          // Insert new entry
          await supabase
            .from('journal_entries' as any)
            .insert(entryPayload)
        }
        
        // Emit event to refresh journal
        window.dispatchEvent(new CustomEvent('journalEntriesUpdated'))
      } catch (error) {
        console.error('Error saving to Supabase:', error)
      }
    }
  }

  // Photo handling
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPhotoFiles([...photoFiles, ...files])
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotos(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const uploadPhotos = async () => {
    if (!isFirebaseConfigured || !user || photoFiles.length === 0) return
    
    setUploadingPhotos(true)
    const uploadedUrls: string[] = []
    
    for (const file of photoFiles) {
      const result = await uploadUserPhoto(user.uid, file)
      if (result.success) {
        uploadedUrls.push(result.url)
      }
    }
    
    setPhotos([...photos, ...uploadedUrls])
    setPhotoFiles([])
    setUploadingPhotos(false)
    await autoSave()
  }

  // Voice note recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        // Upload to Firebase Storage
        if (isFirebaseConfigured && user) {
          const file = new File([audioBlob], `voice_${Date.now()}.wav`, { type: 'audio/wav' })
          const result = await uploadVoiceNote(user.uid, file)
          
          if (result.success) {
            // Transcribe using Web Speech API
            const transcript = await transcribeAudio(audioBlob)
            
            setVoiceNotes(prev => [...prev, {
              url: result.url,
              transcript,
              duration: recordingTime
            }])
            await autoSave()
          }
        }
        
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      // Auto-stop after 60 seconds max
      const timeoutId = setTimeout(() => {
        clearInterval(interval)
        if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop()
          setIsRecording(false)
        }
      }, 60000)
      
      // Store timeout ID for cleanup
      return () => {
        clearInterval(interval)
        clearTimeout(timeoutId)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive'
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    // Using Web Speech API for transcription
    return new Promise((resolve) => {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      if (!SpeechRecognition) {
        resolve('Transcription not available')
        return
      }
      const recognition = new SpeechRecognition()
      if (!recognition) {
        resolve('Transcription not available')
        return
      }
      
      recognition.continuous = false
      recognition.interimResults = false
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        resolve(transcript)
      }
      
      recognition.onerror = () => {
        resolve('Transcription failed')
      }
      
      // For now, return placeholder since we need audio file transcription
      resolve('Voice note recorded')
    })
  }

  // Video handling
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setVideoFiles([...videoFiles, ...files])
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setVideos(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const uploadVideos = async () => {
    if (!isFirebaseConfigured || !user || videoFiles.length === 0) return
    
    const uploadedUrls: string[] = []
    
    for (const file of videoFiles) {
      const result = await uploadVideo(user.uid, file)
      if (result.success) {
        uploadedUrls.push(result.url)
      }
    }
    
    setVideos([...videos, ...uploadedUrls])
    setVideoFiles([])
    await autoSave()
  }

  // Add prayer request
  const addPrayerRequest = () => {
    if (newPrayerRequest.trim()) {
      setPrayerRequests([...prayerRequests, newPrayerRequest])
      setNewPrayerRequest('')
      autoSave()
    }
  }

  // Mark prayer as answered
  const markPrayerAnswered = (index: number) => {
    const prayer = prayerRequests[index]
    setPrayerRequests(prayerRequests.filter((_, i) => i !== index))
    setAnsweredPrayers([...answeredPrayers, prayer])
    autoSave()
  }

  // Add offering
  const addOffering = () => {
    const amount = parseFloat(newOfferingAmount)
    if (amount > 0) {
      setTithesOfferings([...tithesOfferings, {
        amount,
        category: newOfferingCategory,
        date: selectedDate.toISOString()
      }])
      setNewOfferingAmount('')
      autoSave()
    }
  }

  // Add family tag
  const addFamilyTag = () => {
    if (newFamilyTag.trim()) {
      setFamilyTags([...familyTags, newFamilyTag])
      setNewFamilyTag('')
      autoSave()
    }
  }

  // Add prophetic word
  const addPropheticWord = () => {
    if (newPropheticWord.trim()) {
      setPropheticWords([...propheticWords, newPropheticWord])
      setNewPropheticWord('')
      autoSave()
    }
  }

  // AI Daily Prompt
  const generateAIPrompt = async () => {
    setLoadingAI(true)
    // This would integrate with Grok API or similar
    // For now, generate a custom prompt based on the day
    const leader = Math.floor((yhwhDate.dayOfYear - 1) / 91) + 1
    const weekOfYear = Math.floor((yhwhDate.dayOfYear - 1) / 7) + 1
    
    const prompt = `Today is Month ${yhwhDate.month}, Day ${yhwhDate.day} in Leader ${leader}, Week ${weekOfYear}. 
    
Meditate on the significance of this day in the Creator's calendar. What does this season reveal about His timing and purpose?`
    
    setAiPrompt(prompt)
    setLoadingAI(false)
    await autoSave()
  }

  // Export as PDF
  const exportToPDF = () => {
    // This would use a PDF library like jsPDF
    toast({
      title: 'Exporting',
      description: 'PDF export feature coming soon'
    })
  }

  // Share to Remnant Wall
  const shareToRemnantWall = async () => {
    if (!isFirebaseConfigured || !user) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in to share',
        variant: 'destructive'
      })
      return
    }

    const yhwhDateStr = `Month ${yhwhDate.month} Day ${yhwhDate.day}`
    const result = await postToRemnantWall({
      yhwhDate: yhwhDateStr,
      type: 'journal',
      text: richText || 'Shared a day entry',
      photoURLs: photos,
      voiceNoteURL: voiceNotes[0]?.url || null,
      videoURL: videos[0] || null,
      authorUID: firebaseUser.uid,
      authorDisplayName: firebaseUser.displayName || 'Anonymous',
      anonymityLevel: 1,
    })

    if (result.success) {
      toast({
        title: 'Shared',
        description: 'Day entry shared to Remnant Wall'
      })
    }
  }

  // Share to S2G Chatapp All
  const shareToS2GChat = async () => {
    if (!isFirebaseConfigured || !db || !firebaseUser) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in with Firebase to share to S2G Chatapp',
        variant: 'destructive'
      })
      return
    }

    try {
      const yhwhDateStr = `Month ${yhwhDate.month}, Day ${yhwhDate.day}`
      const shareText = richText 
        ? `${yhwhDateStr}: ${richText.substring(0, 500)}${richText.length > 500 ? '...' : ''}`
        : `Sharing my day entry for ${yhwhDateStr}`

      await addDoc(collection(db, 'community_chat'), {
        text: shareText,
        authorUID: firebaseUser.uid,
        authorDisplayName: firebaseUser.displayName || firebaseUser.email || 'Anonymous',
        createdAt: serverTimestamp(),
        warningCount: 0,
        isDeleted: false,
        sharedFrom: 'calendar',
        yhwhDate: yhwhDateStr,
      })

      toast({
        title: 'Shared to S2G Chatapp',
        description: 'Your day entry has been shared to the community chat'
      })
    } catch (error: any) {
      console.error('Error sharing to S2G Chatapp:', error)
      toast({
        title: 'Error',
        description: 'Failed to share to S2G Chatapp: ' + (error.message || 'Unknown error'),
        variant: 'destructive'
      })
    }
  }

  if (!isOpen) {
    return null
  }

  // Use default location coordinates (can be enhanced later with user location)
  const currentTime = getCreatorTime(selectedDate, -26.2, 28.0)
  const isFeastDay = yhwhDate.weekDay === 7 || yhwhDate.day === 1 || yhwhDate.day === 15

  return (
    <>
      <style>{`
        .day-entry-modal-scroll::-webkit-scrollbar {
          width: 12px;
        }
        .day-entry-modal-scroll::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
        }
        .day-entry-modal-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.5);
          border-radius: 6px;
          border: 2px solid rgba(0, 0, 0, 0.2);
        }
        .day-entry-modal-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.7);
        }
      `}</style>
      <div className="fixed inset-0 z-50 pointer-events-auto">
        <div
          onClick={closePanel}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500 opacity-100"
        />
        <div 
          className="absolute top-0 left-0 right-0 bottom-0 w-full max-w-4xl mx-auto shadow-2xl transform transition-all duration-1000 pointer-events-auto flex flex-col"
          style={{
            height: '100vh',
            maxHeight: '100vh',
            background: isNightMode 
              ? 'linear-gradient(to bottom right, rgb(2 6 23), rgb(30 27 75), rgb(30 27 75))'
              : `linear-gradient(to bottom right, ${currentTheme.colors[0]}, ${currentTheme.colors[1]}, ${currentTheme.colors[2]})`
          }}
        >
          {/* Theme indicator - Fixed header */}
          <div 
            className="flex-shrink-0 backdrop-blur-sm border-b border-white/10 px-8 py-2 text-center z-10"
            style={{
              background: `linear-gradient(to right, ${currentTheme.colors[0]}, ${currentTheme.colors[1]})`,
              opacity: 0.95
            }}
          >
            <p className="text-xs text-white/90 font-light">
              ✨ {currentTheme.name} · Changes every 2 hours ✨
            </p>
          </div>
          
          {/* Scrollable content area - Takes remaining space */}
          <div 
            className="flex-1 overflow-y-auto day-entry-modal-scroll min-h-0"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255, 255, 255, 0.5) rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="p-8 pb-8 space-y-6 text-white">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-4xl font-bold">
                  Month {yhwhDate.month}, Day {yhwhDate.day}
                </h2>
                <p className="text-yellow-300 text-lg mt-2">
                  {yhwhDate.weekDay === 7 ? 'Shabbat' : `Day ${yhwhDate.weekDay}`} · Year {yhwhDate.year}
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={closePanel}
                className="text-4xl hover:scale-125 transition"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button onClick={autoSave} variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button onClick={exportToPDF} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={shareToRemnantWall} variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share to Wall
              </Button>
              <Button onClick={shareToS2GChat} variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Share to S2G Chatapp
              </Button>
            </div>

            {/* Tabs for all features */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
              <TabsList className="grid grid-cols-5 w-full bg-white/10">
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="prayer">Prayer</TabsTrigger>
                <TabsTrigger value="life">Life</TabsTrigger>
                <TabsTrigger value="spiritual">Spiritual</TabsTrigger>
              </TabsList>

              {/* Rich Text Notes */}
              <TabsContent value="notes" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Rich Text Notes (Markdown supported)</label>
                  <Textarea
                    value={richText}
                    onChange={(e) => {
                      setRichText(e.target.value)
                      autoSave()
                    }}
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
                    onChange={(e) => {
                      setDreamEntry(e.target.value)
                      autoSave()
                    }}
                    placeholder="Record your dreams..."
                    rows={6}
                    className={`${isNightMode ? 'bg-purple-950 border-purple-700' : 'bg-white/10 border-white/20'} text-white placeholder:text-gray-400`}
                  />
                </div>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="space-y-4 mt-4">
                {/* Photos */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Photos & Galleries
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  {photoFiles.length > 0 && (
                    <Button onClick={uploadPhotos} disabled={uploadingPhotos} className="mt-2">
                      {uploadingPhotos ? 'Uploading...' : `Upload ${photoFiles.length} photos`}
                    </Button>
                  )}
                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {photos.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-32 object-cover rounded" />
                          <button
                            onClick={() => {
                              setPhotos(photos.filter((_, i) => i !== idx))
                              autoSave()
                            }}
                            className="absolute top-1 right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Voice Notes */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Voice Notes
                  </label>
                  <div className="flex gap-2">
                    {!isRecording ? (
                      <Button onClick={startRecording} className="bg-red-600 hover:bg-red-500">
                        <Mic className="h-4 w-4 mr-2" />
                        Start Recording
                      </Button>
                    ) : (
                      <Button onClick={stopRecording} className="bg-red-600 hover:bg-red-500">
                        <Pause className="h-4 w-4 mr-2" />
                        Stop ({recordingTime}s)
                      </Button>
                    )}
                  </div>
                  {voiceNotes.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {voiceNotes.map((note, idx) => (
                        <div key={idx} className="bg-white/10 p-3 rounded-lg">
                          <audio controls src={note.url} className="w-full mb-2" />
                          <p className="text-sm text-gray-300">{note.transcript}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Videos */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Videos {isFeastDay && <Badge className="bg-yellow-500 text-black">Golden Frame</Badge>}
                  </label>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  {videoFiles.length > 0 && (
                    <Button onClick={uploadVideos} className="mt-2">
                      Upload {videoFiles.length} video{videoFiles.length > 1 ? 's' : ''}
                    </Button>
                  )}
                  {videos.length > 0 && (
                    <div className="space-y-4 mt-4">
                      {videos.map((url, idx) => (
                        <div key={idx} className={`relative ${isFeastDay ? 'ring-4 ring-yellow-400' : ''}`}>
                          <video controls src={url} className="w-full rounded" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Prayer Tab */}
              <TabsContent value="prayer" className="space-y-4 mt-4">
                {/* Prayer Requests */}
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

                {/* Answered Prayers */}
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
              </TabsContent>

              {/* Life Tab */}
              <TabsContent value="life" className="space-y-4 mt-4">
                {/* Birthdays & Anniversaries */}
                <div className="bg-white/10 p-4 rounded-lg">
                  <label className="text-sm font-medium mb-2 block">Birthdays & Anniversaries</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={isSpecialDay}
                      onChange={(e) => {
                        setIsSpecialDay(e.target.checked)
                        autoSave()
                      }}
                      className="w-4 h-4"
                    />
                    <span>Mark as special day (glows gold every year)</span>
                  </div>
                  {isSpecialDay && (
                    <div className="space-y-2 mt-2">
                      <select
                        value={specialDayType || ''}
                        onChange={(e) => {
                          setSpecialDayType(e.target.value as 'birthday' | 'anniversary')
                          autoSave()
                        }}
                        className="bg-white/10 border-white/20 text-white rounded p-2 w-full"
                      >
                        <option value="">Select type</option>
                        <option value="birthday">Birthday</option>
                        <option value="anniversary">Anniversary</option>
                      </select>
                      <Input
                        value={specialDayPerson}
                        onChange={(e) => {
                          setSpecialDayPerson(e.target.value)
                          autoSave()
                        }}
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
                      onChange={(e) => {
                        setFastingType(e.target.value as any)
                        autoSave()
                      }}
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
                        onChange={(e) => {
                          setWaterIntake(parseInt(e.target.value) || 0)
                          autoSave()
                        }}
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
                        onClick={() => {
                          setMood(m as any)
                          autoSave()
                        }}
                        className={`p-2 rounded ${mood === m ? 'bg-yellow-500' : 'bg-white/10'}`}
                      >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={gratitude}
                    onChange={(e) => {
                      setGratitude(e.target.value)
                      autoSave()
                    }}
                    placeholder="What are you grateful for today?"
                    rows={3}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
              </TabsContent>

              {/* Spiritual Tab */}
              <TabsContent value="spiritual" className="space-y-4 mt-4">
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
              </TabsContent>
            </Tabs>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

