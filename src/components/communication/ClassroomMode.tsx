import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Calendar, Clock, Video, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { CreateClassroomDialog } from './CreateClassroomDialog';
import JitsiRoom from '@/components/jitsi/JitsiRoom';

interface ClassroomSession {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  max_participants: number | null;
  status: string | null;
  instructor_id: string;
  instructor_profile_id: string | null;
  circle_id: string | null;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const ClassroomMode: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<ClassroomSession | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('classroom_sessions')
        .select(`
          *,
          profiles:instructor_profile_id (
            display_name,
            avatar_url
          )
        `)
        .order('scheduled_at', { ascending: true })
        .limit(20);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinSession = (session: ClassroomSession) => {
    setActiveSession(session);
    toast({
      title: 'Joining Classroom',
      description: `Connecting to ${session.title}...`,
    });
  };

  const leaveSession = () => {
    setActiveSession(null);
    toast({
      title: 'Left Classroom',
      description: 'You have left the classroom session.',
    });
  };

  // Show JitsiRoom when in active session
  if (activeSession) {
    const isInstructor = user?.id === activeSession.instructor_id;
    const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Student';
    const roomName = `classroom_${activeSession.id.replace(/-/g, '')}`;

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 glass-card mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{activeSession.title}</h2>
            <p className="text-white/70 text-sm">
              {isInstructor ? 'You are the instructor' : `Instructor: ${activeSession.profiles?.display_name || 'Unknown'}`}
            </p>
          </div>
          <Badge variant={isInstructor ? 'default' : 'outline'} className="text-white">
            {isInstructor ? 'Instructor' : 'Student'}
          </Badge>
        </div>
        
        <div className="flex-1 min-h-[600px]">
          <JitsiRoom
            roomName={roomName}
            displayName={displayName}
            onLeave={leaveSession}
            isModerator={isInstructor}
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
          <h2 className="text-3xl font-bold text-white mb-2">Interactive Classrooms</h2>
          <p className="text-white/80">Join live learning sessions with whiteboards and collaboration</p>
        </div>
        <Button 
          className="gap-2" 
          onClick={() => setCreateDialogOpen(true)}
          style={{ backgroundColor: '#17A2B8', color: 'white', border: '2px solid #0A1931' }}
        >
          <Plus className="w-4 h-4" />
          Create Session
        </Button>
      </div>

      {/* Active Sessions */}
      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card className="glass-card bg-transparent border border-primary/20">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-primary/50" />
              <h3 className="text-xl font-semibold text-white mb-2">No Active Classrooms</h3>
              <p className="text-white/70 mb-4">Be the first to create an interactive learning session</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Classroom
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
                        {session.profiles?.display_name?.charAt(0) || 'I'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{session.title}</h3>
                          <p className="text-sm text-white/70">
                            Instructor: {session.profiles?.display_name || 'Unknown'}
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
                        {session.duration_minutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {session.duration_minutes} mins
                          </div>
                        )}
                        {session.max_participants && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Max {session.max_participants} students
                          </div>
                        )}
                      </div>

                      <Button 
                        onClick={() => joinSession(session)}
                        className="gap-2"
                      >
                        <Video className="w-4 h-4" />
                        Join Classroom
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <CreateClassroomDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadSessions}
      />
    </div>
  );
};
