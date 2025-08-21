import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Globe, 
  Clock, 
  User, 
  Plus,
  Sun,
  Moon,
  AlertTriangle,
  CheckCircle,
  Users,
  Calendar,
  MapPin
} from 'lucide-react'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

// Global regions with their optimal daylight hours (6 AM - 8 PM local time)
const GLOBAL_REGIONS = [
  {
    name: 'North America East',
    timezone: 'America/New_York',
    flag: '🇺🇸',
    utcOffset: -5, // EST
    countries: ['United States (East)', 'Canada (East)'],
    optimalHours: { start: 6, end: 20 } // 6 AM - 8 PM local
  },
  {
    name: 'North America West',
    timezone: 'America/Los_Angeles',
    flag: '🇺🇸',
    utcOffset: -8, // PST
    countries: ['United States (West)', 'Canada (West)'],
    optimalHours: { start: 6, end: 20 }
  },
  {
    name: 'Europe',
    timezone: 'Europe/London',
    flag: '🇬🇧',
    utcOffset: 0, // GMT
    countries: ['United Kingdom', 'Ireland', 'Portugal'],
    optimalHours: { start: 6, end: 20 }
  },
  {
    name: 'Central Europe',
    timezone: 'Europe/Berlin',
    flag: '🇩🇪',
    utcOffset: 1, // CET
    countries: ['Germany', 'France', 'Netherlands', 'Belgium'],
    optimalHours: { start: 6, end: 20 }
  },
  {
    name: 'South Africa',
    timezone: 'Africa/Johannesburg',
    flag: '🇿🇦',
    utcOffset: 2, // SAST
    countries: ['South Africa', 'Botswana', 'Zimbabwe'],
    optimalHours: { start: 6, end: 20 }
  },
  {
    name: 'Australia East',
    timezone: 'Australia/Sydney',
    flag: '🇦🇺',
    utcOffset: 10, // AEST
    countries: ['Australia (East)', 'New Zealand'],
    optimalHours: { start: 6, end: 20 }
  },
  {
    name: 'Asia Pacific',
    timezone: 'Asia/Singapore',
    flag: '🇸🇬',
    utcOffset: 8, // SGT
    countries: ['Singapore', 'Malaysia', 'Philippines'],
    optimalHours: { start: 6, end: 20 }
  },
  {
    name: 'Japan',
    timezone: 'Asia/Tokyo',
    flag: '🇯🇵',
    utcOffset: 9, // JST
    countries: ['Japan', 'South Korea'],
    optimalHours: { start: 6, end: 20 }
  }
]

// 24-hour time slots (UTC)
const TIME_SLOTS_24H = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  utc: `${i.toString().padStart(2, '0')}:00 UTC`
}))

