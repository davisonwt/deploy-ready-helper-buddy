import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Mic, 
  Calendar, 
  Clock, 
  Radio, 
  CheckCircle, 
  AlertCircle,
  Play,
  Loader2
} from 'lucide-react';
import { format, parseISO, isWithinInterval, addMinutes, subMinutes } from 'date-fns';

export function MyApprovedSlots() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(null);

  useEffect(() => {
    if (user) {
      fetchMyApprovedSlots();
      
      // Refresh every minute to update "can go live" status
      const interval = setInterval(fetchMyApprovedSlots, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchMyApprovedSlots = async () => {
    if (!user) return;

    try {
      // Get DJ profile
      const { data: djProfile } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!djProfile) {
        setSlots([]);
        setLoading(false);
        return;
      }

      // Get approved upcoming slots
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('radio_schedule')
        .select(`
          *,
          radio_shows (
            show_name,
            description,
            category,
            subject,
            topic_description
          ),
          radio_djs (
            dj_name
          )
        `)
        .eq('dj_id', djProfile.id)
        .eq('approval_status', 'approved')
        .gte('end_time', now)
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) throw error;
      setSlots(data || []);
    } catch (error) {
      console.error('Error fetching approved slots:', error);
      toast.error('Failed to load your slots');
    } finally {
      setLoading(false);
    }
  };

  const canGoLive = (slot) => {
    const now = new Date();
    const startTime = parseISO(slot.start_time);
    const endTime = parseISO(slot.end_time);
    
    // Can go live 10 minutes before to 1 hour after start time
    const allowedStart = subMinutes(startTime, 10);
    const allowedEnd = addMinutes(endTime, 60);
    
    return isWithinInterval(now, { start: allowedStart, end: allowedEnd });
  };

  const handleGoLive = async (slot) => {
    setStartingSession(slot.id);
    
    try {
      // Check if live session already exists
      const { data: existingSession } = await supabase
        .from('radio_live_sessions')
        .select('id')
        .eq('schedule_id', slot.id)
        .maybeSingle();

      let sessionId = existingSession?.id;

      // Create session if it doesn't exist
      if (!sessionId) {
        const sessionToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        const { data: newSession, error: sessionError } = await supabase
          .from('radio_live_sessions')
          .insert({
            schedule_id: slot.id,
            session_token: sessionToken,
            status: 'waiting'
          })
          .select()
          .single();

        if (sessionError) throw sessionError;
        sessionId = newSession.id;
      }

      // Update slot status to live
      const { error: statusError } = await supabase
        .from('radio_schedule')
        .update({ status: 'live' })
        .eq('id', slot.id);

      if (statusError) throw statusError;

      // Update session status to live
      const { error: sessionStatusError } = await supabase
        .from('radio_live_sessions')
        .update({ status: 'live' })
        .eq('id', sessionId);

      if (sessionStatusError) throw sessionStatusError;

      toast.success('🎙️ Going live!');
      
      // Navigate to Grove Station with the live interface
      navigate('/grove-station');
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session: ' + error.message);
    } finally {
      setStartingSession(null);
    }
  };

  const getSlotStatus = (slot) => {
    const now = new Date();
    const startTime = parseISO(slot.start_time);
    const endTime = parseISO(slot.end_time);

    if (slot.status === 'live') {
      return { label: 'LIVE NOW', variant: 'destructive', icon: Radio };
    }
    
    if (now > endTime) {
      return { label: 'Completed', variant: 'secondary', icon: CheckCircle };
    }

    if (canGoLive(slot)) {
      return { label: 'Ready to Go Live', variant: 'default', icon: Play };
    }

    return { label: 'Upcoming', variant: 'outline', icon: Clock };
  };

  if (loading) {
    return (
      <Card className="bg-white/80 border-white/40 shadow-xl h-full flex flex-col">
        <CardContent className="p-8 text-center flex-1 flex items-center justify-center">
          <div>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-2">Loading your slots...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (slots.length === 0) {
    return (
      <Card className="bg-white/80 border-white/40 shadow-xl h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ 
            color: 'hsl(280, 100%, 40%)', 
            textShadow: '1px 1px 2px rgba(0,0,0,0.2)' 
          }}>
            <Calendar className="h-5 w-5 text-purple-600" />
            My Approved Radio Slots
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-8 space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium" style={{ textShadow: '0 0 2px white, 0 0 2px white' }}>No approved slots yet</p>
              <p className="text-sm text-muted-foreground" style={{ textShadow: '0 0 2px white, 0 0 2px white' }}>
                Apply for a time slot to start broadcasting
              </p>
            </div>
            <Button onClick={() => navigate('/radio-slot-application')}>
              <Mic className="h-4 w-4 mr-2" />
              Apply for Time Slot
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 border-white/40 shadow-xl h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ 
          color: 'hsl(280, 100%, 40%)', 
          textShadow: '1px 1px 2px rgba(0,0,0,0.2)' 
        }}>
          <Calendar className="h-5 w-5 text-purple-600" />
          My Approved Radio Slots
        </CardTitle>
        <p className="text-sm text-muted-foreground" style={{ textShadow: '0 0 2px white, 0 0 2px white' }}>
          Your upcoming approved broadcasting slots. Click "Go Live" when you're ready to start.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        {slots.map((slot) => {
          const status = getSlotStatus(slot);
          const StatusIcon = status.icon;
          const canStart = canGoLive(slot);
          const isStarting = startingSession === slot.id;

          return (
            <Card key={slot.id} className="border-2">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Title and Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-lg">
                          {slot.radio_shows?.show_name || 'Radio Show'}
                        </h3>
                        {slot.radio_shows?.subject && (
                          <p className="text-sm text-muted-foreground">
                            Topic: {slot.radio_shows.subject}
                          </p>
                        )}
                      </div>
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>

                    {/* Date and Time */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(parseISO(slot.start_time), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(parseISO(slot.start_time), 'h:mm a')} - {format(parseISO(slot.end_time), 'h:mm a')}
                      </div>
                    </div>

                    {/* Description */}
                    {slot.radio_shows?.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {slot.radio_shows.description}
                      </p>
                    )}

                    {/* Category */}
                    {slot.radio_shows?.category && (
                      <Badge variant="outline">
                        {slot.radio_shows.category}
                      </Badge>
                    )}
                  </div>

                  {/* Go Live Button */}
                  <div className="flex flex-col gap-2">
                    {canStart && slot.status !== 'live' && (
                      <Button
                        size="lg"
                        onClick={() => handleGoLive(slot)}
                        disabled={isStarting}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold animate-pulse"
                      >
                        {isStarting ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Mic className="h-5 w-5 mr-2" />
                            GO LIVE NOW
                          </>
                        )}
                      </Button>
                    )}
                    {slot.status === 'live' && (
                      <Button
                        size="lg"
                        onClick={() => navigate('/grove-station')}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold"
                      >
                        <Radio className="h-5 w-5 mr-2 animate-pulse" />
                        You're LIVE!
                      </Button>
                    )}
                    {!canStart && slot.status !== 'live' && (
                      <p className="text-xs text-muted-foreground text-center max-w-[120px]">
                        Available 10 min before show time
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
