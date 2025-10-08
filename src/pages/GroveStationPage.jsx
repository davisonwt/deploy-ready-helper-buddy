import React, { useState } from 'react'
import { useGroveStation } from '@/hooks/useGroveStation'
import RadioListenerInterface from '@/components/radio/RadioListenerInterface'
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
  Headphones,
  Globe,
  Music,
  ListMusic,
  Zap
} from 'lucide-react'
import { CreateDJProfileForm } from '@/components/radio/CreateDJProfileForm'
import { EnhancedScheduleShowForm } from '@/components/radio/EnhancedScheduleShowForm'
import { LiveStreamInterface } from '@/components/radio/LiveStreamInterface'
import { LiveStreamListener } from '@/components/radio/LiveStreamListener'
import { RadioScheduleGrid } from '@/components/radio/RadioScheduleGrid'
import { StationStats } from '@/components/radio/StationStats'
import TimezoneSlotAssignment from '@/components/radio/TimezoneSlotAssignment'
import GlobalDJScheduler from '@/components/radio/GlobalDJScheduler'
import DJMusicLibrary from '@/components/radio/DJMusicLibrary'
import DJPlaylistManager from '@/components/radio/DJPlaylistManager'
import AutomatedSessionScheduler from '@/components/radio/AutomatedSessionScheduler'

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
    liveSession,
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto py-6 space-y-6">
        {/* Compact Station Header */}
        <Card className="border-2 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
                    <Radio className="h-7 w-7 text-primary-foreground" />
                  </div>
                  {isPlaying && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{stationConfig?.station_name || 'The Set-Apart Heretics AOD Frequencies'}</h1>
                  <p className="text-sm text-muted-foreground">{stationConfig?.station_tagline || 'Where eternal wisdom meets bold voices'}</p>
                </div>
              </div>
              
              {/* Quick Play Button */}
              <Button
                variant={isPlaying ? "default" : "outline"}
                size="lg"
                onClick={handlePlayPause}
                className="gap-2"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-5 w-5" />
                    Pause Stream
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Start Listening
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Prominent Tab Navigation */}
        <Card className="border-2 shadow-xl">
          <Tabs defaultValue="listen" className="w-full">
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-3 rounded-t-lg">
              <TabsList className="grid w-full grid-cols-5 h-auto bg-background/50 backdrop-blur-sm border border-border/50 shadow-lg p-1 rounded-xl">
                <TabsTrigger 
                  value="listen" 
                  className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-lg transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-green-500/50 hover:bg-muted/50"
                >
                  <Headphones className="h-6 w-6" />
                  <span className="text-xs font-bold">Listen Now</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="schedule"
                  className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-lg transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-500/50 hover:bg-muted/50"
                >
                  <Calendar className="h-6 w-6" />
                  <span className="text-xs font-bold">Schedule</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="djs"
                  className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-lg transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-purple-500/50 hover:bg-muted/50"
                >
                  <Users className="h-6 w-6" />
                  <span className="text-xs font-bold">Our DJs</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="broadcast" 
                  disabled={!isDJ}
                  className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-lg transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-red-500/50 hover:bg-muted/50 disabled:opacity-40 disabled:hover:scale-100"
                >
                  <Mic className="h-6 w-6" />
                  <span className="text-xs font-bold">Go Live</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="stats"
                  className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-lg transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-amber-500/50 hover:bg-muted/50"
                >
                  <TrendingUp className="h-6 w-6" />
                  <span className="text-xs font-bold">Stats</span>
                </TabsTrigger>
              </TabsList>
            </div>

          {/* Listen Tab */}
          <TabsContent value="listen" className="space-y-6 p-6 bg-card">
            {currentShow && (
              <LiveStreamListener 
                liveSession={liveSession}
                currentShow={currentShow}
              />
            )}
            
            {/* Listener Interface for Messages and Call-ins */}
            {currentShow && liveSession && currentShow.is_live && (
              <RadioListenerInterface 
                liveSession={liveSession}
                currentShow={currentShow}
              />
            )}

            {/* Show message when not live */}
            {currentShow && !liveSession && (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="space-y-2">
                    <Radio className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Show will be live soon. Messages and call-ins will be available once the host goes live.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {!currentShow && (
              <div className="text-center space-y-6 py-8">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center">
                  <Radio className="h-16 w-16 text-primary animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">24/7 Community Radio</h3>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    {stationConfig?.station_description || 'Broadcasting from the Ancient of Days - Your 24/7 community radio station for those who dare to be different'}
                  </p>
                </div>
                <div className="flex items-center gap-4 justify-center">
                  <Button size="lg" onClick={handlePlayPause} className="gap-2">
                    {isPlaying ? (
                      <>
                        <Pause className="h-5 w-5" />
                        Pause Stream
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5" />
                        Start Listening
                      </>
                    )}
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Volume2 className="h-4 w-4" />
                    <span>High Quality</span>
                  </div>
                </div>
              </div>
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
          <TabsContent value="schedule" className="space-y-6 p-6 bg-card">
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
            
            <div className="mt-8 space-y-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  🌍 Global Heretics Coverage Scheduler
                </h3>
                <p className="text-muted-foreground mb-4">
                  Manage worldwide 24/7 coverage by assigning heretics to their optimal daylight hours (6 AM - 8 PM local time).
                  Ensure listeners always have someone broadcasting during reasonable hours somewhere in the world.
                </p>
                <GlobalDJScheduler />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  📅 Multi-Timezone Slot Assignment
                </h3>
                <p className="text-muted-foreground mb-4">
                  Detailed scheduling interface with timezone conversion for specific date management.
                </p>
                <TimezoneSlotAssignment />
              </div>
            </div>
          </TabsContent>

          {/* DJs Tab */}
          <TabsContent value="djs" className="space-y-6 p-6 bg-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">AOD Station DJs</h2>
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
                          {dj.bio || 'AOD Station DJ'}
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
          <TabsContent value="broadcast" className="space-y-6 p-6 bg-card">
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
                  <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="profile">
                        <Mic className="h-4 w-4 mr-2" />
                        Profile
                      </TabsTrigger>
                      <TabsTrigger value="music">
                        <Music className="h-4 w-4 mr-2" />
                        Music Library
                      </TabsTrigger>
                      <TabsTrigger value="playlists">
                        <ListMusic className="h-4 w-4 mr-2" />
                        Playlists
                      </TabsTrigger>
                      <TabsTrigger value="automation">
                        <Zap className="h-4 w-4 mr-2" />
                        Automation
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-6">
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
                    </TabsContent>

                    <TabsContent value="music">
                      <DJMusicLibrary />
                    </TabsContent>

                    <TabsContent value="playlists">
                      <DJPlaylistManager />
                    </TabsContent>

                    <TabsContent value="automation">
                      <AutomatedSessionScheduler />
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Mic className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Become an AOD Station DJ</h3>
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
          <TabsContent value="stats" className="space-y-6 p-6 bg-card">
            <StationStats stats={stats} />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Help Text */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p>Use the tabs above to navigate between listening live, checking the schedule, meeting our DJs, broadcasting your own show, and viewing stats.</p>
      </div>

      {/* Modals */}
        {showCreateDJ && (
          <CreateDJProfileForm 
            open={showCreateDJ}
            onClose={() => setShowCreateDJ(false)}
          />
        )}

        {showScheduleForm && (
          <EnhancedScheduleShowForm
            open={showScheduleForm}
            onClose={() => setShowScheduleForm(false)}
            djProfile={userDJProfile}
          />
        )}
      </div>
    </div>
  )
}