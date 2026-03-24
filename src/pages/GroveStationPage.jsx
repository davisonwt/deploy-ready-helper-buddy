import React, { useState, useEffect } from 'react'
import { useGroveStation } from '@/hooks/useGroveStation'
import { LiveStreamListener } from '@/components/radio/LiveStreamListener'
import ListenerInteractions from '@/components/radio/ListenerInteractions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio, Mic, Calendar, Users, Volume2, Clock, Star,
  MessageSquare, Headphones, Music, ListMusic, Zap,
  ChevronDown, ChevronUp, Play, TrendingUp, Plus, X
} from 'lucide-react'
import { CreateDJProfileForm } from '@/components/radio/CreateDJProfileForm'
import { EnhancedScheduleShowForm } from '@/components/radio/EnhancedScheduleShowForm'
import { LiveStreamInterface } from '@/components/radio/LiveStreamInterface'
import { RadioScheduleGrid } from '@/components/radio/RadioScheduleGrid'
import { StationStats } from '@/components/radio/StationStats'
import { UniversalLiveSessionInterface } from '@/components/live/UniversalLiveSessionInterface'
import { DJAchievements } from '@/components/radio/DJAchievements'
import { DJLeaderboard } from '@/components/radio/DJLeaderboard'
import { BroadcastHistory } from '@/components/radio/BroadcastHistory'
import { DJSeedRequestQueue } from '@/components/radio/SeedRequestQueue'
import DJMusicLibrary from '@/components/radio/DJMusicLibrary'
import DJPlaylistManager from '@/components/radio/DJPlaylistManager'
import AutomatedSessionScheduler from '@/components/radio/AutomatedSessionScheduler'
import { getCurrentTheme } from '@/utils/dashboardThemes'

// Compact feed card wrapper
function FeedCard({ children, theme, className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`rounded-2xl border backdrop-blur-sm overflow-hidden ${className}`}
      style={{
        backgroundColor: theme.cardBg,
        borderColor: theme.cardBorder,
        boxShadow: `0 4px 24px ${theme.shadow}`,
      }}
    >
      {children}
    </motion.div>
  )
}