function RegionTimeCard({ region, currentSlot }) {
  const [currentTime, setCurrentTime] = useState('')
  const [localHour, setLocalHour] = useState(0)
  const [isDaylight, setIsDaylight] = useState(false)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const timeInZone = formatInTimeZone(now, region.timezone, 'HH:mm')
      const hourInZone = parseInt(formatInTimeZone(now, region.timezone, 'H'))
      
      setCurrentTime(timeInZone)
      setLocalHour(hourInZone)
      setIsDaylight(hourInZone >= region.optimalHours.start && hourInZone < region.optimalHours.end)
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [region.timezone])

  const getSlotTimeInRegion = (utcHour) => {
    const utcDate = new Date()
    utcDate.setUTCHours(utcHour, 0, 0, 0)
    return formatInTimeZone(utcDate, region.timezone, 'HH:mm')
  }

  const isOptimalTime = (utcHour) => {
    const utcDate = new Date()
    utcDate.setUTCHours(utcHour, 0, 0, 0)
    const localHour = parseInt(formatInTimeZone(utcDate, region.timezone, 'H'))
    return localHour >= region.optimalHours.start && localHour < region.optimalHours.end
  }

  return (
    <Card className={`${isDaylight ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{region.flag}</span>
            <div>
              <CardTitle className="text-lg">{region.name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {region.countries.join(', ')}
              </p>
            </div>
          </div>
          <Badge variant={isDaylight ? 'default' : 'secondary'} className="gap-1">
            {isDaylight ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
            {isDaylight ? 'Daylight' : 'Night'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <div className="font-mono text-lg font-bold">{currentTime}</div>
            <div className="text-xs text-muted-foreground">Current Local Time</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium">Optimal Hours:</div>
            <div className="text-xs text-muted-foreground">
              {region.optimalHours.start}:00 - {region.optimalHours.end}:00
            </div>
          </div>
        </div>
        
        {currentSlot && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Selected Slot:</div>
                <div className="font-mono">{getSlotTimeInRegion(currentSlot)} local</div>
              </div>
              <Badge variant={isOptimalTime(currentSlot) ? 'default' : 'destructive'}>
                {isOptimalTime(currentSlot) ? 'Optimal' : 'Off-hours'}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function GlobalCoverageGrid({ assignments, onSlotSelect }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          24-Hour Global Coverage Grid
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-2 mb-4">
          {TIME_SLOTS_24H.map((slot) => {
            const assignment = assignments.find(a => a.hour === slot.hour)
            const hasAssignment = !!assignment
            
            return (
              <Button
                key={slot.hour}
                variant={hasAssignment ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSlotSelect(slot.hour)}
                className="flex flex-col p-2 h-auto"
              >
                <div className="font-mono text-xs">{slot.utc}</div>
                <div className="text-xs">
                  {hasAssignment ? (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      <span className="truncate">{assignment.dj_name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Empty</span>
                    </div>
                  )}
                </div>
              </Button>
            )
          })}
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Covered</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span>Needs Coverage</span>
          </div>
          <div className="ml-auto text-muted-foreground">
            Coverage: {assignments.length}/24 hours
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function GlobalDJScheduler() {
  const { user } = useAuth()
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [availableDJs, setAvailableDJs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedDJ, setSelectedDJ] = useState('')
  
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([fetchAssignments(), fetchAvailableDJs()])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load scheduling data')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignments = async () => {
    // Fetch current global assignments (simplified for demo)
    const mockAssignments = [
      { hour: 8, dj_name: 'Sarah UK', region: 'Europe', dj_id: 1 },
      { hour: 14, dj_name: 'Mike ZA', region: 'South Africa', dj_id: 2 },
      { hour: 20, dj_name: 'Emma US', region: 'North America East', dj_id: 3 },
    ]
    setAssignments(mockAssignments)
  }

  const fetchAvailableDJs = async () => {
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'radio_admin')

      if (roleError) throw roleError

      if (!roleData || roleData.length === 0) {
        setAvailableDJs([])
        return
      }

      const userIds = roleData.map(r => r.user_id)

      const { data: djData, error: djError } = await supabase
        .from('radio_djs')
        .select(`
          id,
          user_id,
          dj_name,
          avatar_url,
          timezone,
          country,
          is_active
        `)
        .in('user_id', userIds)
        .eq('is_active', true)

      if (djError) throw djError

      setAvailableDJs(djData || [])
    } catch (error) {
      console.error('Error fetching DJs:', error)
    }
  }

  const handleSlotSelect = (hour) => {
    setSelectedSlot(hour)
    setShowAssignDialog(true)
  }

  const assignDJToSlot = async () => {
    if (!selectedDJ || selectedSlot === null) return

    try {
      const dj = availableDJs.find(d => d.id === selectedDJ)
      if (!dj) throw new Error('DJ not found')

      // Here you would create the actual assignment in the database
      // For now, we'll update the local state
      const newAssignment = {
        hour: selectedSlot,
        dj_name: dj.dj_name,
        region: dj.country,
        dj_id: dj.id
      }

      setAssignments([...assignments.filter(a => a.hour !== selectedSlot), newAssignment])
      
      toast.success(`${dj.dj_name} assigned to ${selectedSlot}:00 UTC slot`)
      setShowAssignDialog(false)
      setSelectedSlot(null)
      setSelectedDJ('')
    } catch (error) {
      console.error('Error assigning DJ:', error)
      toast.error('Failed to assign DJ to slot')
    }
  }

  const getDJOptimalSlots = (dj) => {
    const region = GLOBAL_REGIONS.find(r => 
      r.countries.some(country => 
        dj.country?.toLowerCase().includes(country.toLowerCase().split(' ')[0])
      )
    )
    
    if (!region) return []
    
    const optimalSlots = []
    for (let utcHour = 0; utcHour < 24; utcHour++) {
      const utcDate = new Date()
      utcDate.setUTCHours(utcHour, 0, 0, 0)
      const localHour = parseInt(formatInTimeZone(utcDate, region.timezone, 'H'))
      
      if (localHour >= region.optimalHours.start && localHour < region.optimalHours.end) {
        optimalSlots.push(utcHour)
      }
    }
    
    return optimalSlots
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading global scheduling data...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 via-green-50 to-orange-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-xl text-blue-900">
                Global AOD Heretics Scheduler
              </h3>
              <p className="text-blue-700">
                Assign heretics worldwide to ensure 24/7 coverage during optimal daylight hours (6 AM - 8 PM local time).
                Click on empty time slots to assign DJs from their optimal timezone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Time Regions */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Global Time Regions & Current Status
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {GLOBAL_REGIONS.map((region) => (
            <RegionTimeCard 
              key={region.timezone} 
              region={region} 
              currentSlot={selectedSlot}
            />
          ))}
        </div>
      </div>

      {/* Coverage Grid */}
      <GlobalCoverageGrid 
        assignments={assignments}
        onSlotSelect={handleSlotSelect}
      />

      {/* Available DJs by Region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Available Heretics by Region
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableDJs.map((dj) => {
              const optimalSlots = getDJOptimalSlots(dj)
              const region = GLOBAL_REGIONS.find(r => 
                r.countries.some(country => 
                  dj.country?.toLowerCase().includes(country.toLowerCase().split(' ')[0])
                )
              )
              
              return (
                <Card key={dj.id} className="border border-muted">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={dj.avatar_url} />
                        <AvatarFallback>
                          {dj.dj_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{dj.dj_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {dj.country || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Optimal UTC slots: {optimalSlots.slice(0, 3).map(s => `${s}:00`).join(', ')}
                          {optimalSlots.length > 3 && ` +${optimalSlots.length - 3} more`}
                        </div>
                        {region && (
                          <Badge variant="outline" className="text-xs mt-2">
                            {region.flag} {region.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Heretic to {selectedSlot}:00 UTC Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select DJ/Heretic</Label>
              <Select value={selectedDJ} onValueChange={setSelectedDJ}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a heretic..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDJs.map((dj) => {
                    const optimalSlots = getDJOptimalSlots(dj)
                    const isOptimal = optimalSlots.includes(selectedSlot)
                    
                    return (
                      <SelectItem key={dj.id} value={dj.id}>
                        <div className="flex items-center gap-2">
                          <span>{dj.dj_name}</span>
                          <Badge 
                            variant={isOptimal ? 'default' : 'destructive'} 
                            className="text-xs"
                          >
                            {isOptimal ? 'Optimal Time' : 'Off Hours'}
                          </Badge>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedDJ && selectedSlot !== null && (
              <div className="border rounded p-3 space-y-2">
                <h4 className="font-medium">Regional Time Preview:</h4>
                <div className="grid gap-2">
                  {GLOBAL_REGIONS.map((region) => {
                    const utcDate = new Date()
                    utcDate.setUTCHours(selectedSlot, 0, 0, 0)
                    const localTime = formatInTimeZone(utcDate, region.timezone, 'HH:mm')
                    const localHour = parseInt(formatInTimeZone(utcDate, region.timezone, 'H'))
                    const isOptimal = localHour >= region.optimalHours.start && localHour < region.optimalHours.end
                    
                    return (
                      <div key={region.timezone} className="flex items-center justify-between text-sm">
                        <span>{region.flag} {region.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{localTime}</span>
                          {isOptimal ? (
                            <Badge variant="default" className="text-xs">Daylight</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Night</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={assignDJToSlot} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Assign Heretic
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAssignDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}