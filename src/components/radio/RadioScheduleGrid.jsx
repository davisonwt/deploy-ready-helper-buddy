import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Clock, Mic, Radio } from 'lucide-react'

const HOUR_LABELS = [
  '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM',
  '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
  '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
  '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'
]

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
  const currentHour = new Date().getHours()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Today's Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {schedule.map((slot, index) => {
            const isCurrentHour = slot.hour_slot === currentHour
            const isLive = slot.status === 'live'
            const isEmpty = !slot.schedule_id
            
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-all ${
                  isCurrentHour 
                    ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' 
                    : 'border-border'
                } ${isLive ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono w-16 text-center">
                      {HOUR_LABELS[slot.hour_slot]}
                    </div>
                    
                    {isEmpty ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Radio className="h-4 w-4" />
                        <span className="text-sm">AI Radio Host</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={slot.dj_avatar} />
                          <AvatarFallback>
                            <Mic className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{slot.show_name}</h4>
                            {isLive && (
                              <Badge variant="default" className="text-xs">
                                🔴 LIVE
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            with {slot.dj_name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${CATEGORY_COLORS[slot.category] || ''}`}
                    >
                      {slot.category?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                    
                    {isCurrentHour && !isLive && (
                      <Badge variant="secondary" className="text-xs">
                        Now
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