import React, { useState } from 'react'
import { useGroveStation } from '@/hooks/useGroveStation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Radio, 
  Mic, 
  Calendar, 
  Users, 
  Play, 
  Pause, 
  Volume2,
  Clock,
  Star,
  MessageSquare,
  TrendingUp,
  Headphones
} from 'lucide-react'
import { CreateDJProfileForm } from '@/components/radio/CreateDJProfileForm'
import { ScheduleShowForm } from '@/components/radio/ScheduleShowForm'
import { LiveStreamInterface } from '@/components/radio/LiveStreamInterface'
import { LiveStreamListener } from '@/components/radio/LiveStreamListener'
import { RadioScheduleGrid } from '@/components/radio/RadioScheduleGrid'
import { StationStats } from '@/components/radio/StationStats'

export default function GroveStationPage() {
  const {
    stationConfig,
    currentShow,
    schedule,
    djs,
    userDJProfile,
    stats,
    loading,
    isDJ,
    canGoLive,
    updateShowStatus,
    submitFeedback
  } = useGroveStation()

  const [isPlaying, setIsPlaying] = useState(false)
  const [showCreateDJ, setShowCreateDJ] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [showLiveInterface, setShowLiveInterface] = useState(false)

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
    // TODO: Implement actual audio streaming
  }

  const handleGoLive = async () => {
    if (canGoLive && currentShow) {
      await updateShowStatus(currentShow.schedule_id, 'live')
      setShowLiveInterface(true)
    }
  }

  if (loading && !stationConfig) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
        {/* Station Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <Radio className="h-12 w-12 text-primary" />
              {isPlaying && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold">{stationConfig?.station_name || 'Grove Station'}</h1>
              <p className="text-muted-foreground">{stationConfig?.station_tagline}</p>
            </div>
          </div>
          
          {/* Now Playing / Station Status */}
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              {currentShow ? (
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={currentShow.dj_avatar} />
                    <AvatarFallback>
                      <Mic className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={currentShow.is_live ? "default" : "secondary"}>
                        {currentShow.is_live ? "🔴 LIVE" : "📅 Scheduled"}
                      </Badge>
                      <Badge variant="outline">{currentShow.category}</Badge>
                    </div>
                    <h3 className="font-semibold text-lg">{currentShow.show_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      with {currentShow.dj_name} • {currentShow.listener_count || 0} listeners
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isPlaying ? "default" : "outline"}
                      size="lg"
                      onClick={handlePlayPause}
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      {isPlaying ? "Pause" : "Listen"}
                    </Button>
                    <Volume2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <Radio className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Radio Host</h3>
                    <p className="text-sm text-muted-foreground">
                      Playing curated music and community updates
                    </p>
                  </div>
                  <Button variant="outline" onClick={handlePlayPause}>
                    <Headphones className="h-4 w-4 mr-2" />
                    Tune In
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Interface */}
        <Tabs defaultValue="listen" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="listen">
              <Headphones className="h-4 w-4 mr-2" />
              Listen
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="djs">
              <Users className="h-4 w-4 mr-2" />
              DJs
            </TabsTrigger>
            <TabsTrigger value="broadcast" disabled={!isDJ}>
              <Mic className="h-4 w-4 mr-2" />
              Broadcast
            </TabsTrigger>
            <TabsTrigger value="stats">
              <TrendingUp className="h-4 w-4 mr-2" />
              Stats
            </TabsTrigger>
          </TabsList>

          {/* Listen Tab */}
          <TabsContent value="listen" className="space-y-6">
            {currentShow ? (
              <LiveStreamListener 
                liveSession={currentShow.liveSession}
                currentShow={currentShow}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="h-5 w-5" />
                    Grove Station Player
                  </CardTitle>
                  <CardDescription>
                    {stationConfig?.station_description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                        <Radio className="h-12 w-12 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Grove Station</h3>
                        <p className="text-muted-foreground">24/7 Community Radio</p>
                      </div>
                      <div className="flex items-center gap-4 justify-center">
                        <Button size="lg" onClick={handlePlayPause}>
                          {isPlaying ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                          {isPlaying ? "Pause Stream" : "Play Stream"}
                        </Button>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Volume2 className="h-4 w-4" />
                          <span>High Quality Stream</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feedback Section */}
            {currentShow && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Rate This Show
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        variant="ghost"
                        size="sm"
                        onClick={() => submitFeedback(currentShow.schedule_id, { rating })}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">24/7 Schedule</h2>
                <p className="text-muted-foreground">See what's playing when</p>
              </div>
              {isDJ && (
                <Button onClick={() => setShowScheduleForm(true)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Time Slot
                </Button>
              )}
            </div>
            <RadioScheduleGrid schedule={schedule} />
          </TabsContent>

          {/* DJs Tab */}
          <TabsContent value="djs" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Grove Station DJs</h2>
                <p className="text-muted-foreground">Meet our amazing broadcasters</p>
              </div>
              {!isDJ && (
                <Button onClick={() => setShowCreateDJ(true)}>
                  <Mic className="h-4 w-4 mr-2" />
                  Become a DJ
                </Button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {djs.map((dj) => (
                <Card key={dj.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={dj.avatar_url} />
                        <AvatarFallback>
                          {dj.dj_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{dj.dj_name}</h3>
                          <Badge variant="outline" size="sm">{dj.dj_role}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {dj.bio || 'Grove Station DJ'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {dj.total_hours_hosted || 0}h
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {dj.rating || 5.0}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Broadcast Tab (DJ Only) */}
          <TabsContent value="broadcast" className="space-y-6">
            {isDJ ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">DJ Control Panel</h2>
                    <p className="text-muted-foreground">
                      Welcome back, {userDJProfile?.dj_name}!
                    </p>
                  </div>
                  {canGoLive && (
                    <Button onClick={handleGoLive} size="lg">
                      <Mic className="h-4 w-4 mr-2" />
                      Go Live
                    </Button>
                  )}
                </div>

                {showLiveInterface ? (
                  <LiveStreamInterface 
                    djProfile={userDJProfile}
                    currentShow={currentShow}
                    onEndShow={() => setShowLiveInterface(false)}
                  />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Your Profile</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={userDJProfile?.avatar_url} />
                            <AvatarFallback>
                              <Mic className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{userDJProfile?.dj_name}</h3>
                            <Badge variant="outline">{userDJProfile?.dj_role}</Badge>
                          </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-primary">
                              {userDJProfile?.total_hours_hosted || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Hours Hosted</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-primary">
                              {userDJProfile?.rating || 5.0}
                            </div>
                            <div className="text-xs text-muted-foreground">Rating</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button 
                          onClick={() => setShowScheduleForm(true)}
                          className="w-full justify-start"
                          variant="outline"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule New Show
                        </Button>
                        <Button 
                          disabled={!canGoLive}
                          onClick={handleGoLive}
                          className="w-full justify-start"
                        >
                          <Mic className="h-4 w-4 mr-2" />
                          {canGoLive ? "Go Live Now" : "No Scheduled Shows"}
                        </Button>
                        <Button 
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          View Feedback
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Mic className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Become a Grove Station DJ</h3>
                  <p className="text-muted-foreground mb-4">
                    Share your voice with the community and host your own shows!
                  </p>
                  <Button onClick={() => setShowCreateDJ(true)}>
                    Create DJ Profile
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <StationStats stats={stats} />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {showCreateDJ && (
          <CreateDJProfileForm 
            open={showCreateDJ}
            onClose={() => setShowCreateDJ(false)}
          />
        )}

        {showScheduleForm && (
          <ScheduleShowForm
            open={showScheduleForm}
            onClose={() => setShowScheduleForm(false)}
            djProfile={userDJProfile}
          />
        )}
      </div>
  )
}