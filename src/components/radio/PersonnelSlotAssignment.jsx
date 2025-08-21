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
  MessageSquare
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
  const [radioAdmins, setRadioAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedAdmin, setSelectedAdmin] = useState('')

  useEffect(() => {
    fetchRadioAdmins()
    
    // Listen for profile updates to refresh radio admin data
    const handleProfileUpdate = (event) => {
      console.log('👂 Received profile update event, refreshing radio admins...')
      setTimeout(() => {
        fetchRadioAdmins()
      }, 500)
    }
    
    window.addEventListener('profileUpdated', handleProfileUpdate)
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate)
    }
  }, [])

  useEffect(() => {
    if (selectedDate) {
      fetchSlotAssignments()
    }
  }, [selectedDate])

  const fetchRadioAdmins = async () => {
    try {
      console.log('🔍 Fetching radio admins with latest profile data...')
      
      // First get all users with radio_admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'radio_admin')

      if (roleError) throw roleError

      if (!roleData || roleData.length === 0) {
        console.log('⚠️ No radio admins found')
        setRadioAdmins([])
        return
      }

      const userIds = roleData.map(r => r.user_id)
      console.log('👥 Found radio admin user IDs:', userIds)

      // Then get the LATEST profiles for these users with all necessary fields
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          display_name,
          first_name,
          last_name,
          avatar_url,
          country,
          timezone,
          location,
          updated_at
        `)
        .in('user_id', userIds)
        .order('updated_at', { ascending: false })

      if (profileError) throw profileError
      
      console.log('📋 Raw profile data:', profileData)
      
      // Transform the data to match expected format with enhanced info
      const transformedData = profileData?.map(profile => {
        const displayName = profile.display_name || 
                           `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                           `Radio Admin ${profile.user_id.substring(0, 8)}`
        
        const country = profile.country || 'Unknown'
        const timezone = profile.timezone || 'UTC'
        const location = profile.location || 'Not specified'
        
        console.log(`👤 Processing admin: ${displayName} | 🌍 ${country} | ⏰ ${timezone} | 📍 ${location}`)
        
        return {
          id: profile.user_id,
          user_id: profile.user_id,
          dj_name: displayName,
          avatar_url: profile.avatar_url,
          country: country,
          timezone: timezone,
          location: location,
          is_active: true,
          updated_at: profile.updated_at
        }
      }) || []
      
      console.log('✅ Transformed radio admins:', transformedData.length, transformedData)
      setRadioAdmins(transformedData)
      
      // Log timezone distribution for 24-hour coverage planning
      const timezoneStats = transformedData.reduce((acc, admin) => {
        acc[admin.timezone] = (acc[admin.timezone] || 0) + 1
        return acc
      }, {})
      console.log('🌐 Radio Admin Timezone Distribution:', timezoneStats)
      
    } catch (err) {
      console.error('❌ Error fetching radio admins:', err)
      toast.error('Failed to load radio admins: ' + err.message)
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
            bio
          )
        `)
        .eq('time_slot_date', dateStr)
        .order('hour_slot')

      if (error) throw error
      console.log('Slot assignments data:', data)

      // Create slot assignments for all 12 slots
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
      const adminData = radioAdmins.find(admin => admin.user_id === selectedAdmin)
      if (!adminData) throw new Error('Radio admin not found')

      // First, create or get a DJ profile for this radio admin
      let djId = null;
      
      // Check if this admin already has a DJ profile
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
        // Create a DJ profile for this radio admin
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

      // Create a basic show for this slot
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

      // Schedule the slot
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
      {/* Instruction Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Radio className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-blue-900">Radio Personnel Slot Assignment</h3>
              <p className="text-blue-700 text-sm">
                Assign radio admins to 2-hour time slots (12 slots per day). Send automated shift reminders via chat messages.
              </p>
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

      {/* Slot Grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            Personnel Assignments for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
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
                        {item.assignment.radio_djs && (
                          <div className="text-xs text-blue-600 mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span>🌍 {radioAdmins.find(admin => admin.user_id === item.assignment.radio_djs?.user_id)?.country || 'Unknown'}</span>
                              <span>📍 {radioAdmins.find(admin => admin.user_id === item.assignment.radio_djs?.user_id)?.location || 'Not specified'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>⏰ {radioAdmins.find(admin => admin.user_id === item.assignment.radio_djs?.user_id)?.timezone || 'UTC'}</span>
                              <span className="font-medium">Local: {(() => {
                                const timezone = radioAdmins.find(admin => admin.user_id === item.assignment.radio_djs?.user_id)?.timezone || 'UTC';
                                return new Date().toLocaleTimeString('en-US', { timeZone: timezone, hour12: true, hour: '2-digit', minute: '2-digit' });
                              })()}</span>
                            </div>
                          </div>
                        )}
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
                        variant="secondary"
                        onClick={() => sendShiftReminder(item)}
                        title="Send shift reminder"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                        setSelectedSlot(item.slot)
                        setSelectedAdmin(item.assignment.radio_djs?.user_id || '')
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
              <Label>Select Radio Admin</Label>
              <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a Radio Admin" />
                </SelectTrigger>
                <SelectContent>
                  {radioAdmins.length > 0 ? (
                    radioAdmins.map((admin) => (
                      <SelectItem key={admin.user_id} value={admin.user_id}>
                        <div className="flex items-center gap-3 py-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={admin.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {admin.dj_name?.charAt(0) || 'RA'}
                            </AvatarFallback>
                          </Avatar>
                           <div className="text-left">
                             <div className="font-medium">{admin.dj_name}</div>
                             <div className="text-xs text-muted-foreground space-y-1">
                               <div>🌍 {admin.country} | 📍 {admin.location}</div>
                               <div>⏰ {admin.timezone} | <span className="font-medium">Now: {new Date().toLocaleTimeString('en-US', { timeZone: admin.timezone, hour12: true, hour: '2-digit', minute: '2-digit' })}</span></div>
                             </div>
                           </div>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-admins" disabled>
                      <div className="text-sm text-muted-foreground">No radio admins found</div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

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