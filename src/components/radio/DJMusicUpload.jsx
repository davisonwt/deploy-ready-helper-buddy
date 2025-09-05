import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, Music, X, Plus } from 'lucide-react'
import { useDJPlaylist } from '@/hooks/useDJPlaylist'
import { useDirectMusicUpload } from '@/hooks/useDirectMusicUpload'

export default function DJMusicUpload({ trigger }) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [trackData, setTrackData] = useState({
    title: '',
    artist: '',
    genre: '',
    bpm: '',
    duration: 0,
    type: 'music',
    tags: [],
    isExplicit: false
  })
  const [newTag, setNewTag] = useState('')

  const { fetchTracks, djProfile } = useDJPlaylist()
  const { directUpload, uploading } = useDirectMusicUpload()

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files?.[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile.type.startsWith('audio/')) {
      alert('Please select an audio file')
      return
    }

    // Check file size (25MB limit for better upload reliability)
    const maxFileSize = 25 * 1024 * 1024 // 25MB in bytes
    if (selectedFile.size > maxFileSize) {
      alert(`File too large! Maximum size is 25MB. Your file is ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB. Please convert to MP3 or reduce quality.`)
      return
    }

    setFile(selectedFile)
    
    // Try to extract metadata from filename
    const fileName = selectedFile.name.replace(/\.[^/.]+$/, '')
    const parts = fileName.split(' - ')
    if (parts.length >= 2) {
      setTrackData(prev => ({
        ...prev,
        artist: parts[0].trim(),
        title: parts.slice(1).join(' - ').trim()
      }))
    } else {
      setTrackData(prev => ({
        ...prev,
        title: fileName
      }))
    }

    // Get audio duration
    const audio = new Audio()
    audio.src = URL.createObjectURL(selectedFile)
    audio.addEventListener('loadedmetadata', () => {
      setTrackData(prev => ({
        ...prev,
        duration: Math.round(audio.duration)
      }))
      URL.revokeObjectURL(audio.src)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    console.log('🎵 Form submitted', { file, trackData })
    
    if (!file) {
      console.error('❌ No file selected')
      alert('Please select an audio file')
      return
    }

    if (!trackData.title.trim()) {
      console.error('❌ No title provided')
      alert('Please enter a track title')
      return
    }

    console.log('🎵 About to call uploadTrack')
    const result = await directUpload(file, trackData, djProfile)
    
    if (result) {
      // Reset form
      setFile(null)
      setTrackData({
        title: '',
        artist: '',
        genre: '',
        bpm: '',
        duration: 0,
        type: 'music',
        tags: [],
        isExplicit: false
      })
      setIsOpen(false)
      fetchTracks() // Refresh the tracks list
    }
  }

  const addTag = () => {
    if (newTag.trim() && !trackData.tags.includes(newTag.trim())) {
      setTrackData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove) => {
    setTrackData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Music
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Upload Music Track
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <Card>
            <CardContent className="p-6">
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-2">
                    <Music className="h-8 w-8 mx-auto text-primary" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                      {trackData.duration > 0 && ` • ${formatDuration(trackData.duration)}`}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p>Drop your audio file here or click to browse</p>
                    <p className="text-sm text-muted-foreground">
                      Supported formats: MP3, WAV, FLAC, M4A
                    </p>
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      className="hidden"
                      id="file-upload"
                    />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <Button type="button" variant="outline">
                        Choose File
                      </Button>
                    </Label>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Track Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Track Title *</Label>
              <Input
                id="title"
                value={trackData.title}
                onChange={(e) => setTrackData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter track title"
                required
              />
            </div>

            {/* Artist Name */}
            <div className="space-y-2">
              <Label htmlFor="artist">Artist Name</Label>
              <Input
                id="artist"
                value={trackData.artist}
                onChange={(e) => setTrackData(prev => ({ ...prev, artist: e.target.value }))}
                placeholder="Enter artist name"
              />
            </div>

            {/* Genre */}
            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Input
                id="genre"
                value={trackData.genre}
                onChange={(e) => setTrackData(prev => ({ ...prev, genre: e.target.value }))}
                placeholder="e.g., Electronic, Rock, Jazz"
              />
            </div>

            {/* BPM */}
            <div className="space-y-2">
              <Label htmlFor="bpm">BPM</Label>
              <Input
                id="bpm"
                type="number"
                value={trackData.bpm}
                onChange={(e) => setTrackData(prev => ({ ...prev, bpm: e.target.value ? parseInt(e.target.value) : '' }))}
                placeholder="Beats per minute"
                min="1"
                max="300"
              />
            </div>

            {/* Track Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Track Type</Label>
              <Select value={trackData.type} onValueChange={(value) => setTrackData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="music">Music Track</SelectItem>
                  <SelectItem value="jingle">Jingle/Ident</SelectItem>
                  <SelectItem value="voiceover">Voiceover</SelectItem>
                  <SelectItem value="full_session">Full Session Recording</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration (read-only) */}
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input
                value={trackData.duration > 0 ? formatDuration(trackData.duration) : 'Auto-detected'}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {trackData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !file}>
              {uploading ? 'Uploading...' : 'Upload Track'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}