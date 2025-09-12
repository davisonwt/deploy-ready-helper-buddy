import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, Mic, Radio, ChevronDown } from 'lucide-react'

const SLOT_LABELS = Array.from({ length: 12 }, (_, i) => {
  const startHour = i * 2
  const endHour = (i * 2) + 2
  return startHour === 0 ? '12 AM - 2 AM' : 
         startHour === 12 ? '12 PM - 2 PM' : 
         startHour < 12 ? `${startHour} AM - ${startHour + 2} AM` : 
         `${startHour - 12} PM - ${(startHour + 2) - 12} PM`
})

const CATEGORY_COLORS = {
  music: 'bg-blue-500/10 border-blue-500/20 text-blue-700',
  talk: 'bg-green-500/10 border-green-500/20 text-green-700',
  educational: 'bg-purple-500/10 border-purple-500/20 text-purple-700',
  community: 'bg-orange-500/10 border-orange-500/20 text-orange-700',
  news: 'bg-red-500/10 border-red-500/20 text-red-700',
  comedy: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700',
  spiritual: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700',
  business: 'bg-teal-500/10 border-teal-500/20 text-teal-700',
  ai_generated: 'bg-gray-500/10 border-gray-500/20 text-gray-700',
  live_call_in: 'bg-pink-500/10 border-pink-500/20 text-pink-700'
}

export function RadioScheduleGrid({ schedule = [] }) {
  const [scheduleView, setScheduleView] = useState('2-hour')
  const currentHour = new Date().getHours()
  const currentSlotIndex = Math.floor(currentHour / 2)

  const scheduleOptions = [
    { value: '2-hour', label: "Today's Schedule (2-Hour Slots)" },
    { value: '1-hour', label: "Today's Schedule (1-Hour Slots)" },
    { value: 'weekly', label: "Weekly Schedule" },
    { value: 'monthly', label: "Monthly Overview" }
  ]

  // Group schedule into 2-hour slots
  const slotGroups = Array.from({ length: 12 }, (_, slotIndex) => {
    const startHour = slotIndex * 2
    const endHour = startHour + 2
    
    // Find schedules that fall within this 2-hour slot
    const slotsInGroup = schedule.filter(slot => 
      slot.hour_slot >= startHour && slot.hour_slot < endHour
    )
    
    return {
      slotIndex,
      startHour,
      endHour,
      label: SLOT_LABELS[slotIndex],
      slots: slotsInGroup,
      isEmpty: slotsInGroup.length === 0 || !slotsInGroup.some(s => s.schedule_id)
    }
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Schedule View</CardTitle>
          </div>
          <Select value={scheduleView} onValueChange={setScheduleView}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select schedule view" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              {scheduleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {slotGroups.map((slotGroup) => {
            const isCurrentSlot = slotGroup.slotIndex === currentSlotIndex
            const mainSlot = slotGroup.slots.find(s => s.schedule_id) || slotGroup.slots[0]
            const isLive = mainSlot?.status === 'live'
            
            return (
              <div
                key={slotGroup.slotIndex}
                className={`p-4 rounded-lg border transition-all ${
                  isCurrentSlot 
                    ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' 
                    : 'border-border'
                } ${isLive ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-mono w-24 text-center">
                      <div className="font-medium">{slotGroup.label}</div>
                      <div className="text-xs text-muted-foreground">2-hour slot</div>
                    </div>
                    
                    {slotGroup.isEmpty ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Radio className="h-4 w-4" />
                        <span className="text-sm">AI Radio Host</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={mainSlot?.dj_avatar} />
                          <AvatarFallback>
                            <Mic className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{mainSlot?.show_name}</h4>
                            {isLive && (
                              <Badge variant="default" className="text-xs">
                                🔴 LIVE
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            with {mainSlot?.dj_name}
                          </p>
                          {mainSlot?.subject && (
                            <p className="text-sm font-medium text-primary mt-1">
                              📻 {mainSlot.subject}
                            </p>
                          )}
                          {mainSlot?.topic_description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {mainSlot.topic_description}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${CATEGORY_COLORS[mainSlot?.category] || ''}`}
                      >
                        {mainSlot?.category?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'AI Generated'}
                      </Badge>
                      
                      {isCurrentSlot && !isLive && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    
                    {mainSlot?.approval_status && mainSlot.approval_status !== 'approved' && (
                      <Badge 
                        variant={mainSlot.approval_status === 'pending' ? 'outline' : 'destructive'} 
                        className="text-xs"
                      >
                        {mainSlot.approval_status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Show Categories</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_COLORS).map(([category, colorClass]) => (
              <Badge 
                key={category}
                variant="outline"
                className={`text-xs ${colorClass}`}
              >
                {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}