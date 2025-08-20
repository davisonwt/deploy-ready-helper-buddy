import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  Plus,
  Edit,
  Trash2,
  Radio
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

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

export default function PersonnelSlotAssignment() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [slotAssignments, setSlotAssignments] = useState([])
  const [radioDJs, setRadioDJs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedDJ, setSelectedDJ] = useState('')

  useEffect(() => {
    fetchRadioDJs()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      fetchSlotAssignments()
    }
  }, [selectedDate])

  const fetchRadioDJs = async () => {
    try {
      const { data, error } = await supabase
        .from('radio_djs')
        .select('*')
        .eq('is_active', true)
        .order('dj_name')

      if (error) throw error
      setRadioDJs(data || [])
    } catch (err) {
      console.error('Error fetching radio DJs:', err)
      toast.error('Failed to load radio DJs')
    }
  }

  const fetchSlotAssignments = async () => {
    try {
      setLoading(true)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      
      const { data, error } = await supabase
        .from('radio_schedule')
        .select(`
          *,
          radio_shows (
            show_name,
            description,
            category,
            subject,
            topic_description
          ),
          radio_djs (
            dj_name,
            user_id,
            avatar_url,
            bio
          )
        `)
        .eq('time_slot_date', dateStr)
        .order('hour_slot')

      if (error) throw error

      // Create slot assignments for all 12 slots
      const assignments = TIME_SLOTS.map(slot => {
        const existingAssignment = data?.find(d => Math.floor(d.hour_slot / 2) === slot.value)
        return {
          slot,
          assignment: existingAssignment || null,
          isEmpty: !existingAssignment
        }
      })

      setSlotAssignments(assignments)
    } catch (err) {
      console.error('Error fetching slot assignments:', err)
      toast.error('Failed to load slot assignments')
    } finally {
      setLoading(false)
    }
  }

  const assignPersonnelToSlot = async () => {
    if (!selectedSlot || !selectedDJ) return

    try {
      const djData = radioDJs.find(dj => dj.id === selectedDJ)
      if (!djData) throw new Error('DJ not found')

      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const startTime = new Date(selectedDate)
      startTime.setHours(selectedSlot.startHour, 0, 0, 0)
      
      const endTime = new Date(startTime)
      endTime.setHours(selectedSlot.endHour, 0, 0, 0)

      // Create a basic show for this slot
      const { data: showData, error: showError } = await supabase
        .from('radio_shows')
        .insert([{
          dj_id: selectedDJ,
          show_name: `${djData.dj_name}'s Show`,
          description: `2-hour show hosted by ${djData.dj_name}`,
          category: 'talk',
          subject: 'General Broadcasting',
          topic_description: 'Live radio broadcasting'
        }])
        .select()
        .single()

      if (showError) throw showError

      // Schedule the slot
      const { error: scheduleError } = await supabase
        .from('radio_schedule')
        .insert([{
          show_id: showData.id,
          dj_id: selectedDJ,
          time_slot_date: dateStr,
          hour_slot: selectedSlot.startHour,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'scheduled',
          approval_status: 'approved'
        }])

      if (scheduleError) throw scheduleError

      toast.success(`${djData.dj_name} assigned to ${selectedSlot.displayTime} slot`)
      setShowAssignDialog(false)
      setSelectedSlot(null)
      setSelectedDJ('')
      await fetchSlotAssignments()
    } catch (err) {
      console.error('Error assigning personnel:', err)
      toast.error('Failed to assign personnel: ' + err.message)
    }
  }

  const removeSlotAssignment = async (assignment) => {
    if (!assignment.assignment) return

    try {
      // Remove the schedule entry
      const { error: scheduleError } = await supabase
        .from('radio_schedule')
        .delete()
        .eq('id', assignment.assignment.id)

      if (scheduleError) throw scheduleError

      // Remove the show if it was auto-created
      if (assignment.assignment.radio_shows) {
        const { error: showError } = await supabase
          .from('radio_shows')
          .delete()
          .eq('id', assignment.assignment.show_id)

        if (showError) console.warn('Could not delete show:', showError)
      }

      toast.success('Personnel removed from slot')
      await fetchSlotAssignments()
    } catch (err) {
      console.error('Error removing assignment:', err)
      toast.error('Failed to remove assignment')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading slot assignments...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Personnel Slot Assignment
            </div>
            <div className="text-sm font-normal">
              12 × 2-hour slots per day
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label>Date:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Slot Grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            Personnel Assignments for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </CardTitle>
        </CardContent>
        <CardContent>
          <div className="grid gap-4">
            {slotAssignments.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-24 text-center">
                    <div className="font-mono text-sm font-medium">
                      {item.slot.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.slot.displayTime}
                    </div>
                  </div>

                  {item.isEmpty ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="text-sm">No personnel assigned</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={item.assignment.radio_djs?.avatar_url} />
                        <AvatarFallback>
                          {item.assignment.radio_djs?.dj_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">
                          {item.assignment.radio_djs?.dj_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.assignment.radio_shows?.show_name}
                        </div>
                      </div>
                      <Badge 
                        variant={item.assignment.approval_status === 'approved' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {item.assignment.approval_status}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {item.isEmpty ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedSlot(item.slot)
                        setShowAssignDialog(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSlot(item.slot)
                          setSelectedDJ(item.assignment.dj_id)
                          setShowAssignDialog(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeSlotAssignment(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSlot && `Assign Personnel to ${selectedSlot.displayTime}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Radio Personnel</Label>
              <Select value={selectedDJ} onValueChange={setSelectedDJ}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a DJ/Host" />
                </SelectTrigger>
                <SelectContent>
                  {radioDJs.map((dj) => (
                    <SelectItem key={dj.id} value={dj.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={dj.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {dj.dj_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {dj.dj_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button onClick={assignPersonnelToSlot} disabled={!selectedDJ}>
                Assign Personnel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}