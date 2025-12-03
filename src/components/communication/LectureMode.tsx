import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Users, Calendar, Presentation, Plus, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ScheduleLectureDialog } from './ScheduleLectureDialog';
import JitsiRoom from '@/components/jitsi/JitsiRoom';

interface LectureHall {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  attendees_count: number | null;
  status: string | null;
  presenter_id: string;
  presenter_profile_id: string | null;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const LectureMode: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [lectures, setLectures] = useState<LectureHall[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [activeLecture, setActiveLecture] = useState<LectureHall | null>(null);

  useEffect(() => {
    loadLectures();
  }, []);

  const loadLectures = async () => {
    try {
      const { data, error } = await supabase
        .from('lecture_halls')
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
      setLectures(data || []);
    } catch (error) {
      console.error('Error loading lectures:', error);
    } finally {
      setLoading(false);
    }
  };

  const attendLecture = (lecture: LectureHall) => {
    setActiveLecture(lecture);
    toast({
      title: 'Joining Lecture',
      description: `Connecting to ${lecture.title}...`,
    });
  };

  const leaveLecture = () => {
    setActiveLecture(null);
    toast({
      title: 'Left Lecture',
      description: 'You have left the lecture hall.',
    });
  };

  // Show JitsiRoom when in active lecture
  if (activeLecture) {
    const isPresenter = user?.id === activeLecture.presenter_id;
    const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Attendee';
    const roomName = `lecture_${activeLecture.id.replace(/-/g, '')}`;

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 glass-card mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{activeLecture.title}</h2>
            <p className="text-white/70 text-sm">
              {isPresenter ? 'You are the presenter' : `Presenter: ${activeLecture.profiles?.display_name || 'Unknown'}`}
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
            onLeave={leaveLecture}
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
          <h2 className="text-3xl font-bold text-white mb-2">Lecture Halls</h2>
          <p className="text-white/80">Attend presentations and participate in Q&A sessions</p>
        </div>
        <Button 
          className="gap-2" 
          onClick={() => setScheduleDialogOpen(true)}
          style={{ backgroundColor: '#17A2B8', color: 'white', border: '2px solid #0A1931' }}
        >
          <Plus className="w-4 h-4" />
          Schedule Lecture
        </Button>
      </div>

      {/* Lecture List */}
      <div className="grid gap-4">
        {lectures.length === 0 ? (
          <Card className="glass-card bg-transparent border border-primary/20">
            <CardContent className="p-12 text-center">
              <GraduationCap className="w-16 h-16 mx-auto mb-4 text-primary/50" />
              <h3 className="text-xl font-semibold text-white mb-2">No Scheduled Lectures</h3>
              <p className="text-white/70 mb-4">Be the first to schedule a presentation</p>
              <Button onClick={() => setScheduleDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Lecture
              </Button>
            </CardContent>
          </Card>
        ) : (
          lectures.map((lecture, index) => (
            <motion.div
              key={lecture.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card bg-transparent border border-primary/20 hover:border-primary/40 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12 border-2 border-primary/30">
                      <AvatarImage src={lecture.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-white">
                        {lecture.profiles?.display_name?.charAt(0) || 'P'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{lecture.title}</h3>
                          <p className="text-sm text-white/70">
                            Presenter: {lecture.profiles?.display_name || 'Unknown'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-white border-primary/30">
                          {lecture.status || 'scheduled'}
                        </Badge>
                      </div>

                      {lecture.description && (
                        <p className="text-white/80 mb-3">{lecture.description}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-white/70 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDistanceToNow(new Date(lecture.scheduled_at), { addSuffix: true })}
                        </div>
                        {lecture.attendees_count !== null && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {lecture.attendees_count} attending
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={() => attendLecture(lecture)}
                          className="gap-2"
                        >
                          <Presentation className="w-4 h-4" />
                          Attend Lecture
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

      <ScheduleLectureDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSuccess={loadLectures}
      />
    </div>
  );
};
