import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Video, Users, Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ClassroomSession {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  instructor_profile_id: string;
  scheduled_at: string;
  duration_minutes: number;
  max_participants: number;
  status: string;
  circle_id: string;
  instructor?: {
    display_name: string;
    avatar_url: string;
  };
}

export const ClassroomMode: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassroomSessions();
  }, [user]);

  const loadClassroomSessions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user's circles
      const { data: userCircles } = await supabase
        .from('circle_members')
        .select('circle_id')
        .eq('user_id', user.id);

      const circleIds = (userCircles || []).map((c: any) => c.circle_id);

      // Get classroom sessions in user's circles
      const { data: sessionsData } = await supabase
        .from('classroom_sessions')
        .select(`
          *,
          instructor:instructor_profile_id(display_name, avatar_url)
        `)
        .in('circle_id', circleIds)
        .order('scheduled_at', { ascending: true });

      setSessions((sessionsData as any) || []);
    } catch (error) {
      console.error('Error loading classroom sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async (sessionId: string) => {
    // TODO: Implement Jitsi room join logic
    console.log('Joining classroom session:', sessionId);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      scheduled: { label: 'Upcoming', variant: 'secondary' },
      live: { label: 'Live Now', variant: 'default' },
      completed: { label: 'Completed', variant: 'outline' },
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Interactive Classrooms
          </CardTitle>
          <CardDescription>
            Join live learning sessions with whiteboards, breakout rooms, and interactive discussions
          </CardDescription>
        </CardHeader>
      </Card>

      {sessions.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Classroom Sessions</h3>
            <p className="text-muted-foreground">
              There are no classroom sessions scheduled in your circles yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="glass-card h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{session.title}</CardTitle>
                      {getStatusBadge(session.status)}
                    </div>
                    {session.status === 'live' && (
                      <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {session.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>Instructor: {(session.instructor as any)?.display_name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(session.scheduled_at), 'PPP')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{session.duration_minutes} minutes</span>
                  </div>
                  {session.status === 'live' && (
                    <Button
                      onClick={() => joinSession(session.id)}
                      className="w-full glass-button"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Join Session
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
