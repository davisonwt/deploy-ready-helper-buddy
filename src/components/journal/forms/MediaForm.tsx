import React, { useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, Mic, Video, X, Trash2, Play, Pause } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Badge } from '../../ui/badge'
import { calculateCreatorDate } from '@/utils/dashboardCalendar'
import { getCreatorTime } from '@/utils/customTime'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { useAuth } from '@/hooks/useAuth'
import { isFirebaseConfigured } from '@/integrations/firebase/config'
import { saveJournalEntry } from '@/integrations/firebase/firestore'
import { uploadUserPhoto, uploadVoiceNote, uploadVideo } from '@/integrations/firebase/storage'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface MediaFormProps {
  selectedDate: Date
  yhwhDate: ReturnType<typeof calculateCreatorDate>
  onClose: () => void
  onSave?: () => void
}

export function MediaForm({ selectedDate, yhwhDate, onClose, onSave }: MediaFormProps) {
  const { user: firebaseUser } = useFirebaseAuth()
  const { user: supabaseUser } = useAuth()
  const { toast } = useToast()
  const user = firebaseUser || supabaseUser

  const [photos, setPhotos] = useState<string[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [voiceNotes, setVoiceNotes] = useState<Array<{ url: string; transcript: string; duration: number }>>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [videos, setVideos] = useState<string[]>([])
  const [videoFiles, setVideoFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const isFeastDay = yhwhDate.weekDay === 7 || yhwhDate.day === 1 || yhwhDate.day === 15

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
          setPhotos(entry.photos || [])
          setVoiceNotes(entry.voiceNotes || [])
          setVideos(entry.videos || [])
        }
      } catch (error) {
        console.error('Error loading entry:', error)
      }
    }
    
    if (supabaseUser) {
      try {
        const { data } = await supabase
          .from('journal_entries' as any)
          .select('images, voice_notes, videos')
          .eq('user_id', supabaseUser.id)
          .eq('yhwh_year', yhwhDate.year)
          .eq('yhwh_month', yhwhDate.month)
          .eq('yhwh_day', yhwhDate.day)
          .maybeSingle()
        
        if (data) {
          setPhotos(((data as any).images || []) as string[])
          setVideos(((data as any).videos || []) as string[])
          if ((data as any).voice_notes) {
            setVoiceNotes(((data as any).voice_notes as string[]).map((url: string) => ({ url, transcript: '', duration: 0 })))
          }
        }
      } catch (error) {
        // Entry doesn't exist yet
      }
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotoFiles(Array.from(e.target.files))
    }
  }

  const uploadPhotos = async () => {
    if (!user || photoFiles.length === 0) return
    
    setUploadingPhotos(true)
    try {
      const uploadedUrls: string[] = []
      for (const file of photoFiles) {
        const result = await uploadUserPhoto(user.uid, file)
        if (result.success) {
          uploadedUrls.push(result.url)
        }
      }
      setPhotos([...photos, ...uploadedUrls])
      setPhotoFiles([])
      toast({
        title: 'Photos uploaded!',
        description: `${uploadedUrls.length} photo(s) uploaded successfully`,
      })
      await handleSave()
    } catch (error) {
      console.error('Error uploading photos:', error)
      toast({
        title: 'Upload failed',
        description: 'Failed to upload photos',
        variant: 'destructive',
      })
    } finally {
      setUploadingPhotos(false)
    }
  }

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
        if (user) {
          try {
            const file = new File([audioBlob], `voice_${Date.now()}.wav`, { type: 'audio/wav' })
            const result = await uploadVoiceNote(user.uid, file)
            if (result.success) {
              setVoiceNotes([...voiceNotes, { url: result.url, transcript: '', duration: recordingTime }])
              toast({
                title: 'Voice note recorded!',
                description: 'Voice note saved successfully',
              })
              await handleSave()
            }
          } catch (error) {
            console.error('Error uploading voice note:', error)
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

      mediaRecorderRef.current.addEventListener('stop', () => {
        clearInterval(interval)
      })
    } catch (error) {
      console.error('Error starting recording:', error)
      toast({
        title: 'Recording failed',
        description: 'Could not access microphone',
        variant: 'destructive',
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setVideoFiles(Array.from(e.target.files))
    }
  }

  const uploadVideos = async () => {
    if (!user || videoFiles.length === 0) return
    
    try {
      const uploadedUrls: string[] = []
      for (const file of videoFiles) {
        const result = await uploadVideo(user.uid, file)
        if (result.success) {
          uploadedUrls.push(result.url)
        }
      }
      setVideos([...videos, ...uploadedUrls])
      setVideoFiles([])
      toast({
        title: 'Videos uploaded!',
        description: `${uploadedUrls.length} video(s) uploaded successfully`,
      })
      await handleSave()
    } catch (error) {
      console.error('Error uploading videos:', error)
      toast({
        title: 'Upload failed',
        description: 'Failed to upload videos',
        variant: 'destructive',
      })
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
      photos,
      voiceNotes,
      videos,
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
          .single()
        
        const entryPayload = {
          user_id: supabaseUser.id,
          yhwh_year: yhwhDate.year,
          yhwh_month: yhwhDate.month,
          yhwh_day: yhwhDate.day,
          yhwh_weekday: yhwhDate.weekDay,
          yhwh_day_of_year: yhwhDate.dayOfYear || 1,
          gregorian_date: gregorianDateStr,
          images: photos || [],
          voice_notes: voiceNotes.map(v => v.url) || [],
          videos: videos || [],
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
        description: 'Your media has been saved',
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
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-950 via-indigo-900 to-pink-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Add Media</h2>
        </div>
        <p className="text-sm text-gray-300">
          Month {yhwhDate.month}, Day {yhwhDate.day} · {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                      handleSave()
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
                  <p className="text-sm text-gray-300">{note.transcript || 'No transcript available'}</p>
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
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-6 border-t border-white/10 flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-purple-600 hover:bg-purple-500"
        >
          {saving ? 'Saving...' : 'Save Media'}
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

