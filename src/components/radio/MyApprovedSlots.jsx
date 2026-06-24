import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  Loader2,
  Trash2,
  Pencil,
  Plus
} from 'lucide-react';
import { format, parseISO, isWithinInterval, addMinutes, subMinutes } from 'date-fns';

export function MyApprovedSlots() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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

  const handleDeleteSlot = async (slot) => {
    if (!window.confirm(`Delete this slot "${slot.radio_shows?.show_name || 'Radio Show'}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase
        .from('radio_schedule')
        .delete()
        .eq('id', slot.id);
      if (error) throw error;
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
      toast.success('Slot deleted');
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Failed to delete slot: ' + error.message);
    }
  };

  const openEditDialog = (slot) => {
    const toLocal = (iso) => {
      const d = parseISO(iso);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setEditingSlot(slot);
    setEditStart(toLocal(slot.start_time));
    setEditEnd(toLocal(slot.end_time));
    setEditNotes(slot.show_notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingSlot) return;
    const start = new Date(editStart);
    const end = new Date(editEnd);
    if (!(start < end)) {
      toast.error('End time must be after start time');
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('radio_schedule')
        .update({
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          time_slot_date: start.toISOString().slice(0, 10),
          hour_slot: start.getUTCHours(),
          show_notes: editNotes || null,
        })
        .eq('id', editingSlot.id);
      if (error) throw error;
      toast.success('Slot updated');
      setEditingSlot(null);
      fetchMyApprovedSlots();
    } catch (error) {
      console.error('Error updating slot:', error);
      toast.error('Failed to update slot: ' + error.message);
    } finally {
      setSavingEdit(false);
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
        <div className="flex items-start justify-between gap-3">
          <div>
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
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/radio-slot-application')}
            className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Slot
          </Button>
        </div>
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
                    {slot.status !== 'live' && (
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(slot)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSlot(slot)}
                          className="text-destructive border-destructive/40 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>

      <Dialog open={!!editingSlot} onOpenChange={(o) => !o && setEditingSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Radio Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start">Start Time</Label>
              <Input
                id="edit-start"
                type="datetime-local"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">End Time</Label>
              <Input
                id="edit-end"
                type="datetime-local"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Show Notes</Label>
              <Textarea
                id="edit-notes"
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes for this slot"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingSlot(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
