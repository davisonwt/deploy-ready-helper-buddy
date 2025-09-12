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
  Radio,
  MessageSquare,
  Globe
} from 'lucide-react'
import { format } from 'date-fns'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

// Common timezones for radio presenters
const PRESENTER_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (US)', flag: '🇺🇸' },
  { value: 'America/Chicago', label: 'Central (US)', flag: '🇺🇸' },
  { value: 'America/Denver', label: 'Mountain (US)', flag: '🇺🇸' },
  { value: 'America/Los_Angeles', label: 'Pacific (US)', flag: '🇺🇸' },
  { value: 'Europe/London', label: 'London (UK)', flag: '🇬🇧' },
  { value: 'Europe/Berlin', label: 'Berlin (Germany)', flag: '🇩🇪' },
  { value: 'Australia/Sydney', label: 'Sydney (Australia)', flag: '🇦🇺' },
  { value: 'Australia/Melbourne', label: 'Melbourne (Australia)', flag: '🇦🇺' },
  { value: 'Asia/Tokyo', label: 'Tokyo (Japan)', flag: '🇯🇵' },
  { value: 'Asia/Singapore', label: 'Singapore', flag: '🇸🇬' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (South Africa)', flag: '🇿🇦' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (Brazil)', flag: '🇧🇷' }
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

function TimezoneClock({ timezone, selectedDate, slot }) {
  const [currentTime, setCurrentTime] = useState('')
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const timeInZone = formatInTimeZone(now, timezone.value, 'HH:mm')
      setCurrentTime(timeInZone)
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [timezone.value])

  const getSlotTimeInTimezone = (slot, date) => {
    // Create base date in UTC
    const baseDate = new Date(date)
    baseDate.setUTCHours(slot.startHour, 0, 0, 0)
    
    const startTime = formatInTimeZone(baseDate, timezone.value, 'h:mm a')
    
    baseDate.setUTCHours(slot.endHour, 0, 0, 0)
    const endTime = formatInTimeZone(baseDate, timezone.value, 'h:mm a')
    
    return `${startTime} - ${endTime}`
  }

  return (
    <div className="text-xs space-y-1 min-w-[120px]">
      <div className="flex items-center gap-1">
        <span>{timezone.flag}</span>
        <span className="font-medium">{timezone.label}</span>
      </div>
      <div className="text-muted-foreground">
        Now: {currentTime}
      </div>
      {slot && (
        <div className="font-mono">
          Slot: {getSlotTimeInTimezone(slot, selectedDate)}
        </div>
      )}
    </div>
  )
}

