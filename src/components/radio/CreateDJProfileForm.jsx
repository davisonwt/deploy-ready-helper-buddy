import React, { useState } from 'react'
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
import { X, Plus, Mic } from 'lucide-react'

const SPECIALTIES = [
  'music_curation', 'talk_shows', 'comedy', 'educational_content',
  'community_updates', 'live_interviews', 'call_in_shows', 'news',
  'spiritual_content', 'business_talks', 'storytelling'
]

const TIME_SLOTS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
]

export function CreateDJProfileForm({ open, onClose }) {
  const { createDJProfile, loading } = useGroveStation()
  const [formData, setFormData] = useState({
    dj_name: '',
    bio: '',
    specialties: [],
    preferred_time_slots: [],
    emergency_availability: false
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const result = await createDJProfile(formData)
    if (result.success) {
      onClose()
    }
  }

  const handleSpecialtyToggle = (specialty) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }))
  }

  const handleTimeSlotToggle = (timeSlot) => {
    setFormData(prev => ({
      ...prev,
      preferred_time_slots: prev.preferred_time_slots.includes(timeSlot)
        ? prev.preferred_time_slots.filter(t => t !== timeSlot)
        : [...prev.preferred_time_slots, timeSlot]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Become an AOD Station DJ
          </DialogTitle>
          <DialogDescription>
            Create your DJ profile and start broadcasting to the AOD Station community!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="dj_name">DJ Name *</Label>
              <SecureInput
                id="dj_name"
                placeholder="Your on-air name (e.g., DJ GrowthMaster)"
                value={formData.dj_name}
                onChange={(e) => setFormData(prev => ({ ...prev, dj_name: e.target.value }))}
                required
                maxLength={50}
                sanitizeType="text"
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <SecureTextarea
                id="bio"
                placeholder="Tell the community about yourself, your style, and what listeners can expect from your shows..."
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                maxLength={500}
                sanitizeType="text"
                rows={4}
              />
            </div>
          </div>

          {/* Specialties */}
          <div>
            <Label>Specialties</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select the types of content you're most passionate about hosting
            </p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((specialty) => (
                <Badge
                  key={specialty}
                  variant={formData.specialties.includes(specialty) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => handleSpecialtyToggle(specialty)}
                >
                  {specialty.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  {formData.specialties.includes(specialty) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Preferred Time Slots */}
          <div>
            <Label>Preferred Time Slots</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select the hours you'd prefer to broadcast (you can change these later)
            </p>
            <div className="grid grid-cols-6 gap-2">
              {TIME_SLOTS.map((timeSlot) => (
                <Badge
                  key={timeSlot}
                  variant={formData.preferred_time_slots.includes(timeSlot) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80 justify-center"
                  onClick={() => handleTimeSlotToggle(timeSlot)}
                >
                  {timeSlot}
                </Badge>
              ))}
            </div>
            {formData.preferred_time_slots.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Selected {formData.preferred_time_slots.length} time slots
              </p>
            )}
          </div>

          {/* Emergency Availability */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="emergency_availability"
              checked={formData.emergency_availability}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                emergency_availability: e.target.checked 
              }))}
              className="rounded border-gray-300"
            />
            <Label htmlFor="emergency_availability" className="text-sm">
              I'm available for emergency broadcasts (fill in for no-shows)
            </Label>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.dj_name.trim()}
            >
              {loading ? "Creating Profile..." : "Create DJ Profile"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}