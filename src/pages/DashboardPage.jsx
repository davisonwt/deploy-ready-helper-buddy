import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import SunCalc from 'suncalc';
import { MessageCircle, Video, Sprout } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useBestowals } from '../hooks/useBestowals.jsx';
import { Button } from '@/components/ui/button';
import { supabase } from "@/integrations/supabase/client";
import { getCreatorTime } from '@/utils/customTime';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { getDayInfo } from '@/utils/sacredCalendar';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { AppShell } from '@/components/layout/AppShell';
import { HomeFeed } from '@/components/feed/HomeFeed';
import { PrivateChatsDrawer } from '@/components/chat/PrivateChatsDrawer';
import { PlantModal } from '@/components/grove/PlantModal';
import { useQuery } from '@tanstack/react-query';
import { CreateClassroomDialog } from '@/components/communication/CreateClassroomDialog';
import { ScheduleSkillDropDialog } from '@/components/communication/ScheduleSkillDropDialog';
import { CreateTrainingDialog } from '@/components/communication/CreateTrainingDialog';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [communityUnread, setCommunityUnread] = useState(0);
  const { user, loading: authLoading } = useAuth();
  const [orchards, setOrchards] = useState([]);
  const [orchardsLoading, setOrchardsLoading] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [plantModalOpen, setPlantModalOpen] = useState(false);
  const [classroomDialogOpen, setClassroomDialogOpen] = useState(false);
  const [skillDropDialogOpen, setSkillDropDialogOpen] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);

  const fetchOrchards = async (filters = {}) => {
    try {
      setOrchardsLoading(true);
      let query = supabase.from('orchards').select(`*`).eq('status', 'active').order('created_at', { ascending: false });
      if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
      if (filters.search) query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setOrchards(data || []);
    } catch (err) {
      console.error('Dashboard: Error fetching orchards:', err);
    } finally {
      setOrchardsLoading(false);
    }
  };

  const { getUserBestowals, loading: bestowalsLoading } = useBestowals();
  const [userOrchards, setUserOrchards] = useState([]);
  const [userBestowals, setUserBestowals] = useState([]);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalOrchards: 0, totalBestowals: 0, totalRaised: 0,
    totalSupported: 0, totalFollowers: 0, newFollowers: 0
  });
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [error, setError] = useState(null);

  const [userLat, setUserLat] = useState(-26.2);
  const [userLon, setUserLon] = useState(28.0);
  const [calendarData, setCalendarData] = useState(null);

  // Community count
  const { data: communityCount } = useQuery({
    queryKey: ['community-count'],
    queryFn: async () => {
      const { count } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true });
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const updateCalendarData = () => {
      const now = new Date();
      const creatorDate = calculateCreatorDate(now, userLat, userLon);
      const creatorTime = getCreatorTime(now, userLat, userLon);
      const dayInfo = getDayInfo(creatorDate.dayOfYear);
      setCalendarData({
        year: creatorDate.year, month: creatorDate.month,
        dayOfMonth: creatorDate.day, weekday: creatorDate.weekDay,
        part: creatorTime.part, dayOfYear: creatorDate.dayOfYear,
        season: dayInfo.isFeast ? dayInfo.feastName || 'Feast Day' : creatorDate.weekDay === 7 ? 'Sabbath Day' : 'Regular Day',
      });
    };
    updateCalendarData();
    const interval = setInterval(updateCalendarData, 60000);
    return () => clearInterval(interval);
  }, [userLat, userLon]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLat(pos.coords.latitude);
        setUserLon(pos.coords.longitude);
      }, () => {});
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = async () => {
      try {
        const { data: roomId } = await supabase.rpc('get_or_create_community_room');
        if (!roomId) return;
        const { data: participant } = await supabase
          .from('chat_participants').select('last_read_at')
          .eq('room_id', roomId).eq('user_id', user.id).single();
        const lastRead = participant?.last_read_at || '1970-01-01T00:00:00Z';
        const { count } = await supabase
          .from('chat_messages').select('*', { count: 'exact', head: true })
          .eq('room_id', roomId).gt('created_at', lastRead).neq('sender_id', user.id);
        setCommunityUnread(count || 0);
      } catch (err) { console.error('Error fetching community unread:', err); }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (user && !authLoading) {
      setError(null);
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase.from('profiles')
            .select('id, user_id, display_name, first_name, last_name, avatar_url, bio, location, timezone, preferred_currency, verification_status, has_complete_billing_info, website, tiktok_url, instagram_url, facebook_url, twitter_url, youtube_url, show_social_media, country, is_chatapp_verified, username, created_at, updated_at, suspended')
            .eq('user_id', user.id).maybeSingle();
          if (error && error.code !== 'PGRST116') setError(`Failed to load profile: ${error.message}`);
          else setProfile(data);
        } catch (error) { setError(`Failed to load profile: ${error?.message}`); }
      };
      const fetchData = async () => { try { await fetchOrchards(); } catch { setError('Failed to load orchards'); } };
      const fetchUserBestowals = async () => {
        try {
          const result = await getUserBestowals();
          if (result.success) setUserBestowals(result.data);
        } catch { setUserBestowals([]); }
      };
      const fetchFollowerStats = async () => {
        if (!user?.id) return;
        try {
          const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const { data: followers } = await supabase.from('followers').select('id').eq('following_id', user.id);
          const { data: newFollowers } = await supabase.from('followers').select('id').eq('following_id', user.id).gte('created_at', sevenDaysAgo.toISOString());
          setStats(prev => ({ ...prev, totalFollowers: followers?.length || 0, newFollowers: newFollowers?.length || 0 }));
        } catch (error) { console.error('Error fetching follower stats:', error); }
      };
      const fetchUnreadMessages = async () => {
        if (!user?.id) return;
        try {
          const { data: participantRooms } = await supabase
            .from('chat_participants').select('room_id, joined_at, last_read_at')
            .eq('user_id', user.id).eq('is_active', true);
          if (!participantRooms?.length) return;
          let totalUnread = 0;
          for (const room of participantRooms) {
            const since = room.last_read_at || room.joined_at;
            const { count } = await supabase
              .from('chat_messages').select('id', { count: 'exact', head: true })
              .eq('room_id', room.room_id).neq('sender_id', user.id).gt('created_at', since);
            totalUnread += (count || 0);
          }
          setUnreadMessages(totalUnread);
        } catch (error) { console.error('Error fetching unread messages:', error); }
      };
      Promise.all([fetchProfile(), fetchData(), fetchUserBestowals(), fetchFollowerStats(), fetchUnreadMessages()]).catch(() => setError('Failed to load dashboard data'));
    }
  }, [user, authLoading]);

  useEffect(() => {
    const userCreatedOrchards = orchards.filter(orchard => orchard.user_id === user?.id);
    setUserOrchards(userCreatedOrchards);
    const totalRaised = userCreatedOrchards.reduce((sum, orchard) => sum + (orchard.filled_pockets * orchard.pocket_price || 0), 0);
    setStats(prev => ({
      ...prev, totalOrchards: userCreatedOrchards.length, totalBestowals: userBestowals.length,
      totalRaised, totalSupported: userBestowals.reduce((sum, b) => sum + (b.amount || 0), 0)
    }));
  }, [orchards, userBestowals, user]);

  if (authLoading || orchardsLoading || bestowalsLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center bg-card rounded-2xl p-8 border border-border/30">
          <p className="mb-4 text-foreground">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const overlayRoot = typeof document !== 'undefined' ? document.body : null;

  return (
    <>
      <AppShell
        calendarData={calendarData}
        communityCount={communityCount || 0}
        hideGoLiveFAB
      >
        <div className="pb-28">
          <HomeFeed
            profile={profile}
            calendarData={calendarData}
            stats={stats}
            unreadMessages={unreadMessages}
          />
        </div>
      </AppShell>

      {overlayRoot && createPortal(
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 2147483647, isolation: 'isolate' }}
        >
          {/* Static bottom bar with Plant + Go Live + Chat */}
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
            style={{ zIndex: 1 }}
          >
            <div className="mx-auto grid w-full max-w-screen-md grid-cols-3 gap-3 px-4 py-3 pointer-events-none">
              <button
                onClick={() => setPlantModalOpen(true)}
                className="flex min-w-0 w-full items-center justify-center gap-2 rounded-full px-3 py-3 font-bold text-sm text-white shadow-lg pointer-events-auto"
                style={{
                  background: 'linear-gradient(135deg, #166534, #22c55e)',
                }}
              >
                <Sprout className="h-5 w-5" />
                Plant
              </button>
              <button
                onClick={() => setGoLiveOpen(!goLiveOpen)}
                className="flex min-w-0 w-full items-center justify-center gap-2 rounded-full px-3 py-3 font-bold text-sm text-white shadow-lg pointer-events-auto"
                style={{
                  background: 'linear-gradient(135deg, #dc2626, #f43f5e)',
                }}
              >
                <Video className="h-5 w-5" />
                Go Live
              </button>
              <button
                onClick={() => setChatDrawerOpen(true)}
                className="flex min-w-0 w-full items-center justify-center gap-2 rounded-full bg-primary px-3 py-3 font-bold text-sm text-primary-foreground shadow-lg pointer-events-auto"
              >
                <MessageCircle className="h-5 w-5" />
                Chat
              </button>
            </div>
          </div>

          {/* Go Live options panel */}
          {goLiveOpen && (
            <>
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                style={{ zIndex: 2 }}
                onClick={() => setGoLiveOpen(false)}
              />
              <div
                className="absolute bottom-20 left-1/2 -translate-x-1/2 w-56 space-y-2 pointer-events-auto"
                style={{ zIndex: 3 }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 px-1 mb-1">Go Live As…</p>
                {[
                  { action: () => setClassroomDialogOpen(true), label: 'Classroom', sublabel: 'Teach & mentor', icon: '🎓', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)' },
                  { action: () => setSkillDropDialogOpen(true), label: 'SkillDrop', sublabel: 'Share a skill', icon: '⚡', gradient: 'linear-gradient(135deg, #2563eb, #7c3aed)' },
                  { action: () => setTrainingDialogOpen(true), label: 'Training', sublabel: 'Lead a workout', icon: '💪', gradient: 'linear-gradient(135deg, #7c3aed, #db2777)' },
                  { action: () => navigate('/radio-slot-application'), label: 'Radio', sublabel: 'Go on air', icon: '📻', gradient: 'linear-gradient(135deg, #db2777, #ef4444)' },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => { setGoLiveOpen(false); opt.action(); }}
                    className="flex w-full items-center gap-3 rounded-2xl p-3 shadow-lg text-left"
                    style={{ background: opt.gradient }}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <div>
                      <span className="font-bold text-white text-xs block">{opt.label}</span>
                      <span className="text-[9px] text-white/60">{opt.sublabel}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {chatDrawerOpen && (
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 4 }}>
              <PrivateChatsDrawer
                isOpen={true}
                onClose={() => setChatDrawerOpen(false)}
              />
            </div>
          )}
        </div>,
        overlayRoot
      )}

      <PlantModal open={plantModalOpen} onOpenChange={setPlantModalOpen} />

      <CreateClassroomDialog
        open={classroomDialogOpen}
        onOpenChange={setClassroomDialogOpen}
        onSuccess={() => setClassroomDialogOpen(false)}
      />
      <ScheduleSkillDropDialog
        open={skillDropDialogOpen}
        onOpenChange={setSkillDropDialogOpen}
        onSuccess={() => setSkillDropDialogOpen(false)}
      />
      <CreateTrainingDialog
        open={trainingDialogOpen}
        onOpenChange={setTrainingDialogOpen}
        onSuccess={() => setTrainingDialogOpen(false)}
      />
    </>
  );
}
