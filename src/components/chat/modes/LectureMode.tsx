import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Video, Users, Calendar, Clock, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface LectureHall {
  id: string;
  title: string;
  description: string;
  presenter_id: string;
  presenter_profile_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  attendees_count: number;
  slides_url: string;
  circle_id: string;
  presenter?: {
    display_name: string;
    avatar_url: string;
  };
}

export const LectureMode: React.FC = () => {
  const { user } = useAuth();
  const [lectures, setLectures] = useState<LectureHall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLectureHalls();
  }, [user]);

  const loadLectureHalls = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: userCircles } = await supabase
        .from('circle_members')
        .select('circle_id')
        .eq('user_id', user.id);

      const circleIds = (userCircles || []).map((c: any) => c.circle_id);

      const { data: lecturesData } = await supabase
        .from('lecture_halls')
        .select(`
          *,
          presenter:presenter_profile_id(display_name, avatar_url)
        `)
        .in('circle_id', circleIds)
        .order('scheduled_at', { ascending: true });

      setLectures((lecturesData as any) || []);
    } catch (error) {
      console.error('Error loading lecture halls:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinLecture = async (lectureId: string) => {
    // TODO: Implement Jitsi room join logic
    console.log('Joining lecture hall:', lectureId);
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
            <GraduationCap className="w-5 h-5" />
            Lecture Halls
          </CardTitle>
          <CardDescription>
            Attend presentations, view slides, and participate in Q&A sessions with experts
          </CardDescription>
        </CardHeader>
      </Card>

      {lectures.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Lectures Scheduled</h3>
            <p className="text-muted-foreground">
              There are no lecture halls scheduled in your circles yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lectures.map((lecture) => (
            <motion.div
              key={lecture.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="glass-card h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{lecture.title}</CardTitle>
                      {getStatusBadge(lecture.status)}
                    </div>
                    {lecture.status === 'live' && (
                      <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {lecture.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>Presenter: {(lecture.presenter as any)?.display_name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(lecture.scheduled_at), 'PPP')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{lecture.duration_minutes} minutes</span>
                  </div>
                  {lecture.attendees_count > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{lecture.attendees_count} attendees</span>
                    </div>
                  )}
                  {lecture.slides_url && (
                    <Button
                      variant="outline"
                      className="w-full glass-button"
                      onClick={() => window.open(lecture.slides_url, '_blank')}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Slides
                    </Button>
                  )}
                  {lecture.status === 'live' && (
                    <Button
                      onClick={() => joinLecture(lecture.id)}
                      className="w-full glass-button"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Join Lecture
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
