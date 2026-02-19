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
import { UniversalLiveSessionInterface } from '@/components/live/UniversalLiveSessionInterface'
import { DJAchievements } from '@/components/radio/DJAchievements'
import { DJLeaderboard } from '@/components/radio/DJLeaderboard'
import { BroadcastHistory } from '@/components/radio/BroadcastHistory'
import { DJSeedRequestQueue } from '@/components/radio/SeedRequestQueue'
import { NowPlayingWidget } from '@/components/radio/NowPlayingWidget'

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
    <div className="min-h-screen bg-gradient-to-br from-amber-950/10 via-background to-green-950/10 dark:from-amber-950/20 dark:via-background dark:to-green-950/20">
      <div className="container mx-auto py-6 space-y-6">
        {/* Compact Station Header - Earthy Theme */}
        <Card className="border-2 border-amber-500/30 shadow-lg bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-green-50/30 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-green-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-600 to-green-700 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Radio className="h-7 w-7 text-white" />
                  </div>
                  {isPlaying && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-green-800 dark:from-amber-400 dark:to-green-400 bg-clip-text text-transparent">
                    {stationConfig?.station_name || 'The Set-Apart Heretics AOD Frequencies'}
                  </h1>
                  <p className="text-sm text-muted-foreground">{stationConfig?.station_tagline || 'Where eternal wisdom meets bold voices'}</p>
                </div>
              </div>
              
              {/* Quick Play Button */}
              <Button
                variant={isPlaying ? "default" : "outline"}
                size="lg"
                onClick={handlePlayPause}
                className="gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl border-0 shadow-lg shadow-amber-500/20"
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

            {/* Now Playing Widget - shown when playing */}
            {isPlaying && currentShow && (
              <div className="mt-4">
                <NowPlayingWidget
                  trackTitle={currentShow?.show_name}
                  artistName={currentShow?.dj_name}
                  isPlaying={isPlaying}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prominent Tab Navigation */}
        <Card className="border-2 border-amber-500/20 shadow-xl">
          <Tabs defaultValue="listen" className="w-full">
            <div className="p-6">
              <TabsList className="w-full h-auto bg-transparent grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {/* First Row - 3 buttons */}
                <TabsTrigger 
                  value="listen" 
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold transition-all duration-200 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
                >
                  <Headphones className="h-5 w-5" />
                  <span>Listen Now</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="schedule"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold transition-all duration-200 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-700 data-[state=active]:text-white data-[state=active]:shadow-lg bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/30 dark:hover:bg-orange-950/50"
                >
                  <Calendar className="h-5 w-5" />
                  <span>Schedule</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="djs"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold transition-all duration-200 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-700 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg bg-green-100 hover:bg-green-200 dark:bg-green-950/30 dark:hover:bg-green-950/50"
                >
                  <Users className="h-5 w-5" />
                  <span>Our DJs</span>
                </TabsTrigger>
                
                {/* Second Row - 2 buttons centered */}
                <TabsTrigger 
                  value="broadcast" 
                  disabled={!isDJ}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold transition-all duration-200 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg bg-red-100 hover:bg-red-200 dark:bg-red-950/30 dark:hover:bg-red-950/50 disabled:opacity-40 disabled:hover:scale-100 col-start-1 col-end-2"
                >
                  <Mic className="h-5 w-5" />
                  <span>Go Live</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="stats"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold transition-all duration-200 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-800 data-[state=active]:to-green-800 data-[state=active]:text-white data-[state=active]:shadow-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 col-start-2 col-end-3"
                >
                  <TrendingUp className="h-5 w-5" />
                  <span>Stats</span>
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

            {currentShow && liveSession && (
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Live Interaction Feed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <UniversalLiveSessionInterface
                    sessionData={{ id: liveSession.id, title: currentShow?.show_name || 'Live Radio Session', ...liveSession }}
                    sessionType="radio"
                    currentUser={null}
                    isHost={false}
                  />
                </CardContent>
              </Card>
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
                  <Button size="lg" onClick={handlePlayPause} className="gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl border-0 shadow-lg">
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
                        className="hover:bg-blue-100 rounded-xl"
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
                <Button onClick={() => setShowScheduleForm(true)} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl border-0">
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
                <Button onClick={() => setShowCreateDJ(true)} className="bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-800 hover:to-emerald-700 text-white rounded-xl border-0">
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
                    <Button onClick={handleGoLive} size="lg" className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl border-0 shadow-lg">
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
                    <TabsList className="grid w-full grid-cols-7">
                      <TabsTrigger value="profile">
                        <Mic className="h-4 w-4 mr-2" />
                        Profile
                      </TabsTrigger>
                      <TabsTrigger value="achievements">
                        <Star className="h-4 w-4 mr-2" />
                        Badges
                      </TabsTrigger>
                      <TabsTrigger value="history">
                        <Clock className="h-4 w-4 mr-2" />
                        History
                      </TabsTrigger>
                      <TabsTrigger value="music">
                        <Music className="h-4 w-4 mr-2" />
                        Music
                      </TabsTrigger>
                      <TabsTrigger value="playlists">
                        <ListMusic className="h-4 w-4 mr-2" />
                        Playlists
                      </TabsTrigger>
                      <TabsTrigger value="requests">
                        <ListMusic className="h-4 w-4 mr-2" />
                        Requests
                      </TabsTrigger>
                      <TabsTrigger value="automation">
                        <Zap className="h-4 w-4 mr-2" />
                        Auto
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
                              className="w-full justify-start bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 rounded-xl"
                              variant="outline"
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule New Show
                            </Button>
                            <Button 
                              disabled={!canGoLive}
                              onClick={handleGoLive}
                              className="w-full justify-start bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl border-0"
                            >
                              <Mic className="h-4 w-4 mr-2" />
                              {canGoLive ? "Go Live Now" : "No Scheduled Shows"}
                            </Button>
                            <Button 
                              variant="ghost"
                              className="w-full justify-start hover:bg-amber-100 dark:hover:bg-amber-950/30 text-amber-900 dark:text-amber-300 rounded-xl"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              View Feedback
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="achievements" className="space-y-6">
                      <DJAchievements djId={userDJProfile?.id} />
                      <DJLeaderboard />
                    </TabsContent>

                    <TabsContent value="history">
                      <BroadcastHistory djId={userDJProfile?.id} />
                    </TabsContent>

                    <TabsContent value="requests">
                      {liveSession ? (
                        <DJSeedRequestQueue sessionId={liveSession.id} />
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <ListMusic className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Song requests will appear here when you're live.</p>
                        </div>
                      )}
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
                  <Button onClick={() => setShowCreateDJ(true)} className="bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-800 hover:to-emerald-700 text-white rounded-xl border-0">
                    Create DJ Profile
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6 p-6 bg-card">
            <StationStats stats={stats} />
            <DJLeaderboard />
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