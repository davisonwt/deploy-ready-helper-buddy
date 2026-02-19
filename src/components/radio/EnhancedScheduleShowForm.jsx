import React, { useState, useEffect } from 'react'
import { useGroveStation } from '@/hooks/useGroveStation'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import confetti from 'canvas-confetti'
import { SecureInput, SecureTextarea } from '@/components/ui/secure-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, Mic, Upload, X, Image, Music, FileText, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const SHOW_CATEGORIES = [
  { value: 'music', label: 'Music' },
  { value: 'talk', label: 'Talk Show' },
  { value: 'educational', label: 'Educational' },
  { value: 'community', label: 'Community' },
  { value: 'news', label: 'News' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'business', label: 'Business' },
  { value: 'live_call_in', label: 'Live Call-in' }
]

const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const startHour = i * 2
  const endHour = (i * 2) + 2
  return {
    value: i,
    startHour,
    endHour,
    label: `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`,
    displayTime: startHour === 0 ? '12 AM - 2 AM' : 
                 startHour === 12 ? '12 PM - 2 PM' : 
                 startHour < 12 ? `${startHour} AM - ${startHour + 2} AM` : 
                 `${startHour - 12} PM - ${(startHour + 2) - 12} PM`
  }
})

const FILE_TYPES = [
  { 
    purpose: 'cover_image', 
    label: 'Show Cover Image', 
    icon: Image, 
    accept: 'image/*',
    description: 'Upload a cover image for your show (JPG, PNG, WEBP)'
  },
  { 
    purpose: 'intro_music', 
    label: 'Intro Music', 
    icon: Music, 
    accept: 'audio/*',
    description: 'Upload your intro music (MP3, WAV, OGG)'
  },
  { 
    purpose: 'outro_music', 
    label: 'Outro Music', 
    icon: Music, 
    accept: 'audio/*',
    description: 'Upload your outro music (MP3, WAV, OGG)'
  },
  { 
    purpose: 'show_notes', 
    label: 'Show Notes/Script', 
    icon: FileText, 
    accept: '.pdf,.txt,.doc,.docx',
    description: 'Upload your show notes or script (PDF, TXT, DOC)'
  }
]

