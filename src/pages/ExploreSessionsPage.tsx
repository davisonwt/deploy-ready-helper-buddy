import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Search, Radio, BookOpen, Lightbulb, GraduationCap,
  Calendar, Users, Clock, DollarSign, ArrowLeft, Sparkles,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

interface SessionItem {
  id: string;
  title: string;
  description: string | null;
  mode: 'skilldrop' | 'classroom' | 'radio' | 'training';
  pricing_type: string;
  session_fee: number | null;
  scheduled_at: string;
  status: string;
  host_name: string;
  host_avatar: string | null;
  host_user_id: string;
  listener_count?: number;
  max_participants?: number;
  category?: string;
}

const MODE_CONFIG = {
  skilldrop: { icon: Lightbulb, label: 'SkillDrop', color: 'from-amber-500 to-orange-500' },
  classroom: { icon: GraduationCap, label: 'Classroom', color: 'from-blue-500 to-indigo-500' },
  radio: { icon: Radio, label: 'Radio', color: 'from-purple-500 to-pink-500' },
  training: { icon: BookOpen, label: 'Training', color: 'from-emerald-500 to-teal-500' },
};

export default function ExploreSessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMode, setActiveMode] = useState('all');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const [classroomsRes, radioRes] = await Promise.all([
        supabase
          .from('classroom_sessions')
          .select('id, title, description, pricing_type, session_fee, is_free, scheduled_at, status, max_participants, instructor_id')
          .in('status', ['scheduled', 'live'])
          .order('scheduled_at', { ascending: true })
          .limit(50),
        supabase
          .from('radio_schedule')
          .select('id, start_time, end_time, status, listener_count, radio_shows(show_name, description, category), radio_djs(dj_name, avatar_url, user_id)')
          .in('status', ['scheduled', 'live'])
          .eq('approval_status', 'approved')
          .order('start_time', { ascending: true })
          .limit(50),
      ]);

      const items: SessionItem[] = [];

      // Transform classrooms
      if (classroomsRes.data) {
        const instructorIds = [...new Set(classroomsRes.data.map((c: any) => c.instructor_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', instructorIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

        for (const c of classroomsRes.data as any[]) {
          const profile = profileMap.get(c.instructor_id);
          items.push({
            id: c.id,
            title: c.title,
            description: c.description,
            mode: 'classroom',
            pricing_type: c.is_free ? 'free' : (c.pricing_type || 'per_session'),
            session_fee: c.session_fee,
            scheduled_at: c.scheduled_at,
            status: c.status,
            host_name: profile?.display_name || 'Instructor',
            host_avatar: profile?.avatar_url || null,
            host_user_id: c.instructor_id,
            max_participants: c.max_participants,
          });
        }
      }

      // Transform radio shows
      if (radioRes.data) {
        for (const r of radioRes.data as any[]) {
          items.push({
            id: r.id,
            title: r.radio_shows?.show_name || 'Radio Show',
            description: r.radio_shows?.description || null,
            mode: 'radio',
            pricing_type: 'free',
            session_fee: null,
            scheduled_at: r.start_time,
            status: r.status,
            host_name: r.radio_djs?.dj_name || 'DJ',
            host_avatar: r.radio_djs?.avatar_url || null,
            host_user_id: r.radio_djs?.user_id || '',
            listener_count: r.listener_count,
            category: r.radio_shows?.category,
          });
        }
      }

      items.sort((a, b) => {
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (b.status === 'live' && a.status !== 'live') return 1;
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      });

      setSessions(items);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = sessions.filter(s => {
    const matchesMode = activeMode === 'all' || s.mode === activeMode;
    const matchesSearch = !searchQuery || 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.host_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMode && matchesSearch;
  });

  const getPricingLabel = (s: SessionItem) => {
    if (s.pricing_type === 'free') return { text: 'FREE', class: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' };
    if (s.pricing_type === 'monthly') return { text: `$${s.session_fee || 5}/mo`, class: 'bg-primary/20 text-primary' };
    return { text: `$${s.session_fee || 0}`, class: 'bg-amber-500/20 text-amber-700 dark:text-amber-400' };
  };

  const handleJoin = (s: SessionItem) => {
    if (s.mode === 'radio') navigate(`/grove-station?schedule=${s.id}`);
    else if (s.mode === 'classroom') navigate(`/communications-hub?classroom=${s.id}`);
    else navigate(`/communications-hub?session=${s.id}`);
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Explore Sessions
          </h1>
          <p className="text-sm text-muted-foreground">Discover live & upcoming sessions across the community</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by topic, host name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Mode Tabs */}
      <Tabs value={activeMode} onValueChange={setActiveMode}>
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="classroom">
            <GraduationCap className="h-3 w-3 mr-1" />
            Class
          </TabsTrigger>
          <TabsTrigger value="skilldrop">
            <Lightbulb className="h-3 w-3 mr-1" />
            Skill
          </TabsTrigger>
          <TabsTrigger value="radio">
            <Radio className="h-3 w-3 mr-1" />
            Radio
          </TabsTrigger>
          <TabsTrigger value="training">
            <BookOpen className="h-3 w-3 mr-1" />
            Train
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Sessions List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-24" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-bold text-lg">No sessions found</h3>
          <p className="text-muted-foreground text-sm">Check back soon for new sessions!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(session => {
            const config = MODE_CONFIG[session.mode];
            const Icon = config.icon;
            const pricing = getPricingLabel(session);
            const isLive = session.status === 'live';

            return (
              <Card 
                key={session.id} 
                className={`overflow-hidden transition-all hover:shadow-lg cursor-pointer ${isLive ? 'border-red-500/50 shadow-red-500/10' : ''}`}
                onClick={() => handleJoin(session)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Mode Icon */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isLive && (
                          <Badge variant="destructive" className="animate-pulse text-[10px] px-1.5 py-0">
                            🔴 LIVE
                          </Badge>
                        )}
                        <Badge className={`text-[10px] px-1.5 py-0 ${pricing.class} border-0`}>
                          {pricing.text}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {config.label}
                        </Badge>
                      </div>

                      <h3 className="font-bold text-sm truncate">{session.title}</h3>
                      
                      {session.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{session.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/member/${session.host_user_id}`); }}
                          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={session.host_avatar || undefined} />
                            <AvatarFallback className="text-[8px]">{session.host_name[0]}</AvatarFallback>
                          </Avatar>
                          <span>{session.host_name}</span>
                        </button>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(session.scheduled_at), 'MMM d, h:mm a')}
                        </span>
                        {session.listener_count != null && session.listener_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {session.listener_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
