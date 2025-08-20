import React, { useState, useEffect } from 'react'
import { useGroveStation } from '@/hooks/useGroveStation'
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
import { Calendar, Clock, Mic } from 'lucide-react'

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

export function ScheduleShowForm({ open, onClose, djProfile }) {
  const { createShow, scheduleShow, schedule, loading } = useGroveStation()
  const [step, setStep] = useState(1) // 1: Show details, 2: Schedule time
  const [showData, setShowData] = useState({
    show_name: '',
    description: '',
    subject: '',
    topic_description: '',
    category: 'music'
  })
  const [scheduleData, setScheduleData] = useState({
    time_slot_date: new Date().toISOString().split('T')[0],
    slot_index: Math.floor(new Date().getHours() / 2), // Convert current hour to 2-hour slot index
    show_notes: ''
  })

  // Get available time slots for the selected date
  const getAvailableSlots = () => {
    const bookedSlots = schedule
      .filter(slot => slot.schedule_id) // Only slots that are actually booked
      .map(slot => Math.floor(slot.hour_slot / 2)) // Convert hour to slot index
    
    return TIME_SLOTS.filter(slot => !bookedSlots.includes(slot.value))
  }

  const handleShowSubmit = async (e) => {
    e.preventDefault()
    const result = await createShow(showData)
    if (result.success) {
      setStep(2)
      // Set the show_id for scheduling
      setScheduleData(prev => ({ ...prev, show_id: result.data.id }))
    }
  }

  const handleScheduleSubmit = async (e) => {
    e.preventDefault()
    
    // Calculate start and end times for 2-hour slot
    const date = new Date(scheduleData.time_slot_date)
    const slot = TIME_SLOTS.find(s => s.value === scheduleData.slot_index)
    const startTime = new Date(date)
    startTime.setHours(slot.startHour, 0, 0, 0)
    
    const endTime = new Date(startTime)
    endTime.setHours(slot.endHour, 0, 0, 0)

    const result = await scheduleShow({
      ...scheduleData,
      hour_slot: slot.startHour, // Store the start hour for compatibility
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString()
    })

    if (result.success) {
      onClose()
    }
  }

  const availableSlots = getAvailableSlots()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {step === 1 ? 'Create Show' : 'Schedule Time Slot'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? 'First, tell us about your show'
              : 'Choose when you want to broadcast'
            }
          </DialogDescription>
        </DialogHeader>

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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !showData.show_name.trim() || !showData.subject.trim()}
              >
                {loading ? "Creating..." : "Next"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium text-sm mb-1">{showData.show_name}</h3>
              <p className="text-xs text-muted-foreground">
                {showData.description || 'No description'}
              </p>
              <Badge variant="outline" className="mt-2">
                {SHOW_CATEGORIES.find(c => c.value === showData.category)?.label}
              </Badge>
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

            <div className="flex justify-between gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
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
                  {loading ? "Scheduling..." : "Schedule Show"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}