export default function TimezoneSlotAssignment() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('all') // New state for time slot dropdown
  const [slotAssignments, setSlotAssignments] = useState([])
  const [radioAdmins, setRadioAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedAdmin, setSelectedAdmin] = useState('')
  const [userTimezone, setUserTimezone] = useState('UTC')
  const [showTimezones, setShowTimezones] = useState([
    PRESENTER_TIMEZONES[0], // Eastern US
    PRESENTER_TIMEZONES[4], // London
    PRESENTER_TIMEZONES[6]  // Sydney
  ])

  useEffect(() => {
    // Detect user's timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    setUserTimezone(timezone)
    fetchRadioAdmins()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      fetchSlotAssignments()
    }
  }, [selectedDate])

  const fetchRadioAdmins = async () => {
    try {
      console.log('Fetching radio admins...')
      
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'radio_admin')

      if (roleError) throw roleError

      if (!roleData || roleData.length === 0) {
        console.log('No radio admins found')
        setRadioAdmins([])
        return
      }

      const userIds = roleData.map(r => r.user_id)

      // First get profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          display_name,
          first_name,
          last_name,
          avatar_url
        `)
        .in('user_id', userIds)

      if (profileError) throw profileError

      // Then get or create DJ records with timezone info
      const transformedData = []
      for (const profile of profileData || []) {
        // Check if DJ record exists
        let djRecord = null
        const { data: existingDJ } = await supabase
          .from('radio_djs')
          .select('timezone, country')
          .eq('user_id', profile.user_id)
          .single()

        if (existingDJ) {
          djRecord = existingDJ
        } else {
          // Create DJ record if it doesn't exist
          const { data: newDJ } = await supabase
            .from('radio_djs')
            .insert([{
              user_id: profile.user_id,
              dj_name: profile.display_name || 
                      `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                      'Radio Admin',
              avatar_url: profile.avatar_url,
              bio: 'Radio Admin',
              dj_role: 'dj',
              is_active: true,
              timezone: 'America/New_York',
              country: 'United States'
            }])
            .select('timezone, country')
            .single()

          djRecord = newDJ || { timezone: 'America/New_York', country: 'United States' }
        }

        transformedData.push({
          id: profile.user_id,
          user_id: profile.user_id,
          dj_name: profile.display_name || 
                   `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                   'Radio Admin',
          avatar_url: profile.avatar_url,
          is_active: true,
          timezone: djRecord.timezone || 'America/New_York',
          country: djRecord.country || 'United States'
        })
      }
      
      console.log('Radio admins fetched with timezone info:', transformedData)
      setRadioAdmins(transformedData)
    } catch (err) {
      console.error('Error fetching radio admins:', err)
      toast.error('Failed to load radio admins')
    }
  }

  const fetchSlotAssignments = async () => {
    try {
      setLoading(true)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      console.log('Fetching slot assignments for date:', dateStr)
      
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
            bio,
            timezone,
            country
          )
        `)
        .eq('time_slot_date', dateStr)
        .order('hour_slot')

      if (error) throw error
      console.log('Slot assignments data:', data)

      const assignments = TIME_SLOTS.map(slot => {
        const existingAssignment = data?.find(d => Math.floor(d.hour_slot / 2) === slot.value)
        return {
          slot,
          assignment: existingAssignment || null,
          isEmpty: !existingAssignment
        }
      })

      console.log('Processed assignments:', assignments)
      setSlotAssignments(assignments)
    } catch (err) {
      console.error('Error fetching slot assignments:', err)
      toast.error('Failed to load slot assignments')
    } finally {
      setLoading(false)
    }
  }

  const assignPersonnelToSlot = async () => {
    if (!selectedSlot || !selectedAdmin) return

    try {
      const adminData = radioAdmins.find(admin => admin.id === selectedAdmin)
      if (!adminData) throw new Error('Radio admin not found')

      let djId = null;
      
      const { data: existingDJ, error: djCheckError } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', selectedAdmin)
        .single()

      if (djCheckError && djCheckError.code !== 'PGRST116') {
        throw djCheckError
      }

      if (existingDJ) {
        djId = existingDJ.id
      } else {
        const { data: newDJ, error: djCreateError } = await supabase
          .from('radio_djs')
          .insert([{
            user_id: selectedAdmin,
            dj_name: adminData.dj_name,
            avatar_url: adminData.avatar_url,
            bio: 'Radio Admin',
            dj_role: 'dj',
            is_active: true
          }])
          .select()
          .single()

        if (djCreateError) throw djCreateError
        djId = newDJ.id
      }

      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const startTime = new Date(selectedDate)
      startTime.setHours(selectedSlot.startHour, 0, 0, 0)
      
      const endTime = new Date(startTime)
      endTime.setHours(selectedSlot.endHour, 0, 0, 0)

      const { data: showData, error: showError } = await supabase
        .from('radio_shows')
        .insert([{
          dj_id: djId,
          show_name: `${adminData.dj_name}'s Show`,
          description: `2-hour show hosted by ${adminData.dj_name}`,
          category: 'talk',
          subject: 'General Broadcasting',
          topic_description: 'Live radio broadcasting'
        }])
        .select()
        .single()

      if (showError) throw showError

      const { error: scheduleError } = await supabase
        .from('radio_schedule')
        .insert([{
          show_id: showData.id,
          dj_id: djId,
          time_slot_date: dateStr,
          hour_slot: selectedSlot.startHour,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'scheduled',
          approval_status: 'approved'
        }])

      if (scheduleError) throw scheduleError

      toast.success(`${adminData.dj_name} assigned to ${selectedSlot.displayTime} slot`)
      setShowAssignDialog(false)
      setSelectedSlot(null)
      setSelectedAdmin('')
      await fetchSlotAssignments()
    } catch (err) {
      console.error('Error assigning personnel:', err)
      toast.error('Failed to assign personnel: ' + err.message)
    }
  }

  const removeSlotAssignment = async (assignment) => {
    if (!assignment.assignment) return

    try {
      const { error: scheduleError } = await supabase
        .from('radio_schedule')
        .delete()
        .eq('id', assignment.assignment.id)

      if (scheduleError) throw scheduleError

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

  const sendShiftReminder = async (assignment, reminderType = 'immediate') => {
    if (!assignment.assignment) return

    try {
      const { error } = await supabase.functions.invoke('send-shift-reminders', {
        body: {
          scheduleId: assignment.assignment.id,
          reminderType: reminderType
        }
      })

      if (error) throw error

      toast.success(`Shift reminder sent to ${assignment.assignment.radio_djs?.dj_name}`)
    } catch (err) {
      console.error('Error sending shift reminder:', err)
      toast.error('Failed to send shift reminder: ' + err.message)
    }
  }

  const sendBulkReminders = async (type) => {
    try {
      const { error } = await supabase.functions.invoke('send-shift-reminders', {
        body: {
          reminderType: type
        }
      })

      if (error) throw error

      toast.success(`${type === '24h' ? '24-hour' : '1-hour'} reminders sent to all upcoming DJs`)
    } catch (err) {
      console.error('Error sending bulk reminders:', err)
      toast.error('Failed to send bulk reminders: ' + err.message)
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
      {/* Instruction Card with Timezone Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-blue-900">Global Radio Personnel Assignment</h3>
              <p className="text-blue-700 text-sm">
                Assign radio hosts worldwide with automatic timezone conversion. Times shown for different regions so listeners know when presenters are live in their local time.
              </p>
              <div className="mt-2 text-xs text-blue-600">
                Your timezone: {userTimezone} • {formatInTimeZone(new Date(), userTimezone, 'HH:mm')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Timezone Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Timezone Display
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {showTimezones.map((tz, index) => (
              <div key={tz.value} className="border rounded-lg p-3">
                <TimezoneClock timezone={tz} selectedDate={selectedDate} />
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Times are automatically converted for each timezone. Listeners worldwide will see when presenters are live in their local time.
          </div>
        </CardContent>
      </Card>

      {/* Bulk Reminder Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Automated Shift Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground flex-1">
              Send automated reminders to radio personnel about their upcoming shifts via chat
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => sendBulkReminders('24h')}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Send 24h Reminders
              </Button>
              <Button
                variant="outline"
                onClick={() => sendBulkReminders('1h')}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Send 1h Reminders
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slot Grid with Timezone Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Personnel Assignments</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <Select value={format(selectedDate, "yyyy-MM-dd")} onValueChange={(dateStr) => {
                const newDate = new Date(dateStr)
                setSelectedDate(newDate)
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {/* Generate options for next 7 days */}
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = new Date()
                    date.setDate(date.getDate() + i)
                    return (
                      <SelectItem key={date.toISOString()} value={format(date, "yyyy-MM-dd")}>
                        {format(date, "EEEE, MMMM d, yyyy")}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50 max-h-60 overflow-y-auto">
                  <SelectItem value="all">All Time Slots</SelectItem>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value.toString()}>
                      {slot.displayTime}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {slotAssignments
              .filter(item => selectedTimeSlot === 'all' || item.slot.slotIndex.toString() === selectedTimeSlot)
              .map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-32 text-center">
                    <div className="font-mono text-sm font-medium">
                      {item.slot.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.slot.displayTime}
                    </div>
                  </div>

                  {/* Timezone displays */}
                  <div className="flex gap-3 border-l pl-4">
                    {showTimezones.map(tz => (
                      <TimezoneClock 
                        key={tz.value}
                        timezone={tz} 
                        selectedDate={selectedDate} 
                        slot={item.slot}
                      />
                    ))}
                  </div>

                  <div className="border-l pl-4">
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
                          <div className="text-xs text-blue-600 flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {item.assignment.radio_djs?.country} ({item.assignment.radio_djs?.timezone})
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
                        onClick={() => sendShiftReminder(item, 'immediate')}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSlot(item.slot)
                          setSelectedAdmin(item.assignment.radio_djs?.user_id)
                          setShowAssignDialog(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
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
              Assign Radio Personnel to {selectedSlot?.displayTime}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Radio Admin</Label>
              <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a radio admin" />
                </SelectTrigger>
                <SelectContent>
                  {radioAdmins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={admin.avatar_url} />
                          <AvatarFallback>{admin.dj_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{admin.dj_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {admin.country} ({admin.timezone})
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSlot && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="font-medium mb-2">Timezone Preview</h4>
                <div className="grid grid-cols-1 gap-2">
                  {showTimezones.map(tz => (
                    <TimezoneClock 
                      key={tz.value}
                      timezone={tz} 
                      selectedDate={selectedDate} 
                      slot={selectedSlot}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button onClick={assignPersonnelToSlot} disabled={!selectedAdmin}>
                Assign Personnel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}