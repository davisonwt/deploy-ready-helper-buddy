import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Users, Calendar, Presentation, Plus, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ScheduleSkillDropDialog } from './ScheduleSkillDropDialog';
import JitsiRoom from '@/components/jitsi/JitsiRoom';

interface SkillDropSession {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  attendees_count: number | null;
  status: string | null;
  presenter_id: string;
  presenter_profile_id: string | null;
  topic_id: string | null;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const SkillDropMode: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SkillDropSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<SkillDropSession | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('skilldrop_sessions' as any)
        .select(`
          *,
          profiles:presenter_profile_id (
            display_name,
            avatar_url
          )
        `)
        .order('scheduled_at', { ascending: true })
        .limit(20);

      if (error) throw error;
      setSessions((data as any) || []);
    } catch (error) {
      console.error('Error loading SkillDrop sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinSession = (session: SkillDropSession) => {
    setActiveSession(session);
    toast({
      title: 'Joining SkillDrop',
      description: `Connecting to ${session.title}...`,
    });
  };

  const leaveSession = () => {
    setActiveSession(null);
    toast({
      title: 'Left SkillDrop',
      description: 'You have left the session.',
    });
  };

  if (activeSession) {
    const isPresenter = user?.id === activeSession.presenter_id;
    const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Attendee';
    const roomName = `skilldrop_${activeSession.id.replace(/-/g, '')}`;

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 glass-card mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{activeSession.title}</h2>
            <p className="text-white/70 text-sm">
              {isPresenter ? 'You are the presenter' : `Presenter: ${activeSession.profiles?.display_name || 'Unknown'}`}
            </p>
          </div>
          <Badge variant={isPresenter ? 'default' : 'outline'} className="text-white">
            {isPresenter ? 'Presenter' : 'Attendee'}
          </Badge>
        </div>
        
        <div className="flex-1 min-h-[600px]">
          <JitsiRoom
            roomName={roomName}
            displayName={displayName}
            onLeave={leaveSession}
            isModerator={isPresenter}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card bg-transparent border border-primary/20">
            <CardContent className="p-6 animate-pulse">
              <div className="h-6 bg-muted/30 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-muted/20 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">SkillDrop Sessions</h2>
          <p className="text-white/80">Join live sessions, Q&A, and interactive study drops</p>
        </div>
        <Button 
          className="gap-2" 
          onClick={() => setScheduleDialogOpen(true)}
          style={{ backgroundColor: '#17A2B8', color: 'white', border: '2px solid #0A1931' }}
        >
          <Plus className="w-4 h-4" />
          Schedule SkillDrop
        </Button>
      </div>

      {/* Session List */}
      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card className="glass-card bg-transparent border border-primary/20">
            <CardContent className="p-12 text-center">
              <Zap className="w-16 h-16 mx-auto mb-4 text-primary/50" />
              <h3 className="text-xl font-semibold text-white mb-2">No Scheduled SkillDrops</h3>
              <p className="text-white/70 mb-4">Be the first to schedule a live session</p>
              <Button onClick={() => setScheduleDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule SkillDrop
              </Button>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card bg-transparent border border-primary/20 hover:border-primary/40 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12 border-2 border-primary/30">
                      <AvatarImage src={session.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-white">
                        {session.profiles?.display_name?.charAt(0) || 'P'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{session.title}</h3>
                          <p className="text-sm text-white/70">
                            Presenter: {session.profiles?.display_name || 'Unknown'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-white border-primary/30">
                          {session.status || 'scheduled'}
                        </Badge>
                      </div>

                      {session.description && (
                        <p className="text-white/80 mb-3">{session.description}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-white/70 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDistanceToNow(new Date(session.scheduled_at), { addSuffix: true })}
                        </div>
                        {session.attendees_count !== null && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {session.attendees_count} attending
                          </div>
                        )}
                        {session.topic_id && (
                          <Badge variant="secondary" className="text-xs">
                            📖 Study Topic
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={() => joinSession(session)}
                          className="gap-2"
                        >
                          <Presentation className="w-4 h-4" />
                          Join SkillDrop
                        </Button>
                        <Button variant="outline" className="gap-2">
                          <MessageCircle className="w-4 h-4" />
                          Q&A
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <ScheduleSkillDropDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSuccess={loadSessions}
      />
    </div>
  );
};