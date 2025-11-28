import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, Music, X, Plus, Disc } from 'lucide-react'
import { useDJPlaylist } from '@/hooks/useDJPlaylist'
import { useDirectMusicUpload } from '@/hooks/useDirectMusicUpload'

export default function DJMusicUpload({ trigger }) {
  const [isOpen, setIsOpen] = useState(false)
  const [files, setFiles] = useState([])
  const [releaseType, setReleaseType] = useState('single') // 'single' or 'album'
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
  const [albumData, setAlbumData] = useState({
    albumTitle: '',
    artist: '',
    genre: '',
    tags: []
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

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      if (releaseType === 'single') {
        handleFileSelect([droppedFiles[0]])
      } else {
        handleFileSelect(droppedFiles)
      }
    }
  }

  const handleFileSelect = (selectedFiles) => {
    const fileArray = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles]
    const validFiles = []

    // Check file size (25MB per file limit)
    const maxFileSize = 25 * 1024 * 1024 // 25MB in bytes
    
    for (const file of fileArray) {
      if (!file.type.startsWith('audio/')) {
        alert(`${file.name} is not an audio file. Please select only audio files.`)
        continue
      }

      if (file.size > maxFileSize) {
        alert(`${file.name} is too large! Maximum size is 25MB per file. This file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`)
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    setFiles(validFiles)
    
    // For single track, try to extract metadata from filename
    if (releaseType === 'single' && validFiles.length > 0) {
      const fileName = validFiles[0].name.replace(/\.[^/.]+$/, '')
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
      audio.src = URL.createObjectURL(validFiles[0])
      audio.addEventListener('loadedmetadata', () => {
        setTrackData(prev => ({
          ...prev,
          duration: Math.round(audio.duration)
        }))
        URL.revokeObjectURL(audio.src)
      })
    }

    // For album, extract artist from first file
    if (releaseType === 'album' && validFiles.length > 0) {
      const fileName = validFiles[0].name.replace(/\.[^/.]+$/, '')
      const parts = fileName.split(' - ')
      if (parts.length >= 2) {
        setAlbumData(prev => ({
          ...prev,
          artist: parts[0].trim()
        }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (files.length === 0) {
      alert('Please select audio file(s)')
      return
    }

    if (releaseType === 'single') {
      if (!trackData.title.trim()) {
        alert('Please enter a track title')
        return
      }

      const result = await directUpload(files[0], trackData, djProfile)
      
      if (result) {
        resetForm()
        fetchTracks()
      }
    } else {
      // Album upload
      if (!albumData.albumTitle.trim()) {
        alert('Please enter an album title')
        return
      }

      // Upload each track with album info
      let successCount = 0
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileName = file.name.replace(/\.[^/.]+$/, '')
        
        const trackInfo = {
          title: fileName,
          artist: albumData.artist,
          genre: albumData.genre,
          tags: [...albumData.tags, albumData.albumTitle],
          type: 'music',
          duration: 0
        }

        const result = await directUpload(file, trackInfo, djProfile)
        if (result) successCount++
      }

      if (successCount > 0) {
        alert(`Successfully uploaded ${successCount} of ${files.length} tracks`)
        resetForm()
        fetchTracks()
      }
    }
  }

  const resetForm = () => {
    setFiles([])
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
    setAlbumData({
      albumTitle: '',
      artist: '',
      genre: '',
      tags: []
    })
    setIsOpen(false)
  }

  const addTag = () => {
    if (!newTag.trim()) return

    if (releaseType === 'single') {
      if (!trackData.tags.includes(newTag.trim())) {
        setTrackData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag.trim()]
        }))
      }
    } else {
      if (!albumData.tags.includes(newTag.trim())) {
        setAlbumData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag.trim()]
        }))
      }
    }
    setNewTag('')
  }

  const removeTag = (tagToRemove) => {
    if (releaseType === 'single') {
      setTrackData(prev => ({
        ...prev,
        tags: prev.tags.filter(tag => tag !== tagToRemove)
      }))
    } else {
      setAlbumData(prev => ({
        ...prev,
        tags: prev.tags.filter(tag => tag !== tagToRemove)
      }))
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : (
        <div className="flex items-center gap-2">
          <DialogTrigger asChild>
            <Button
              className="flex items-center gap-2"
              onClick={() => {
                setReleaseType('single')
                setFiles([])
              }}
            >
              <Music className="h-4 w-4" />
              Upload Track
            </Button>
          </DialogTrigger>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => {
                setReleaseType('album')
                setFiles([])
              }}
            >
              <Disc className="h-4 w-4" />
              Upload Album
            </Button>
          </DialogTrigger>
        </div>
      )}

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Upload Music
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Release Type Selection - PROMINENT */}
          <Card className="bg-primary/5">
            <CardContent className="p-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">What are you uploading?</Label>
                <Select value={releaseType} onValueChange={(value) => {
                  setReleaseType(value)
                  setFiles([])
                }}>
                  <SelectTrigger className="h-12 text-base font-medium">
                    <SelectValue placeholder="Choose release type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">🎵 Single Track - Upload one song</SelectItem>
                    <SelectItem value="album">💿 Album - Upload multiple songs</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {releaseType === 'single' 
                    ? '📀 Upload a single music track with full metadata' 
                    : '💿 Upload multiple tracks that belong to the same album'}
                </p>
              </div>
            </CardContent>
          </Card>

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
                {files.length > 0 ? (
                  <div className="space-y-2">
                    <Music className="h-8 w-8 mx-auto text-primary" />
                    {files.length === 1 ? (
                      <>
                        <p className="font-medium">{files[0].name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(files[0].size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">{files.length} files selected</p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {files.map((file, idx) => (
                            <p key={idx} className="text-sm text-muted-foreground">
                              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          ))}
                        </div>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFiles([])}
                    >
                      Remove Files
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p>Drop your audio {releaseType === 'album' ? 'files' : 'file'} here or click to browse</p>
                    <p className="text-sm text-muted-foreground">
                      Supported formats: MP3, WAV, FLAC, M4A (25MB per file max)
                    </p>
                    <Input
                      type="file"
                      accept="audio/*"
                      multiple={releaseType === 'album'}
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) {
                          console.error('No files selected');
                          return;
                        }
                        
                        const fileArray = Array.from(files);
                        // Validate files have content
                        const validFiles = fileArray.filter(file => {
                          if (!file || file.size === 0) {
                            console.error('Empty file detected:', file?.name);
                            alert(`File "${file?.name}" is empty. Please select a valid file.`);
                            return false;
                          }
                          return true;
                        });
                        
                        if (validFiles.length > 0) {
                          handleFileSelect(validFiles);
                        }
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <Button type="button" variant="outline">
                        Choose {releaseType === 'album' ? 'Files' : 'File'}
                      </Button>
                    </Label>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {releaseType === 'single' ? (
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
          ) : (
            <div className="space-y-4">
              {/* Album Title */}
              <div className="space-y-2">
                <Label htmlFor="albumTitle">Album Title *</Label>
                <Input
                  id="albumTitle"
                  value={albumData.albumTitle}
                  onChange={(e) => setAlbumData(prev => ({ ...prev, albumTitle: e.target.value }))}
                  placeholder="Enter album title"
                  required
                />
              </div>

              {/* Artist Name */}
              <div className="space-y-2">
                <Label htmlFor="albumArtist">Artist Name</Label>
                <Input
                  id="albumArtist"
                  value={albumData.artist}
                  onChange={(e) => setAlbumData(prev => ({ ...prev, artist: e.target.value }))}
                  placeholder="Enter artist name"
                />
              </div>

              {/* Genre */}
              <div className="space-y-2">
                <Label htmlFor="albumGenre">Genre</Label>
                <Input
                  id="albumGenre"
                  value={albumData.genre}
                  onChange={(e) => setAlbumData(prev => ({ ...prev, genre: e.target.value }))}
                  placeholder="e.g., Electronic, Rock, Jazz"
                />
              </div>
            </div>
          )}

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
              {(releaseType === 'single' ? trackData.tags : albumData.tags).map((tag, index) => (
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
            <Button type="submit" disabled={uploading || files.length === 0}>
              {uploading ? 'Uploading...' : releaseType === 'album' ? `Upload ${files.length} Tracks` : 'Upload Track'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}