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
  Globe,
  MapPin
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
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(String(Math.floor(new Date().getHours() / 2))) // default to current 2-hour slot
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
            bio: `Radio Admin from ${adminData.location}, ${adminData.country}`,
            dj_role: 'dj',
            is_active: true,
            timezone: adminData.timezone,
            country: adminData.country
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
          description: `2-hour show hosted by ${adminData.dj_name} from ${adminData.location}, ${adminData.country}`,
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

      toast.success(`${adminData.dj_name} assigned to ${selectedSlot.displayTime} slot (Local time: ${getLocalTime(adminData.timezone, selectedSlot.startHour)})`)
      setShowAssignDialog(false)
      setSelectedSlot(null)
      setSelectedAdmin('')
      await fetchSlotAssignments()
      
      // Emit custom event to notify other components about schedule changes
      window.dispatchEvent(new CustomEvent('scheduleUpdated', { 
        detail: { 
          action: 'assigned', 
          djName: adminData.dj_name, 
          slot: selectedSlot 
        } 
      }))
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

  // Helper function to get local time for a specific timezone and hour
  const getLocalTime = (timezone, hour) => {
    try {
      const date = new Date()
      date.setHours(hour, 0, 0, 0)
      return date.toLocaleTimeString('en-US', { 
        timeZone: timezone, 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch (error) {
      return 'Unknown'
    }
  }

  // Helper function to get current local time
  const getCurrentLocalTime = (timezone) => {
    try {
      const now = new Date()
      return now.toLocaleTimeString('en-US', { 
        timeZone: timezone, 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch (error) {
      return 'Unknown'
    }
  }

  // Helper function to determine if it's night time in a timezone
  const isNightTime = (timezone) => {
    try {
      const now = new Date()
      const localTime = new Date(now.toLocaleString("en-US", {timeZone: timezone}))
      const hours = localTime.getHours()
      return hours < 6 || hours > 22 // Night time: 10 PM to 6 AM
    } catch {
      return false
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
    <div className="grid lg:grid-cols-[1fr_400px] gap-6">
      {/* LEFT: Slot Grid */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Personnel Slot Assignments
              </CardTitle>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "MMM d") : <span>Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Slots</SelectItem>
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
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {slotAssignments
                .filter(item => selectedTimeSlot === 'all' || item.slot.value.toString() === selectedTimeSlot)
                .map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-center">
                        <div className="font-mono text-sm font-medium">{item.slot.label}</div>
                        <div className="text-xs text-muted-foreground">{item.slot.displayTime}</div>
                      </div>

                      {item.isEmpty ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">No assignment</p>
                            <p className="text-xs text-muted-foreground">Slot available</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={item.assignment.radio_djs?.avatar_url} />
                            <AvatarFallback>{item.assignment.radio_djs?.dj_name?.charAt(0) || 'DJ'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{item.assignment.radio_djs?.dj_name || 'Unknown DJ'}</p>
                            <p className="text-sm text-muted-foreground">{item.assignment.radio_shows?.show_name || 'Live Show'}</p>
                            {item.assignment.radio_djs && (
                              <div className="text-xs text-blue-600 mt-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-3 w-3" />
                                  <span>{radioAdmins.find(admin => admin.user_id === item.assignment.radio_djs?.user_id)?.country || 'Unknown'}</span>
                                  <MapPin className="h-3 w-3" />
                                  <span>{radioAdmins.find(admin => admin.user_id === item.assignment.radio_djs?.user_id)?.location || 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  <span className="font-mono text-xs">{radioAdmins.find(admin => admin.user_id === item.assignment.radio_djs?.user_id)?.timezone || 'UTC'}</span>
                                  <span className="font-medium">Local: {(() => {
                                    const timezone = radioAdmins.find(admin => admin.user_id === item.assignment.radio_djs?.user_id)?.timezone || 'UTC';
                                    return getCurrentLocalTime(timezone);
                                  })()}</span>
                                  {(() => {
                                    const timezone = radioAdmins.find(admin => admin.user_id === item.assignment.radio_djs?.user_id)?.timezone || 'UTC';
                                    return isNightTime(timezone) ? <span className="text-blue-500">🌙</span> : <span className="text-yellow-500">☀️</span>;
                                  })()}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                              <Badge variant="secondary" className="text-xs">{item.assignment.status}</Badge>
                              {item.assignment.approval_status && (
                                <Badge variant={item.assignment.approval_status === 'approved' ? 'default' : 'outline'} className="text-xs">
                                  {item.assignment.approval_status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {item.isEmpty ? (
                        <Button size="sm" onClick={() => { setSelectedSlot(item.slot); setShowAssignDialog(true); }} className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Assign Personnel
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => sendShiftReminder(item, 'immediate')} className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Send Reminder
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => removeSlotAssignment(item)} className="flex items-center gap-2 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      {/* RIGHT: Reminders and Available Admins */}
      <div className="space-y-4">
        {/* Bulk Reminder Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Shift Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" onClick={() => sendBulkReminders('24h')} className="w-full justify-start" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              24h Reminders
            </Button>
            <Button variant="outline" onClick={() => sendBulkReminders('1h')} className="w-full justify-start" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              1h Reminders
            </Button>
          </CardContent>
        </Card>

        {/* Available Radio Admins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Radio Admins ({radioAdmins.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {radioAdmins.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No radio admins</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {radioAdmins.map((admin) => {
                  const localTime = getCurrentLocalTime(admin.timezone)
                  const nightTime = isNightTime(admin.timezone)

                  return (
                    <div key={admin.id} className="p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={admin.avatar_url} />
                          <AvatarFallback className="text-sm">
                            {admin.dj_name?.charAt(0) || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{admin.dj_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{admin.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <span className="truncate">{admin.country}</span>
                          </div>
                          <Badge variant={nightTime ? 'secondary' : 'default'} className="text-xs h-5 flex-shrink-0">
                            {nightTime ? '🌙' : '☀️'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{localTime}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assign Personnel to {selectedSlot?.displayTime} Slot
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Radio Admin (with timezone info)</Label>
              <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a radio admin..." />
                </SelectTrigger>
                <SelectContent>
                  {radioAdmins.map((admin) => {
                    const localTime = getCurrentLocalTime(admin.timezone)
                    const nightTime = isNightTime(admin.timezone)

                    return (
                      <SelectItem key={admin.user_id} value={admin.user_id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span>{admin.dj_name}</span>
                            {nightTime ? <span className="text-blue-500">🌙</span> : <span className="text-yellow-500">☀️</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-4">
                            <span>🌍 {admin.country}</span>
                            <span>⏰ {localTime}</span>
                            <span className="font-mono">{admin.timezone}</span>
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {selectedAdmin && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Assignment Preview</h4>
                {(() => {
                  const admin = radioAdmins.find(a => a.user_id === selectedAdmin)
                  if (!admin) return null
                  
                  // Calculate what time this slot would be in the admin's timezone
                  const slotTimeInAdminTz = selectedSlot ? getLocalTime(admin.timezone, selectedSlot.startHour) : 'Unknown'

                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Admin:</span>
                        <span className="font-medium">{admin.dj_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Location:</span>
                        <span>{admin.location}, {admin.country}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Slot Time (UTC):</span>
                        <span className="font-mono">{selectedSlot?.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Local Time for Admin:</span>
                        <span className="font-medium text-primary">{slotTimeInAdminTz}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Timezone:</span>
                        <span className="font-mono">{admin.timezone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time of Day:</span>
                        <span className={`font-medium ${isNightTime(admin.timezone) ? 'text-blue-600' : 'text-green-600'}`}>
                          {isNightTime(admin.timezone) ? 'Night Time 🌙' : 'Day Time ☀️'}
                        </span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={assignPersonnelToSlot}
                disabled={!selectedAdmin}
              >
                Assign Personnel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}