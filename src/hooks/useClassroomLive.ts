import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LiveParticipant {
  id: string;
  session_id: string;
  user_id: string;
  participant_type: string; // 'host' | 'co_host' | 'attendee'
  status: string;
  audio_enabled: boolean;
  video_enabled: boolean;
  can_speak: boolean;
  hand_raised: boolean;
  hand_raised_at: string | null;
  joined_at: string | null;
  // joined profile
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface LiveMessage {
  id: string;
  session_id: string;
  sender_id: string | null;
  sender_type: string;
  message_type: string; // 'text' | 'voice'
  content: string | null;
  metadata: any;
  created_at: string;
}

export interface LiveMediaItem {
  id: string;
  session_id: string;
  uploader_id: string;
  media_type: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  submission_role: string; // 'host_preload' | 'attendee_task'
  score: number | null;
  feedback: string | null;
  scored_at: string | null;
  scored_by: string | null;
  metadata: any;
  created_at: string;
}

export interface UseClassroomLiveArgs {
  sessionId: string;
  userId: string | null;
  isHost: boolean;
}

export function useClassroomLive({ sessionId, userId, isHost }: UseClassroomLiveArgs) {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [media, setMedia] = useState<LiveMediaItem[]>([]);
  const [joined, setJoined] = useState(false);

  /* ------------------------- initial load ------------------------- */
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    (async () => {
      const [{ data: parts }, { data: msgs }, { data: meds }] = await Promise.all([
        supabase.from('live_session_participants').select('*').eq('session_id', sessionId).eq('status', 'active'),
        supabase.from('live_session_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
        supabase.from('live_session_media').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
      ]);
      if (cancelled) return;

      // Hydrate participant profiles
      const ids = Array.from(new Set((parts || []).map((p: any) => p.user_id)));
      let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name, avatar_url')
          .in('user_id', ids);
        (profs || []).forEach((p: any) => {
          profileMap.set(p.user_id, {
            display_name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sower',
            avatar_url: p.avatar_url,
          });
        });
      }
      setParticipants((parts || []).map((p: any) => ({ ...p, ...(profileMap.get(p.user_id) ?? {}) })));
      setMessages((msgs || []) as any);
      setMedia((meds || []) as any);
    })();

    return () => { cancelled = true; };
  }, [sessionId]);

  /* ------------------------- realtime ----------------------------- */
  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase
      .channel(`classroom-live-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_session_participants', filter: `session_id=eq.${sessionId}` },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            setParticipants((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
            return;
          }
          const row: any = payload.new;
          // fetch profile if new
          let extra: any = {};
          if (payload.eventType === 'INSERT') {
            const { data: prof } = await supabase
              .from('profiles')
              .select('display_name, first_name, last_name, avatar_url')
              .eq('user_id', row.user_id)
              .maybeSingle();
            if (prof) extra = {
              display_name: (prof as any).display_name || `${(prof as any).first_name || ''} ${(prof as any).last_name || ''}`.trim() || 'Sower',
              avatar_url: (prof as any).avatar_url,
            };
          }
          setParticipants((prev) => {
            const existing = prev.find((p) => p.id === row.id);
            const merged: LiveParticipant = { ...(existing ?? {} as any), ...row, ...extra };
            const others = prev.filter((p) => p.id !== row.id);
            return merged.status === 'active' ? [...others, merged] : others;
          });
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_session_messages', filter: `session_id=eq.${sessionId}` },
        (payload) => setMessages((prev) => prev.some((m) => m.id === (payload.new as any).id) ? prev : [...prev, payload.new as any]))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_session_media', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setMedia((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
          } else {
            setMedia((prev) => {
              const others = prev.filter((m) => m.id !== (payload.new as any).id);
              return [...others, payload.new as any];
            });
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [sessionId]);

  /* ------------------------- join / leave ------------------------- */
  const joinSession = useCallback(async () => {
    if (!userId || !sessionId || joined) return;
    const { error } = await supabase
      .from('live_session_participants')
      .upsert({
        session_id: sessionId,
        user_id: userId,
        participant_type: isHost ? 'host' : 'attendee',
        status: 'active',
        audio_enabled: false,
        video_enabled: false,
        can_speak: isHost, // host can speak by default
        joined_at: new Date().toISOString(),
        left_at: null,
        hand_raised: false,
      } as any, { onConflict: 'session_id,user_id' });
    if (error) {
      console.error('joinSession error', error);
      toast({ title: 'Could not join session', description: error.message, variant: 'destructive' });
    } else {
      setJoined(true);
    }
  }, [userId, sessionId, isHost, joined, toast]);

  const leaveSession = useCallback(async () => {
    if (!userId || !sessionId) return;
    await supabase
      .from('live_session_participants')
      .update({ status: 'left', left_at: new Date().toISOString(), hand_raised: false })
      .eq('session_id', sessionId)
      .eq('user_id', userId);
    setJoined(false);
  }, [userId, sessionId]);

  /* ------------------------- hand raise --------------------------- */
  const setHandRaised = useCallback(async (raised: boolean) => {
    if (!userId || !sessionId) return;
    await supabase
      .from('live_session_participants')
      .update({ hand_raised: raised, hand_raised_at: raised ? new Date().toISOString() : null } as any)
      .eq('session_id', sessionId)
      .eq('user_id', userId);
  }, [userId, sessionId]);

  /* ------------- host: grant / revoke speaking right -------------- */
  const setCanSpeak = useCallback(async (participantUserId: string, allow: boolean) => {
    if (!isHost) return;
    await supabase
      .from('live_session_participants')
      .update({ can_speak: allow, hand_raised: allow ? false : undefined, hand_raised_at: null } as any)
      .eq('session_id', sessionId)
      .eq('user_id', participantUserId);
  }, [isHost, sessionId]);

  /* --------------------------- messaging -------------------------- */
  const sendTextMessage = useCallback(async (text: string) => {
    if (!userId || !text.trim()) return;
    await supabase.from('live_session_messages').insert({
      session_id: sessionId,
      sender_id: userId,
      sender_type: isHost ? 'host' : 'attendee',
      message_type: 'text',
      content: text.trim(),
    } as any);
  }, [userId, sessionId, isHost]);

  const sendVoiceMessage = useCallback(async (blob: Blob, durationSec: number) => {
    if (!userId) return;
    const ext = (blob.type.split('/')[1] || 'webm').split(';')[0];
    const path = `live-session/${sessionId}/${userId}/voice-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('premium-room').upload(path, blob, { contentType: blob.type, upsert: false });
    if (upErr) {
      toast({ title: 'Voice note failed', description: upErr.message, variant: 'destructive' });
      return;
    }
    const { data } = supabase.storage.from('premium-room').getPublicUrl(path);
    await supabase.from('live_session_messages').insert({
      session_id: sessionId,
      sender_id: userId,
      sender_type: isHost ? 'host' : 'attendee',
      message_type: 'voice',
      content: null,
      metadata: { url: data.publicUrl, mime: blob.type, duration_sec: durationSec },
    } as any);
  }, [userId, sessionId, isHost, toast]);

  /* ----------------- media: preload + submissions ----------------- */
  const uploadMedia = useCallback(async (file: File, role: 'host_preload' | 'attendee_task') => {
    if (!userId) return;
    const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `live-session/${sessionId}/${role}/${userId}-${Date.now()}-${clean}`;
    const { error: upErr } = await supabase.storage.from('premium-room').upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' });
      return;
    }
    const { data: pub } = supabase.storage.from('premium-room').getPublicUrl(path);
    const media_type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document';
    const { error: insErr } = await supabase.from('live_session_media').insert({
      session_id: sessionId,
      uploader_id: userId,
      media_type,
      file_name: file.name,
      file_path: pub.publicUrl,
      file_size: file.size,
      mime_type: file.type,
      submission_role: role,
      metadata: { storage_path: path },
    } as any);
    if (insErr) toast({ title: 'Could not register file', description: insErr.message, variant: 'destructive' });
  }, [userId, sessionId, toast]);

  /* ------------------------- host scoring ------------------------- */
  const scoreSubmission = useCallback(async (mediaId: string, score: number, feedback: string) => {
    if (!isHost || !userId) return;
    const { error } = await supabase
      .from('live_session_media')
      .update({ score, feedback, scored_at: new Date().toISOString(), scored_by: userId } as any)
      .eq('id', mediaId);
    if (error) toast({ title: 'Score failed', description: error.message, variant: 'destructive' });
    else toast({ title: 'Submission scored' });
  }, [isHost, userId, toast]);

  return {
    participants,
    messages,
    media,
    joined,
    joinSession,
    leaveSession,
    setHandRaised,
    setCanSpeak,
    sendTextMessage,
    sendVoiceMessage,
    uploadMedia,
    scoreSubmission,
  };
}
