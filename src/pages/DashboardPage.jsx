import React, { useState, useEffect } from 'react';
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
import { useQuery } from '@tanstack/react-query';

export default function DashboardPage() {
  const [communityUnread, setCommunityUnread] = useState(0);
  const { user, loading: authLoading } = useAuth();
  const [orchards, setOrchards] = useState([]);
  const [orchardsLoading, setOrchardsLoading] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [goLiveOpen, setGoLiveOpen] = useState(false);

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

  return (
    <>
      <AppShell
        calendarData={calendarData}
        communityCount={communityCount || 0}
        hideGoLiveFAB
      >
        <div className="pb-20">
          <HomeFeed
            profile={profile}
            calendarData={calendarData}
            stats={stats}
            unreadMessages={unreadMessages}
          />
        </div>
      </AppShell>

      {/* Static bottom bar with Plant + Go Live + Chat */}
      <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-screen-md items-center justify-center gap-3 px-4 py-3">
          <a
            href="/create-orchard"
            className="flex flex-1 max-w-[180px] items-center justify-center gap-2 rounded-full px-4 py-3 font-bold text-sm text-white shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #166534, #22c55e)',
            }}
          >
            <Sprout className="h-5 w-5" />
            Plant
          </a>
          <button
            onClick={() => setGoLiveOpen(!goLiveOpen)}
            className="flex flex-1 max-w-[180px] items-center justify-center gap-2 rounded-full px-4 py-3 font-bold text-sm text-white shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #dc2626, #f43f5e)',
            }}
          >
            <Video className="h-5 w-5" />
            Go Live
          </button>
          <button
            onClick={() => setChatDrawerOpen(true)}
            className="flex flex-1 max-w-[180px] items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 font-bold text-sm text-primary-foreground shadow-lg"
          >
            <MessageCircle className="h-5 w-5" />
            Chat
          </button>
        </div>
      </div>

      {/* Go Live options panel */}
      {goLiveOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[101]" onClick={() => setGoLiveOpen(false)} />
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[102] w-56 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 px-1 mb-1">Go Live As…</p>
            {[
              { href: '/communications-hub?tab=classroom', label: 'Classroom', sublabel: 'Teach & mentor', icon: '🎓', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)' },
              { href: '/explore-sessions?type=skilldrop', label: 'SkillDrop', sublabel: 'Share a skill', icon: '⚡', gradient: 'linear-gradient(135deg, #2563eb, #7c3aed)' },
              { href: '/communications-hub?tab=training', label: 'Training', sublabel: 'Lead a workout', icon: '💪', gradient: 'linear-gradient(135deg, #7c3aed, #db2777)' },
              { href: '/radio-slot-application', label: 'Radio', sublabel: 'Go on air', icon: '📻', gradient: 'linear-gradient(135deg, #db2777, #ef4444)' },
            ].map((opt) => (
              <a
                key={opt.label}
                href={opt.href}
                onClick={() => setGoLiveOpen(false)}
                className="flex items-center gap-3 rounded-2xl p-3 shadow-lg"
                style={{ background: opt.gradient }}
              >
                <span className="text-xl">{opt.icon}</span>
                <div>
                  <span className="font-bold text-white text-xs block">{opt.label}</span>
                  <span className="text-[9px] text-white/60">{opt.sublabel}</span>
                </div>
              </a>
            ))}
          </div>
        </>
      )}

      {chatDrawerOpen && (
        <div className="fixed inset-0 z-[110] pointer-events-auto">
          <PrivateChatsDrawer
            isOpen={true}
            onClose={() => setChatDrawerOpen(false)}
          />
        </div>
      )}
    </>
  );
}
