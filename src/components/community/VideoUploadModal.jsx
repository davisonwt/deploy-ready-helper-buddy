import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Upload, Video, X } from 'lucide-react'
import { useCommunityVideos } from '@/hooks/useCommunityVideos.jsx'

export default function VideoUploadModal({ isOpen, onClose }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const { uploadVideo, uploading } = useCommunityVideos()

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile)
    }
  }

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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!file || !title.trim()) return

    const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    
    const result = await uploadVideo(file, {
      title: title.trim(),
      description: description.trim() || null,
      tags: tagsArray
    })

    if (result.success) {
      // Reset form
      setFile(null)
      setTitle('')
      setDescription('')
      setTags('')
      onClose()
    }
  }

  const resetForm = () => {
    setFile(null)
    setTitle('')
    setDescription('')
    setTags('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Upload Community Video
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Video File</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/10' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-2">
                  <Video className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm">
                    Drop your video here or{' '}
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => document.getElementById('video-upload').click()}
                    >
                      browse files
                    </button>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    MP4, MOV • 30sec-1min • Max 100MB
                  </p>
                </div>
              )}
            </div>
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title..."
              maxLength={100}
              required
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your video..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 characters
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="farming tips, growth, marketing"
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                onClose()
              }}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || !title.trim() || uploading}
              className="flex-1"
            >
              {uploading ? 'Uploading...' : 'Upload Video'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}