export function EnhancedScheduleShowForm({ open, onClose, djProfile }) {
  const { createShow, scheduleShow, schedule, loading } = useGroveStation()
  const { user } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState(1) // 1: Show details, 2: File uploads, 3: Schedule time
  const [showData, setShowData] = useState({
    show_name: '',
    description: '',
    subject: '',
    topic_description: '',
    category: 'music'
  })
  const [scheduleData, setScheduleData] = useState({
    time_slot_date: new Date().toISOString().split('T')[0],
    slot_index: Math.floor(new Date().getHours() / 2),
    show_notes: ''
  })
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [uploading, setUploading] = useState(false)
  const [currentShowId, setCurrentShowId] = useState(null)
  const [currentScheduleId, setCurrentScheduleId] = useState(null)

  // Get available time slots for the selected date
  const getAvailableSlots = () => {
    const bookedSlots = schedule
      .filter(slot => slot.schedule_id)
      .map(slot => Math.floor(slot.hour_slot / 2))
    
    return TIME_SLOTS.filter(slot => !bookedSlots.includes(slot.value))
  }

  const handleShowSubmit = async (e) => {
    e.preventDefault()
    const result = await createShow(showData)
    if (result.success) {
      setCurrentShowId(result.data.id)
      setStep(2)
      setScheduleData(prev => ({ ...prev, show_id: result.data.id }))
    }
  }

  const uploadFile = async (file, purpose) => {
    if (!user || !currentShowId) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${purpose}_${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${currentShowId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('radio-show-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('radio-show-files')
        .getPublicUrl(filePath)

      // Save file record to database
      const { error: dbError } = await supabase
        .from('radio_show_files')
        .insert({
          schedule_id: currentScheduleId,
          show_id: currentShowId,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type.split('/')[0],
          file_size: file.size,
          mime_type: file.type,
          upload_purpose: purpose,
          uploaded_by: user.id
        })

      if (dbError) throw dbError

      setUploadedFiles(prev => ({
        ...prev,
        [purpose]: {
          file: file,
          url: publicUrl,
          name: file.name,
          size: file.size
        }
      }))

      toast({
        title: "File Uploaded!",
        description: `${file.name} has been uploaded successfully.`,
      })

    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const removeFile = async (purpose) => {
    if (uploadedFiles[purpose]) {
      try {
        // Remove from storage
        const { error } = await supabase.storage
          .from('radio-show-files')
          .remove([uploadedFiles[purpose].path])

        if (error) throw error

        setUploadedFiles(prev => {
          const newFiles = { ...prev }
          delete newFiles[purpose]
          return newFiles
        })

        toast({
          title: "File Removed",
          description: "File has been removed successfully.",
        })
      } catch (error) {
        console.error('Error removing file:', error)
      }
    }
  }

  const handleScheduleSubmit = async (e) => {
    e.preventDefault()
    
    const date = new Date(scheduleData.time_slot_date)
    const slot = TIME_SLOTS.find(s => s.value === scheduleData.slot_index)
    const startTime = new Date(date)
    startTime.setHours(slot.startHour, 0, 0, 0)
    
    const endTime = new Date(startTime)
    endTime.setHours(slot.endHour, 0, 0, 0)

    const result = await scheduleShow({
      ...scheduleData,
      hour_slot: slot.startHour,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString()
    })

    if (result.success) {
      setCurrentScheduleId(result.data.id)
      // 🎤 Slot booking confetti explosion!
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#d97706', '#ea580c', '#16a34a', '#ca8a04', '#f59e0b'],
      })
      toast({
        title: "🎙️ Show Scheduled! 🎉",
        description: "Your radio slot has been submitted for approval by the Gosats team. You'll be notified once it's reviewed.",
      })
      onClose()
      resetForm()
    }
  }

  const resetForm = () => {
    setStep(1)
    setShowData({
      show_name: '',
      description: '',
      subject: '',
      topic_description: '',
      category: 'music'
    })
    setScheduleData({
      time_slot_date: new Date().toISOString().split('T')[0],
      slot_index: Math.floor(new Date().getHours() / 2),
      show_notes: ''
    })
    setUploadedFiles({})
    setCurrentShowId(null)
    setCurrentScheduleId(null)
  }

  const availableSlots = getAvailableSlots()
  const filesUploaded = Object.keys(uploadedFiles).length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {step === 1 ? 'Create Show' : step === 2 ? 'Upload Files' : 'Schedule Time Slot'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? 'First, tell us about your show'
              : step === 2
              ? 'Upload files for your show (optional but recommended)'
              : 'Choose when you want to broadcast'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNum ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > stepNum ? <CheckCircle className="h-4 w-4" /> : stepNum}
              </div>
              {stepNum < 3 && <div className={`h-1 w-12 ${step > stepNum ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <form onSubmit={handleShowSubmit} className="space-y-4">
            <div>
              <Label htmlFor="show_name">Show Name *</Label>
              <SecureInput
                id="show_name"
                placeholder="e.g., Morning Grove Mix"
                value={showData.show_name}
                onChange={(e) => setShowData(prev => ({ ...prev, show_name: e.target.value }))}
                required
                maxLength={100}
                sanitizeType="text"
              />
            </div>

            <div>
              <Label htmlFor="subject">Subject/Topic *</Label>
              <SecureInput
                id="subject"
                placeholder="e.g., Love & Relationships, Life Coaching, Overcoming Challenges"
                value={showData.subject}
                onChange={(e) => setShowData(prev => ({ ...prev, subject: e.target.value }))}
                required
                maxLength={100}
                sanitizeType="text"
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={showData.category} 
                onValueChange={(value) => setShowData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select show category" />
                </SelectTrigger>
                <SelectContent>
                  {SHOW_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <SecureTextarea
                id="description"
                placeholder="What can listeners expect from your show?"
                value={showData.description}
                onChange={(e) => setShowData(prev => ({ ...prev, description: e.target.value }))}
                maxLength={500}
                sanitizeType="text"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="topic_description">Episode Topic Description</Label>
              <SecureTextarea
                id="topic_description"
                placeholder="Describe what this specific episode will cover..."
                value={showData.topic_description}
                onChange={(e) => setShowData(prev => ({ ...prev, topic_description: e.target.value }))}
                maxLength={500}
                sanitizeType="text"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !showData.show_name.trim() || !showData.subject.trim()}
              >
                {loading ? "Creating..." : "Next: Upload Files"}
              </Button>
            </div>
          </form>
        ) : step === 2 ? (
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium text-sm mb-1">{showData.show_name}</h3>
              <p className="text-xs text-muted-foreground">
                {showData.description || 'No description'}
              </p>
              <Badge variant="outline" className="mt-2">
                {SHOW_CATEGORIES.find(c => c.value === showData.category)?.label}
              </Badge>
            </div>

            <div className="grid gap-4">
              <h4 className="font-medium">Upload Files for Your Show</h4>
              <p className="text-sm text-muted-foreground">
                Upload files to make your show more professional. All files are optional but highly recommended.
              </p>

              {FILE_TYPES.map((fileType) => {
                const uploaded = uploadedFiles[fileType.purpose]
                const Icon = fileType.icon

                return (
                  <Card key={fileType.purpose} className="p-4">
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">{fileType.label}</h5>
                          {uploaded && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(fileType.purpose)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {fileType.description}
                        </p>

                        {uploaded ? (
                          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-700 dark:text-green-400">
                              {uploaded.name} ({(uploaded.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file"
                              accept={fileType.accept}
                              className="hidden"
                              id={`file-${fileType.purpose}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) uploadFile(file, fileType.purpose)
                              }}
                            />
                            <label htmlFor={`file-${fileType.purpose}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="cursor-pointer"
                                disabled={uploading}
                                asChild
                              >
                                <span>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Choose File
                                </span>
                              </Button>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span>Please wait</span>
                  </div>
                  <Progress value={50} className="w-full" />
                </div>
              )}
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(3)}>
                  Skip Files
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setStep(3)}
                  disabled={uploading}
                >
                  Next: Schedule Time
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium text-sm mb-1">{showData.show_name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">
                  {SHOW_CATEGORIES.find(c => c.value === showData.category)?.label}
                </Badge>
                {filesUploaded > 0 && (
                  <Badge variant="secondary">
                    {filesUploaded} file{filesUploaded !== 1 ? 's' : ''} uploaded
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="date">Date *</Label>
              <SecureInput
                id="date"
                type="date"
                value={scheduleData.time_slot_date}
                onChange={(e) => setScheduleData(prev => ({ ...prev, time_slot_date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <Label>Available Time Slots *</Label>
              <p className="text-sm text-muted-foreground mb-3">
                {availableSlots.length} slots available for {scheduleData.time_slot_date}
              </p>
              
              {availableSlots.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground bg-muted rounded-lg">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>No available slots for this date</p>
                  <p className="text-xs">Try selecting a different date</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableSlots.map((slot) => (
                      <Button
                        key={slot.value}
                        type="button"
                        variant={scheduleData.slot_index === slot.value ? "default" : "outline"}
                        className="text-xs justify-start h-auto py-2 px-3"
                        onClick={() => setScheduleData(prev => ({ ...prev, slot_index: slot.value }))}
                      >
                        <Clock className="h-3 w-3 mr-2" />
                        <div className="text-left">
                          <div className="font-medium">{slot.label}</div>
                          <div className="text-xs opacity-70">{slot.displayTime}</div>
                        </div>
                      </Button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="show_notes">Show Notes (Optional)</Label>
              <SecureTextarea
                id="show_notes"
                placeholder="Any special notes about this show..."
                value={scheduleData.show_notes}
                onChange={(e) => setScheduleData(prev => ({ ...prev, show_notes: e.target.value }))}
                maxLength={300}
                sanitizeType="text"
                rows={2}
              />
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">📋 Next Steps</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Your request will be sent to the Gosats team for review</li>
                <li>• They'll check your uploaded files and show details</li>
                <li>• You'll receive a notification once approved</li>
                <li>• Once approved, you can go live during your scheduled time</li>
              </ul>
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || availableSlots.length === 0}
                >
                  {loading ? "Submitting..." : "Submit for Approval"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}