// Collapsible section
function CollapsibleFeedCard({ title, icon: Icon, theme, children, defaultOpen = false, delay = 0 }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <FeedCard theme={theme} delay={delay}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-left"
        style={{ color: theme.textPrimary }}
      >
        <span className="flex items-center gap-2 font-semibold text-sm">
          <Icon className="h-4 w-4" style={{ color: theme.accent }} />
          {title}
        </span>
        {open ? <ChevronUp className="h-4 w-4" style={{ color: theme.textSecondary }} /> : <ChevronDown className="h-4 w-4" style={{ color: theme.textSecondary }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </FeedCard>
  )
}

export default function GroveStationPage() {
  const {
    stationConfig, currentShow, schedule, djs, userDJProfile,
    stats, loading, isDJ, canGoLive, liveSession,
    updateShowStatus, submitFeedback, fetchCurrentShow
  } = useGroveStation()

  const [theme, setTheme] = useState(getCurrentTheme())
  const [showCreateDJ, setShowCreateDJ] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [showLiveInterface, setShowLiveInterface] = useState(false)
  const [showDJPanel, setShowDJPanel] = useState(false)
  const [djPanelTab, setDjPanelTab] = useState('music')

  // Rotate theme every 2 hours
  useEffect(() => {
    const interval = setInterval(() => setTheme(getCurrentTheme()), 60000)
    return () => clearInterval(interval)
  }, [])

  const handleScheduleSelect = async (scheduleId) => {
    if (!scheduleId) return
    const url = new URL(window.location.href)
    url.searchParams.set('schedule', scheduleId)
    window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`)
    await fetchCurrentShow(scheduleId)
  }

  const handleGoLive = async () => {
    if (canGoLive && currentShow) {
      await updateShowStatus(currentShow.schedule_id, 'live')
      setShowLiveInterface(true)
    }
  }

  if (loading && !stationConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.background }}>
        <div className="flex flex-col items-center gap-3">
          <Radio className="h-10 w-10 animate-pulse" style={{ color: theme.accent }} />
          <p className="text-sm" style={{ color: theme.textSecondary }}>Tuning in...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen transition-all duration-1000" style={{ background: theme.background }}>
      {/* ─── Sticky Player Header ─── */}
      <div
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          backgroundColor: `${theme.cardBg}`,
          borderColor: theme.cardBorder,
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: theme.primaryButton }}
                >
                  <Radio className="h-5 w-5 text-white" />
                </div>
                {currentShow?.is_live && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2" style={{ borderColor: theme.cardBg }} />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold truncate" style={{ color: theme.textPrimary }}>
                  {stationConfig?.station_name || 'Covenant Radio 364YHVH fm'}
                </h1>
                <p className="text-xs truncate" style={{ color: theme.textSecondary }}>
                  {currentShow
                    ? "364yhvh / s2g community member's music"
                    : stationConfig?.station_tagline || 'Where eternal wisdom meets bold voices'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {currentShow && (
                <Badge
                  className="text-[10px] px-2 py-0.5 border-0 font-bold"
                  style={{
                    background: currentShow.is_live ? 'rgba(239,68,68,0.9)' : theme.secondaryButton,
                    color: currentShow.is_live ? '#fff' : theme.textPrimary,
                  }}
                >
                  {currentShow.is_live ? '🔴 LIVE' : currentShow.broadcast_mode === 'pre_recorded' ? '📻 AUTO' : '📅 NEXT'}
                </Badge>
              )}
              {currentShow?.listener_count > 0 && (
                <span className="text-xs flex items-center gap-1" style={{ color: theme.textSecondary }}>
                  <Headphones className="h-3 w-3" /> {currentShow.listener_count}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Feed Content ─── */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-28">

        {/* Now Playing / Player */}
        {currentShow && (
          <FeedCard theme={theme} delay={0}>
            <div className="p-4">
              <LiveStreamListener
                liveSession={liveSession}
                currentShow={currentShow}
              />
            </div>
          </FeedCard>
        )}

        {/* Live Interaction Feed (if live) */}
        {currentShow && liveSession && currentShow.is_live && (
          <FeedCard theme={theme} delay={0.1}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4" style={{ color: theme.accent }} />
                <span className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Live Chat</span>
              </div>
              <UniversalLiveSessionInterface
                sessionData={{ id: liveSession.id, title: currentShow?.show_name || 'Live Radio Session', ...liveSession }}
                sessionType="radio"
                currentUser={null}
                isHost={false}
              />
            </div>
          </FeedCard>
        )}

        {/* Listener Interactions (comments/requests when not fully live) */}
        {currentShow && !liveSession && (
          <FeedCard theme={theme} delay={0.1}>
            <div className="p-4">
              <ListenerInteractions />
            </div>
          </FeedCard>
        )}

        {/* No Show — Welcome Card */}
        {!currentShow && (
          <FeedCard theme={theme} delay={0}>
            <div className="p-8 text-center">
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{ background: theme.secondaryButton }}
              >
                <Radio className="h-10 w-10 animate-pulse" style={{ color: theme.accent }} />
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: theme.textPrimary }}>24/7 Community Radio</h3>
              <p className="text-sm mb-2" style={{ color: theme.textSecondary }}>
                {stationConfig?.station_description || 'Broadcasting from the Ancient of Days'}
              </p>
              <p className="text-xs" style={{ color: theme.textSecondary }}>Check the schedule below or browse our DJs.</p>
            </div>
          </FeedCard>
        )}

        {/* Rate This Show */}
        {currentShow && (
          <FeedCard theme={theme} delay={0.15}>
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: theme.textSecondary }}>Rate this show</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => submitFeedback(currentShow.schedule_id, { rating })}
                    className="p-1.5 rounded-lg transition-colors hover:scale-110"
                    style={{ color: theme.accent }}
                  >
                    <Star className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </FeedCard>
        )}

        {/* DJs — Compact Horizontal Scroll */}
        <FeedCard theme={theme} delay={0.2}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.textPrimary }}>
                <Users className="h-4 w-4" style={{ color: theme.accent }} />
                AOD Station DJs
              </span>
              {!isDJ && (
                <Button
                  size="sm"
                  className="text-xs h-7 px-3 rounded-full border-0"
                  style={{ background: theme.primaryButton, color: '#fff' }}
                  onClick={() => setShowCreateDJ(true)}
                >
                  <Mic className="h-3 w-3 mr-1" /> Become DJ
                </Button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {djs.map((dj) => (
                <div
                  key={dj.id}
                  className="flex flex-col items-center gap-1.5 min-w-[72px] p-2 rounded-xl transition-colors"
                  style={{ backgroundColor: theme.secondaryButton }}
                >
                  <Avatar className="h-10 w-10 ring-2" style={{ '--tw-ring-color': theme.accent }}>
                    <AvatarImage src={dj.avatar_url} />
                    <AvatarFallback className="text-xs" style={{ backgroundColor: theme.secondaryButton, color: theme.textPrimary }}>
                      {dj.dj_name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] font-medium text-center truncate w-full" style={{ color: theme.textPrimary }}>
                    {dj.dj_name}
                  </span>
                  <div className="flex items-center gap-1 text-[9px]" style={{ color: theme.textSecondary }}>
                    <Star className="h-2.5 w-2.5" /> {dj.rating || '5.0'}
                  </div>
                </div>
              ))}
              {djs.length === 0 && (
                <p className="text-xs py-4 w-full text-center" style={{ color: theme.textSecondary }}>No DJs yet — be the first!</p>
              )}
            </div>
          </div>
        </FeedCard>

        {/* Schedule — Collapsible */}
        <CollapsibleFeedCard title="Today's Schedule" icon={Calendar} theme={theme} delay={0.25}>
          <RadioScheduleGrid schedule={schedule} onSelectSchedule={handleScheduleSelect} />
          {isDJ && (
            <Button
              className="mt-3 w-full text-xs rounded-xl border-0"
              style={{ background: theme.primaryButton, color: '#fff' }}
              onClick={() => setShowScheduleForm(true)}
            >
              <Calendar className="h-3 w-3 mr-1.5" /> Book Time Slot
            </Button>
          )}
        </CollapsibleFeedCard>

        {/* Station Stats — Collapsible */}
        <CollapsibleFeedCard title="Station Stats" icon={TrendingUp} theme={theme} delay={0.3}>
          <StationStats stats={stats} />
          <div className="mt-3">
            <DJLeaderboard />
          </div>
        </CollapsibleFeedCard>

        {/* DJ Control Panel — Only for DJs */}
        {isDJ && (
          <CollapsibleFeedCard title="DJ Control Panel" icon={Mic} theme={theme} defaultOpen={false} delay={0.35}>
            {showLiveInterface ? (
              <LiveStreamInterface
                djProfile={userDJProfile}
                currentShow={currentShow}
                onEndShow={() => setShowLiveInterface(false)}
              />
            ) : (
              <div className="space-y-4">
                {/* DJ Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3 text-center" style={{ backgroundColor: theme.secondaryButton }}>
                    <div className="text-lg font-bold" style={{ color: theme.accent }}>{userDJProfile?.total_hours_hosted || 0}</div>
                    <div className="text-[10px]" style={{ color: theme.textSecondary }}>Hours Hosted</div>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ backgroundColor: theme.secondaryButton }}>
                    <div className="text-lg font-bold" style={{ color: theme.accent }}>{userDJProfile?.rating || 5.0}</div>
                    <div className="text-[10px]" style={{ color: theme.textSecondary }}>Rating</div>
                  </div>
                </div>

                {/* Go Live */}
                {canGoLive && (
                  <Button
                    onClick={handleGoLive}
                    className="w-full rounded-xl border-0 font-semibold"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', color: '#fff' }}
                  >
                    <Mic className="h-4 w-4 mr-2" /> Go Live Now
                  </Button>
                )}

                {/* DJ Sub-tabs */}
                <Tabs value={djPanelTab} onValueChange={setDjPanelTab}>
                  <TabsList className="grid w-full grid-cols-4 bg-transparent gap-1">
                    {[
                      { v: 'music', icon: Music, label: 'Music' },
                      { v: 'playlists', icon: ListMusic, label: 'Lists' },
                      { v: 'history', icon: Clock, label: 'History' },
                      { v: 'auto', icon: Zap, label: 'Auto' },
                    ].map(({ v, icon: I, label }) => (
                      <TabsTrigger
                        key={v}
                        value={v}
                        className="text-[10px] py-1.5 rounded-lg data-[state=active]:shadow-none"
                        style={{
                          backgroundColor: djPanelTab === v ? theme.secondaryButton : 'transparent',
                          color: djPanelTab === v ? theme.accent : theme.textSecondary,
                        }}
                      >
                        <I className="h-3 w-3 mr-1" />{label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value="music"><DJMusicLibrary /></TabsContent>
                  <TabsContent value="playlists"><DJPlaylistManager /></TabsContent>
                  <TabsContent value="history"><BroadcastHistory djId={userDJProfile?.id} /></TabsContent>
                  <TabsContent value="auto"><AutomatedSessionScheduler /></TabsContent>
                </Tabs>

                {/* Seed Requests if live */}
                {liveSession && (
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-2" style={{ color: theme.textPrimary }}>Song Requests</p>
                    <DJSeedRequestQueue sessionId={liveSession.id} />
                  </div>
                )}

                {/* Achievements */}
                <DJAchievements djId={userDJProfile?.id} />
              </div>
            )}
          </CollapsibleFeedCard>
        )}

        {/* Become a DJ CTA (non-DJs) */}
        {!isDJ && (
          <FeedCard theme={theme} delay={0.35}>
            <div className="p-6 text-center">
              <div
                className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3"
                style={{ background: theme.secondaryButton }}
              >
                <Mic className="h-7 w-7" style={{ color: theme.accent }} />
              </div>
              <h3 className="text-sm font-bold mb-1" style={{ color: theme.textPrimary }}>Share Your Voice</h3>
              <p className="text-xs mb-3" style={{ color: theme.textSecondary }}>
                Become an AOD Station DJ and host your own shows!
              </p>
              <Button
                className="rounded-xl border-0 text-xs"
                style={{ background: theme.primaryButton, color: '#fff' }}
                onClick={() => setShowCreateDJ(true)}
              >
                Create DJ Profile
              </Button>
            </div>
          </FeedCard>
        )}
      </div>

      {/* ─── FAB for DJ Actions ─── */}
      {isDJ && (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 items-end">
          {showDJPanel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col gap-2"
            >
              <Button
                size="sm"
                className="rounded-full shadow-lg border-0 text-xs"
                style={{ background: theme.primaryButton, color: '#fff' }}
                onClick={() => setShowScheduleForm(true)}
              >
                <Calendar className="h-3 w-3 mr-1.5" /> Book Slot
              </Button>
              {canGoLive && (
                <Button
                  size="sm"
                  className="rounded-full shadow-lg border-0 text-xs"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', color: '#fff' }}
                  onClick={handleGoLive}
                >
                  <Mic className="h-3 w-3 mr-1.5" /> Go Live
                </Button>
              )}
            </motion.div>
          )}
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-xl border-0"
            style={{ background: theme.primaryButton, color: '#fff' }}
            onClick={() => setShowDJPanel(p => !p)}
          >
            {showDJPanel ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </Button>
        </div>
      )}

      {/* ─── Modals ─── */}
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
  )
}
