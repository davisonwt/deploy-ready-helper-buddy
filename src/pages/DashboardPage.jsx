import React, { useState, useEffect } from 'react';
import SunCalc from 'suncalc';
import { useAuth } from '../hooks/useAuth';
import { useBestowals } from '../hooks/useBestowals.jsx';
import { Button } from '@/components/ui/button';
import { supabase } from "@/integrations/supabase/client";
import { getCreatorTime } from '@/utils/customTime';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { getDayInfo } from '@/utils/sacredCalendar';
import { getCurrentTheme } from '@/utils/dashboardThemes';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { SocialFeedDashboard } from '@/components/dashboard/SocialFeedDashboard';

export default function DashboardPage() {
  const [communityUnread, setCommunityUnread] = useState(0);
  const {
    user,
    loading: authLoading
  } = useAuth();
  const [orchards, setOrchards] = useState([]);
  const [orchardsLoading, setOrchardsLoading] = useState(false);
  const fetchOrchards = async (filters = {}) => {
    try {
      setOrchardsLoading(true);
      let query = supabase.from('orchards').select(`*`).eq('status', 'active').order('created_at', { ascending: false });
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setOrchards(data || []);
    } catch (err) {
      console.error('Dashboard: Error fetching orchards:', err);
    } finally {
      setOrchardsLoading(false);
    }
  };
  const {
    getUserBestowals,
    loading: bestowalsLoading
  } = useBestowals();
  const [userOrchards, setUserOrchards] = useState([]);
  const [userBestowals, setUserBestowals] = useState([]);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalOrchards: 0,
    totalBestowals: 0,
    totalRaised: 0,
    totalSupported: 0,
    totalFollowers: 0,
    newFollowers: 0
  });
  const [activeUsers, setActiveUsers] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [error, setError] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [userLat, setUserLat] = useState(-26.2);
  const [userLon, setUserLon] = useState(28.0);
  const [calendarData, setCalendarData] = useState(null);

  useEffect(() => {
    const updateCalendarData = () => {
      const now = new Date();
      const localYear = now.getFullYear();
      const localMonth = now.getMonth();
      const localDate = now.getDate();
      const localHour = now.getHours();
      const localMinute = now.getMinutes();

      const sunriseReferenceDate = new Date(localYear, localMonth, localDate, 12, 0, 0, 0);
      const sunrise = SunCalc.getTimes(sunriseReferenceDate, userLat, userLon).sunrise;

      const creatorDate = calculateCreatorDate(now, userLat, userLon);
      const creatorTime = getCreatorTime(now, userLat, userLon);
      const dayInfo = getDayInfo(creatorDate.dayOfYear);

      const localTimestamp = `${localYear}-${String(localMonth + 1).padStart(2, '0')}-${String(localDate).padStart(2, '0')}T${String(localHour).padStart(2, '0')}:${String(localMinute).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const newCalendarData = {
        year: creatorDate.year,
        month: creatorDate.month,
        dayOfMonth: creatorDate.day,
        weekday: creatorDate.weekDay,
        part: creatorTime.part,
        dayOfYear: creatorDate.dayOfYear,
        season: dayInfo.isFeast ? dayInfo.feastName || 'Feast Day' : creatorDate.weekDay === 7 ? 'Sabbath Day' : 'Regular Day',
        timestamp: localTimestamp,
      };

      setCalendarData(newCalendarData);
    };

    updateCalendarData();
    const interval = setInterval(updateCalendarData, 60000);
    return () => clearInterval(interval);
  }, [userLat, userLon]);

  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme());

  useEffect(() => {
    const updateTheme = () => setCurrentTheme(getCurrentTheme());
    updateTheme();
    const interval = setInterval(updateTheme, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadRoles = async () => {
      if (!user?.id) { setUserRoles([]); return; }
      try {
        setRolesLoading(true);
        const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        if (error) throw error;
        if (!mounted) return;
        setUserRoles((data || []).map(r => r.role));
      } catch (e) {
        if (mounted) setUserRoles([]);
      } finally {
        if (mounted) setRolesLoading(false);
      }
    };
    loadRoles();
    return () => { mounted = false; };
  }, [user?.id]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        setUserLat(position.coords.latitude);
        setUserLon(position.coords.longitude);
      }, () => {});
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = async () => {
      try {
        const { data: roomId } = await supabase.rpc('get_or_create_community_room');
        if (!roomId) return;
        const { data: participant } = await supabase
          .from('chat_participants')
          .select('last_read_at')
          .eq('room_id', roomId)
          .eq('user_id', user.id)
          .single();
        const lastRead = participant?.last_read_at || '1970-01-01T00:00:00Z';
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', roomId)
          .gt('created_at', lastRead)
          .neq('sender_id', user.id);
        setCommunityUnread(count || 0);
      } catch (err) {
        console.error('Error fetching community unread:', err);
      }
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
          if (error && error.code !== 'PGRST116') {
            setError(`Failed to load profile: ${error.message || 'Unknown error'}`);
          } else {
            setProfile(data);
          }
        } catch (error) {
          setError(`Failed to load profile: ${error?.message || 'Unknown error'}`);
        }
      };

      const fetchData = async () => {
        try { await fetchOrchards(); } catch (error) { setError('Failed to load orchards'); }
      };

      const fetchUserBestowals = async () => {
        try {
          const result = await getUserBestowals();
          if (result.success) setUserBestowals(result.data);
          else setUserBestowals([]);
        } catch (error) { setUserBestowals([]); }
      };

      Promise.all([fetchProfile(), fetchData(), fetchActiveUsers(), fetchUserBestowals(), fetchFollowerStats(), fetchUnreadMessages()]).catch(err => {
        setError('Failed to load dashboard data');
      });
    }
  }, [user, authLoading]);

  const fetchFollowerStats = async () => {
    if (!user?.id) return;
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: followers, error: followersError } = await supabase.from('followers').select('id').eq('following_id', user.id);
      const { data: newFollowers, error: newFollowersError } = await supabase.from('followers').select('id').eq('following_id', user.id).gte('created_at', sevenDaysAgo.toISOString());
      if (followersError) throw followersError;
      if (newFollowersError) throw newFollowersError;
      setStats(prev => ({
        ...prev,
        totalFollowers: followers?.length || 0,
        newFollowers: newFollowers?.length || 0
      }));
    } catch (error) {
      console.error('Error fetching follower stats:', error);
    }
  };

  const fetchUnreadMessages = async () => {
    if (!user?.id) return;
    try {
      const { data: participantRooms } = await supabase
        .from('chat_participants')
        .select('room_id, joined_at, last_read_at')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (!participantRooms?.length) return;
      let totalUnread = 0;
      for (const room of participantRooms) {
        const since = room.last_read_at || room.joined_at;
        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', room.room_id)
          .neq('sender_id', user.id)
          .gt('created_at', since);
        totalUnread += (count || 0);
      }
      setUnreadMessages(totalUnread);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  };

  const fetchActiveUsers = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: orchardUsers } = await supabase.from('orchards').select('user_id').gte('created_at', thirtyDaysAgo.toISOString());
      const { data: bestowalUsers } = await supabase.from('bestowals').select('bestower_id').gte('created_at', thirtyDaysAgo.toISOString());
      const { data: messageUsers } = await supabase.from('chat_messages').select('sender_id').gte('created_at', thirtyDaysAgo.toISOString());
      const activeUserIds = new Set([...(orchardUsers?.map(u => u.user_id) || []), ...(bestowalUsers?.map(u => u.bestower_id) || []), ...(messageUsers?.map(u => u.sender_id) || [])]);
      setActiveUsers(activeUserIds.size);
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
  };

  useEffect(() => {
    const userCreatedOrchards = orchards.filter(orchard => orchard.user_id === user?.id);
    setUserOrchards(userCreatedOrchards);
    const totalRaised = userCreatedOrchards.reduce((sum, orchard) => sum + (orchard.filled_pockets * orchard.pocket_price || 0), 0);
    setStats(prev => ({
      ...prev,
      totalOrchards: userCreatedOrchards.length,
      totalBestowals: userBestowals.length,
      totalRaised: totalRaised,
      totalSupported: userBestowals.reduce((sum, bestowal) => sum + (bestowal.amount || 0), 0)
    }));
  }, [orchards, userBestowals, user]);

  if (authLoading || orchardsLoading || bestowalsLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    const theme = getCurrentTheme();
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.background }}>
        <div className="text-center backdrop-blur-xl rounded-2xl p-8 border" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}>
          <p className="mb-4" style={{ color: theme.textPrimary }}>{error}</p>
          <Button onClick={() => window.location.reload()} style={{ background: theme.primaryButton, color: theme.textPrimary }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SocialFeedDashboard
      profile={profile}
      calendarData={calendarData}
      stats={stats}
      unreadMessages={unreadMessages}
      communityUnread={communityUnread}
      currentTheme={currentTheme}
      currentTime={currentTime}
      user={user}
    />
  );
}
