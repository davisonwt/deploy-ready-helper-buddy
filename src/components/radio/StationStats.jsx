import React, { useEffect } from 'react'
import { useGroveStation } from '@/hooks/useGroveStation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Radio,
  Headphones,
  Mic,
  Calendar,
  Star
} from 'lucide-react'

export function StationStats() {
  const { stats, fetchStats, djs, schedule } = useGroveStation()

  useEffect(() => {
    fetchStats(7) // Last 7 days
  }, [])

  // Calculate aggregated stats
  const totalListeners = stats.reduce((sum, stat) => sum + (stat.total_listeners || 0), 0)
  const peakListeners = Math.max(...stats.map(stat => stat.peak_listeners || 0), 0)
  const averageListeners = stats.length > 0 ? Math.round(totalListeners / stats.length) : 0
  const activeDJs = djs.filter(dj => dj.is_active).length
  const scheduledShows = schedule.filter(slot => slot.schedule_id).length
  const hoursWithContent = scheduledShows

  // Calculate engagement metrics
  const engagementScore = stats.length > 0 
    ? stats.reduce((sum, stat) => sum + (stat.engagement_score || 0), 0) / stats.length 
    : 0

  const audioQualityScore = stats.length > 0
    ? stats.reduce((sum, stat) => sum + (stat.audio_quality_score || 0), 0) / stats.length
    : 0

  // Generate hourly breakdown
  const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => {
    const hourStats = stats.filter(stat => 
      new Date(stat.created_at).getHours() === hour
    )
    
    const avgListeners = hourStats.length > 0
      ? hourStats.reduce((sum, stat) => sum + (stat.total_listeners || 0), 0) / hourStats.length
      : 0

    return {
      hour,
      listeners: Math.round(avgListeners),
      label: hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`
    }
  })

  const getBarHeight = (listeners) => {
    const maxListeners = Math.max(...hourlyBreakdown.map(h => h.listeners), 1)
    return Math.max((listeners / maxListeners) * 100, 2)
  }

  const getEngagementColor = (score) => {
    if (score >= 4.0) return 'text-green-600'
    if (score >= 3.0) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Grove Station Analytics</h2>
        <p className="text-muted-foreground">
          Performance metrics for the last 7 days
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div className="text-sm font-medium text-muted-foreground">Total Listeners</div>
            </div>
            <div className="text-2xl font-bold text-primary mt-2">
              {totalListeners.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg: {averageListeners}/hour
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div className="text-sm font-medium text-muted-foreground">Peak Listeners</div>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              {peakListeners}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Highest concurrent
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-600" />
              <div className="text-sm font-medium text-muted-foreground">Active DJs</div>
            </div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              {activeDJs}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Broadcasting regularly
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div className="text-sm font-medium text-muted-foreground">Scheduled Hours</div>
            </div>
            <div className="text-2xl font-bold text-purple-600 mt-2">
              {hoursWithContent}/24
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Content coverage
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Engagement Score</span>
              <Badge variant="outline" className={getEngagementColor(engagementScore)}>
                {engagementScore.toFixed(1)}/5.0
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Audio Quality</span>
              <Badge variant="outline" className={getEngagementColor(audioQualityScore)}>
                {audioQualityScore.toFixed(1)}/5.0
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Uptime</span>
              <Badge variant="outline" className="text-green-600">
                99.8%
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Stream Quality</span>
              <Badge variant="outline" className="text-blue-600">
                24kHz • PCM16
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Peak Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hourlyBreakdown
                .sort((a, b) => b.listeners - a.listeners)
                .slice(0, 5)
                .map((hour, index) => (
                  <div key={hour.hour} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-8 justify-center">
                        #{index + 1}
                      </Badge>
                      <span className="text-sm font-medium">{hour.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">
                        {hour.listeners} avg listeners
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            Hourly Listener Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between h-32 gap-1">
            {hourlyBreakdown.map((hour) => (
              <div key={hour.hour} className="flex flex-col items-center flex-1">
                <div 
                  className="bg-primary/20 rounded-t w-full transition-all hover:bg-primary/30"
                  style={{ height: `${getBarHeight(hour.listeners)}%` }}
                  title={`${hour.label}: ${hour.listeners} avg listeners`}
                />
                <div className="text-xs text-muted-foreground mt-1 transform -rotate-45 origin-top-left">
                  {hour.hour % 4 === 0 ? hour.label : ''}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Average listeners by hour (hover for details)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.slice(0, 5).map((stat, index) => (
                <div key={stat.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {new Date(stat.created_at).toLocaleDateString()}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">
                        Hour {stat.hour_slot}:00
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stat.total_listeners} listeners • Peak: {stat.peak_listeners}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-primary">
                      {stat.engagement_score?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Engagement
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}