import React, { useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, Mic, Video, X, Trash2, Pause } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Badge } from '../../ui/badge'
import { calculateCreatorDate } from '@/utils/dashboardCalendar'
import { getCreatorTime } from '@/utils/customTime'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface MediaFormProps {
  selectedDate: Date
  yhwhDate: ReturnType<typeof calculateCreatorDate>
  onClose: () => void
  onSave?: () => void
}

/**
 * Upload a file to the `journal-media` Supabase storage bucket and return a public URL.
 * Path pattern is `${userId}/<folder>/<filename>` — required by the bucket's RLS policies.
 */
async function uploadToJournalMedia(
  userId: string,
  folder: 'photos' | 'voice' | 'videos',
  file: File
): Promise<string | null> {
  const safeName = file.name.replace(/\s+/g, '_')
  const path = `${userId}/${folder}/${Date.now()}_${safeName}`
  const { error } = await supabase.storage.from('journal-media').upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) {
    console.error('journal-media upload failed:', error)
    return null
  }
  const { data } = supabase.storage.from('journal-media').getPublicUrl(path)
  return data.publicUrl
}

export function MediaForm({ selectedDate, yhwhDate, onClose, onSave }: MediaFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()

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
    try {
      const { data } = await supabase
        .from('journal_entries' as any)
        .select('images, voice_notes, videos')
        .eq('user_id', user.id)
        .eq('yhwh_year', yhwhDate.year)
        .eq('yhwh_month', yhwhDate.month)
        .eq('yhwh_day', yhwhDate.day)
        .maybeSingle()

      if (data) {
        setPhotos(((data as any).images || []) as string[])
        setVideos(((data as any).videos || []) as string[])
        if ((data as any).voice_notes) {
          setVoiceNotes(
            ((data as any).voice_notes as string[]).map((url: string) => ({ url, transcript: '', duration: 0 }))
          )
        }
      }
    } catch (error) {
      // Entry doesn't exist yet
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setPhotoFiles(Array.from(e.target.files))
  }

  const uploadPhotos = async () => {
    if (!user || photoFiles.length === 0) return
    setUploadingPhotos(true)
    try {
      const uploadedUrls: string[] = []
      for (const file of photoFiles) {
        const url = await uploadToJournalMedia(user.id, 'photos', file)
        if (url) uploadedUrls.push(url)
      }
      setPhotos([...photos, ...uploadedUrls])
      setPhotoFiles([])
      toast({ title: 'Photos uploaded!', description: `${uploadedUrls.length} photo(s) uploaded successfully` })
      await handleSave([...photos, ...uploadedUrls], voiceNotes, videos)
    } catch (error) {
      console.error('Error uploading photos:', error)
      toast({ title: 'Upload failed', description: 'Failed to upload photos', variant: 'destructive' })
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (user) {
          try {
            const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
            const url = await uploadToJournalMedia(user.id, 'voice', file)
            if (url) {
              const next = [...voiceNotes, { url, transcript: '', duration: recordingTime }]
              setVoiceNotes(next)
              toast({ title: 'Voice note recorded!', description: 'Voice note saved successfully' })
              await handleSave(photos, next, videos)
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
      toast({ title: 'Recording failed', description: 'Could not access microphone', variant: 'destructive' })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setVideoFiles(Array.from(e.target.files))
  }

  const uploadVideos = async () => {
    if (!user || videoFiles.length === 0) return
    try {
      const uploadedUrls: string[] = []
      for (const file of videoFiles) {
        const url = await uploadToJournalMedia(user.id, 'videos', file)
        if (url) uploadedUrls.push(url)
      }
      setVideos([...videos, ...uploadedUrls])
      setVideoFiles([])
      toast({ title: 'Videos uploaded!', description: `${uploadedUrls.length} video(s) uploaded successfully` })
      await handleSave(photos, voiceNotes, [...videos, ...uploadedUrls])
    } catch (error) {
      console.error('Error uploading videos:', error)
      toast({ title: 'Upload failed', description: 'Failed to upload videos', variant: 'destructive' })
    }
  }

  const handleSave = async (
    photosArg = photos,
    voiceArg = voiceNotes,
    videosArg = videos
  ) => {
    if (!user) {
      toast({ title: 'Please sign in', description: 'You need to be signed in to save entries' })
      return
    }

    setSaving(true)
    const time = getCreatorTime(selectedDate, 0, 0)
    const gregorianDateStr = selectedDate.toISOString().split('T')[0]

    try {
      const { data: existingEntry } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('yhwh_year', yhwhDate.year)
        .eq('yhwh_month', yhwhDate.month)
        .eq('yhwh_day', yhwhDate.day)
        .maybeSingle()

      const entryPayload: any = {
        user_id: user.id,
        yhwh_year: yhwhDate.year,
        yhwh_month: yhwhDate.month,
        yhwh_day: yhwhDate.day,
        yhwh_weekday: yhwhDate.weekDay,
        yhwh_day_of_year: yhwhDate.dayOfYear || 1,
        gregorian_date: gregorianDateStr,
        images: photosArg || [],
        voice_notes: voiceArg.map(v => v.url) || [],
        videos: videosArg || [],
        part_of_yowm: time.part || null,
        watch: Math.floor((time.part || 0) / 4.5) + 1 || null,
        is_shabbat: yhwhDate.weekDay === 7,
        is_tequvah: false,
      }

      if (existingEntry) {
        await supabase.from('journal_entries').update(entryPayload).eq('id', existingEntry.id)
      } else {
        await supabase.from('journal_entries').insert(entryPayload)
      }

      window.dispatchEvent(new CustomEvent('journalEntriesUpdated'))
      toast({ title: 'Saved!', description: 'Your media has been saved' })
      onSave?.()
    } catch (error) {
      console.error('Error saving:', error)
      toast({ title: 'Error', description: 'Failed to save entry', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-950 via-indigo-900 to-pink-900 text-white overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Add Media</h2>
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
                      const next = photos.filter((_, i) => i !== idx)
                      setPhotos(next)
                      handleSave(next, voiceNotes, videos)
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

      <div className="flex-shrink-0 p-6 border-t border-white/10 flex gap-3">
        <Button onClick={() => handleSave()} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-500">
          {saving ? 'Saving...' : 'Save Media'}
        </Button>
        <Button onClick={onClose} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
          Close
        </Button>
      </div>
    </div>
  )
}
