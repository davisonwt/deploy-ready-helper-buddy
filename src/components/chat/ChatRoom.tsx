import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { moderateStorageUpload, moderationRejectionMessage } from '@/lib/moderation/moderateUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  Send,
  Mic,
  Paperclip,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Square,
  DollarSign,
  Loader2,
  Edit2,
  Bell,
  BellOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ChatMessage from './ChatMessage';
import { DonateModal } from './DonateModal';
import { useCallManager } from '@/hooks/useCallManager';
import { subscribeRoomRealtime } from '@/lib/chat/roomRealtime';
import { JitsiCall } from '@/components/JitsiCall';
import { CallErrorBoundary } from '@/components/media/CallErrorBoundary';
import { DockedCallPane } from '@/components/media/DockedCallPane';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { RecordingBanner } from '@/components/media/RecordingBanner';
import { uploadChatMedia } from '@/lib/liveRoom/uploadMedia';
import { getVoiceColor, classifyVoiceState, initialFrom } from './voiceColor';


interface ChatRoomProps {
  roomId: string;
  onBack: () => void;
  /** Overrides the Back button's "Back" text -- e.g. "Back to Amber's stall" when this room was opened from a stall's SeedCard Message action (ChatApp.tsx's chatReturnTo). */
  backLabel?: string;
  /** When set, messages from this user are treated as "instructor" — others render a raised-hand badge. Classroom-only. */
  instructorId?: string;
  /** Optional side rail node (e.g. classroom lesson outline). Renders as a desktop aside + mobile top accordion when provided. */
  rail?: React.ReactNode;
  /** When true, each message wrapper plays a "drop in + impact ring" animation. SkillDrop-only. Respects prefers-reduced-motion. */
  dropAnimation?: boolean;
  /**
   * 'tap' (default): click to start recording, click again to stop -- /chatapp's
   * existing behavior, unchanged. 'hold': WhatsApp-style press-and-hold to
   * record, release to send, slide up past a threshold to cancel --
   * /conversations only. Every other recording behavior (useMediaRecorder,
   * upload, moderation, send) is identical either way.
   */
  recordGesture?: 'tap' | 'hold';
  /**
   * Default false: no back/title/participants row, no Invite, no $. A host
   * that already owns its own header (ConversationsPage, StallChatSheet)
   * leaves this off. A host that has no header of its own and needs
   * ChatRoom's (PremiumRoomViewPage) opts in explicitly.
   */
  showHeader?: boolean;
  /**
   * Default false: no mic/video record, call, or mute button. A host opts
   * in only when it has no other way to trigger recording/calling -- true
   * for /conversations and the stall chat sheet (recordGesture handles
   * how recording itself behaves once shown), true for PremiumRoomViewPage.
   *
   * This one used to be unconditional regardless of `embedded`, which is
   * exactly how "Delete Room" (see allowDeleteRoom below) kept reappearing
   * on hosts that never asked for it: 2026-09-19, three times in one day
   * (the duplicate-header fix on /conversations, the stall chat sheet a
   * few hours later, then Global Chat) a host had to notice and suppress
   * this component's own chrome piece by piece. Inverted here so nothing
   * renders unless a host asks for it by name -- a future host that
   * forgets to ask gets a bare message list and composer, never chrome it
   * didn't request.
   */
  showToolbar?: boolean;
  /**
   * Default false. Separate from showToolbar on purpose: Delete Room is
   * destructive and host-specific (PremiumRoomViewPage's room creator may
   * legitimately want it; /conversations and the stall sheet never should),
   * so a host asks for the whole toolbar and, only if it also genuinely
   * needs deletion, for this too. Still further gated at render time on
   * room_type/created_by/is_system_room -- this prop only says the HOST
   * permits the button to exist at all. The database is the real
   * boundary regardless (chat_rooms_delete / chat_participants_delete RLS,
   * 20260919160000_system_room_delete_immune.sql) -- this prop and that
   * gating are cosmetic on top of it, not instead of it.
   */
  allowDeleteRoom?: boolean;
  /**
   * Default false. The in-toolbar Phone button, separate from showToolbar
   * because it duplicates ConversationsPage's own call buttons on
   * /conversations (confirmed live 2026-09-19: two "start a call" controls
   * stacked directly above the message list) and is outright wrong in a
   * group room -- it calls "the first other participant found," meaningless
   * once a room has more than two people, which every room reachable via
   * /conversations now can. Only PremiumRoomViewPage, which has no other
   * calling entry point, opts in.
   */
  showCallButton?: boolean;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, onBack, backLabel, instructorId, rail, dropAnimation, recordGesture = 'tap', showHeader = false, showToolbar = false, allowDeleteRoom = false, showCallButton = false }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { startCall, currentCall, endCall } = useCallManager();
  const [messages, setMessages] = useState([]);
  // useAuth's `user` already carries the signed-in member's own `profiles`
  // row merged onto it (see fetchUserProfile in useAuth.jsx) -- the sender
  // of a just-sent message always knows their own name/avatar, so the
  // optimistic local append below never needs a round-trip and never
  // falls back to ChatMessage.jsx's "Unknown User" (which only fires when
  // `sender_profile` is missing entirely).
  const mySenderProfile = useMemo(() => (user ? {
    user_id: user.id,
    display_name: user.display_name,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    // Only meaningful for my OWN optimistic append -- ChatMessage.jsx's
    // name fallback chain uses it as a last resort before giving up, and
    // this is the one case where we're allowed to know the sender's
    // email (it's our own). A loaded/realtime message's profiles_public
    // join never carries email (deliberately not exposed for anyone
    // else, see 20260905160000_profiles_public_view.sql).
    email: user.email,
    avatar_url: user.avatar_url,
  } : null), [user]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const scrollAreaRef = useRef(null);
  
  // Voice + video clip recording (uses chat-media bucket via useMediaRecorder)
  const recorder = useMediaRecorder();
  // Hold-gesture (recordGesture="hold") slide-to-cancel tracking: the Y
  // coordinate the press started at, and whether the current hold has
  // already crossed the cancel threshold (so a late pointerup doesn't send).
  const holdStartYRef = useRef<number | null>(null);
  const holdCancelledRef = useRef(false);
  const HOLD_CANCEL_DISTANCE_PX = 60;


  // Donations
  const [showDonate, setShowDonate] = useState(false);

  // Mute notifications for this room only -- chat_participants.notifications_muted,
  // read by the chat_message_notify_participants trigger, which skips a
  // recipient with this set. Generic (any room), but Global Chat is the
  // room this exists for (a mandatory everyone-is-in-it room needs a way
  // to go quiet without leaving it).
  const [muted, setMuted] = useState(false);
  const toggleMuted = async () => {
    if (!user) return;
    const next = !muted;
    setMuted(next); // optimistic
    const { error } = await supabase
      .from('chat_participants')
      .update({ notifications_muted: next })
      .eq('room_id', roomId)
      .eq('user_id', user.id);
    if (error) {
      setMuted(!next);
      toast({ variant: 'destructive', title: 'Could not update mute setting', description: error.message });
    }
  };


  // Typing indicators
  const [usersTyping, setUsersTyping] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Message editing
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Message replies
  const [replyingTo, setReplyingTo] = useState<any>(null);

  // In-room invites
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  // Names that matched the search but are already in this room -- shown
  // instead of a misleading "No users found".
  const [alreadyInRoom, setAlreadyInRoom] = useState<string[]>([]);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);

  // --- Voice trail (visual only) ---------------------------------------
  // Per-user most recent message timestamp drives the active/recent/idle
  // ring state in the avatar trail. Honest signal: message recency only,
  // no presence channel exists yet in this code path.
  const lastSpokeAtByUser = useMemo(() => {
    const map: Record<string, string> = {};
    for (let i = messages.length - 1; i >= 0; i--) {
      const m: any = messages[i];
      if (m?.sender_id && !map[m.sender_id]) map[m.sender_id] = m.created_at;
    }
    return map;
  }, [messages]);

  // Brief "pop" tag for the latest sender's avatar in the trail (400ms).
  const [poppedUserId, setPoppedUserId] = useState<string | null>(null);
  const popTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeenMsgIdRef = useRef<string | null>(null);
  useEffect(() => {
    const last: any = messages[messages.length - 1];
    if (!last || last.id === lastSeenMsgIdRef.current) return;
    lastSeenMsgIdRef.current = last.id;
    if (last.sender_id && last.sender_id !== user?.id) {
      setPoppedUserId(last.sender_id);
      if (popTimerRef.current) clearTimeout(popTimerRef.current);
      popTimerRef.current = setTimeout(() => setPoppedUserId(null), 420);
    }
    return () => { if (popTimerRef.current) clearTimeout(popTimerRef.current); };
  }, [messages, user?.id]);
  // ---------------------------------------------------------------------


  const userId = user?.id;
  useEffect(() => {
    if (!roomId || !userId) return;
    console.debug('[ChatRoom] init', { roomId, userId });
    fetchRoomInfo();
    fetchMessages();
    fetchParticipants();
    supabase
      .from('chat_participants')
      .select('notifications_muted')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setMuted(!!data?.notifications_muted));
    // Realtime: unique per-run channel topics, every .on() before
    // .subscribe(), and the cleanup is RETURNED so React removes the
    // channels before this effect runs again (room switch, auth refresh,
    // StrictMode double-invoke). The old code discarded the cleanups, so a
    // re-run reused the already-subscribed `room:<id>` channel and threw
    // "cannot add postgres_changes callbacks ... after subscribe()".
    const { cleanup } = setupRealtimeSubscription();
    return cleanup;
    // Deliberately keyed on user.id, not the user object, whose identity
    // changes on every auth refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive. scrollAreaRef is now the
    // scrollable element itself (a plain overflow-y-auto div, not Radix
    // ScrollArea), so no nested viewport to query for.
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchRoomInfo = async () => {
    console.debug('[ChatRoom] fetchRoomInfo start', { roomId, userId: user?.id });
    try {
      // First try: if user is the creator, fetch room directly
      const { count: creatorCount } = await supabase
        .from('chat_rooms')
        .select('id', { count: 'exact', head: true })
        .eq('id', roomId)
        .eq('created_by', user.id);

      if ((creatorCount || 0) > 0) {
        const { data: room } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('id', roomId)
          .maybeSingle();
        if (room) {
          setRoomInfo(room);
          return;
        }
      }

      // Fallback: participant-based access (works for members)
      const { data, error } = await supabase
        .from('chat_participants')
        .select('chat_rooms!inner(*)')
        .eq('user_id', user.id)
        .eq('room_id', roomId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      const room = (data as any)?.chat_rooms || null;
      if (!room || room.is_active === false) {
        toast({ title: 'Chat unavailable', description: 'This chat no longer exists or was archived.' });
        onBack?.();
        return;
      }

      setRoomInfo(room);
    } catch (error) {
      console.error('Error fetching room info:', error);
      toast({ title: 'Chat unavailable', description: 'Could not open this chat.' });
      onBack?.();
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      console.debug('[ChatRoom] fetchMessages start', { roomId });
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      console.debug('[ChatRoom] fetchMessages loaded', { count: (data || []).length });
      
      // Fetch profiles separately for all unique sender IDs
      const senderIds = Array.from(new Set((data || []).map(m => m.sender_id)));
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('user_id, display_name, first_name, last_name, username, avatar_url')
          .in('user_id', senderIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        
        // Enrich messages with profile data
        const enriched = (data || []).map(msg => ({
          ...msg,
          sender_profile: profileMap.get(msg.sender_id) || null
        }));
        
        setMessages(enriched);
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Participants
  const fetchParticipants = async () => {
    try {
      // Fetch active participants without relying on a missing FK relationship
      const { data: partRows, error: partErr } = await supabase
.from('chat_participants')
        .select('user_id')
        .eq('room_id', roomId)
        .eq('is_active', true);
      if (partErr) throw partErr;

      const ids = (partRows || []).map((r: any) => r.user_id);
      setParticipantIds(ids);

      if (ids.length === 0) {
        setParticipants([]);
        return;
      }

      // Fetch profiles separately and merge
      const { data: profs, error: profErr } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, first_name, last_name, avatar_url')
        .in('user_id', ids);
      if (profErr) throw profErr;

      const profileById: Record<string, any> = Object.fromEntries(
        (profs || []).map((p: any) => [p.user_id, p])
      );

      const enriched = ids.map((uid: string) => ({
        user_id: uid,
        profiles: profileById[uid] || null,
      }));

      setParticipants(enriched);
    } catch (e) {
      console.error('Error fetching participants:', e);
      setParticipants([]);
    }
  };

  // Fallback: If RLS prevents seeing other participants, infer from messages
  useEffect(() => {
    const inferOther = async () => {
      try {
        if (!user?.id) return;
        if ((participants || []).length >= 2) return;
        const otherId = (messages || []).map((m:any) => m.sender_id).find((id:string) => id && id !== user.id);
        if (!otherId) return;
        if (participants.some((p:any) => p.user_id === otherId)) return;
        const { data: prof } = await supabase
          .from('profiles_public')
          .select('user_id, display_name, first_name, last_name, avatar_url')
          .eq('user_id', otherId)
          .maybeSingle();
        setParticipants(prev => {
          // Prevent duplicates
          if (prev.some((p:any) => p.user_id === otherId)) return prev;
          return [...prev, { user_id: otherId, profiles: prof || null }];
        });
      } catch (e) {
        console.warn('Participant inference failed:', e);
      }
    };
    inferOther();
  }, [participants, messages, user?.id]);
  // Ensure current user is a member of this room before sending
  const ensureMembership = async () => {
    try {
      if (!participantIds.includes(user.id)) {
        const { error } = await supabase
          .from('chat_participants')
          .insert({ room_id: roomId, user_id: user.id, is_moderator: false, is_active: true } as any);
        // Ignore duplicate errors
        if (error && (error as any)?.code !== '23505') throw error;
        await fetchParticipants();
      }
    } catch (e) {
      console.error('ensureMembership error:', e);
    }
  };

  useEffect(() => {
    if (roomId && user) {
      fetchParticipants();
    }
  }, [roomId, user]);

  // Load available users when invite dialog is open or search changes
  useEffect(() => {
    const run = async () => {
      if (!inviteOpen) return;
      try {
        setLoadingUsers(true);
        let query = supabase
          .from('profiles_public')
          .select('user_id, display_name, first_name, last_name, avatar_url')
          .neq('user_id', user.id)
          .limit(20);
        if (inviteSearch.trim()) {
          query = query.or(`display_name.ilike.%${inviteSearch}%,first_name.ilike.%${inviteSearch}%,last_name.ilike.%${inviteSearch}%`);
        }
        const { data, error } = await query;
        if (error) throw error;
        // Filter out blank names and current participants
        const nameOf = (u: any) => (u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim());
        const filtered = (data || []).filter((u: any) => {
          const name = nameOf(u);
          return !participantIds.includes(u.user_id) && name.length > 1 && name !== ' ';
        });
        setAlreadyInRoom((data || []).filter((u: any) => participantIds.includes(u.user_id)).map(nameOf));
        setAvailableUsers(filtered);
      } catch (e: any) {
        console.error('Error loading users:', e);
      } finally {
        setLoadingUsers(false);
      }
    };
    run();
  }, [inviteOpen, inviteSearch, participantIds, user?.id]);

  const toggleInvitee = (uid: string) => {
    setSelectedInvitees(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handleInvite = async () => {
    if (selectedInvitees.length === 0) return;
    try {
      const rows = selectedInvitees.map(uid => ({
        room_id: roomId,
        user_id: uid,
        is_moderator: false,
        is_active: true
      }));
      const { error } = await supabase.from('chat_participants').upsert(rows, { onConflict: 'room_id,user_id' });
      if (error) throw error;
      toast({ title: 'Invitations sent', description: `${selectedInvitees.length} user(s) invited` });
      setInviteOpen(false);
      setSelectedInvitees([]);
      setInviteSearch('');
      fetchParticipants();
    } catch (e: any) {
      console.error('Invite error:', e);
      toast({ variant: 'destructive', title: 'Invite failed', description: e.message });
    }
  };

  // Both room channels (messages/room changes + typing) via one helper --
  // see src/lib/chat/roomRealtime.ts for the rules it enforces.
  const setupRealtimeSubscription = () =>
    subscribeRoomRealtime(supabase, roomId, {
      onMessageInsert: async (payload) => {
        // The sender's own message is already appended locally (see
        // handleSendMessage/handleFileUpload/recordAndSend) the moment its
        // insert resolves -- this realtime echo would otherwise render it
        // a second time (it used to: unconditional append here, no id
        // check, was the second "duplicate" bubble on top of the first
        // "Unknown User" one from the un-enriched optimistic append).
        // Fetch the message and its sender profile separately
        const { data: msg } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('id', payload.new.id)
          .maybeSingle();

        if (msg) {
          const { data: profile } = await supabase
            .from('profiles_public')
            .select('user_id, display_name, first_name, last_name, username, avatar_url')
            .eq('user_id', msg.sender_id)
            .maybeSingle();

          setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, sender_profile: profile || null }]));
        }
      },
      // Right now this only carries delete-for-everyone (deleted_at) to
      // every OTHER participant live, without a reload -- the deleter's own
      // screen already updated optimistically in handleDeleteMessage.
      onMessageUpdate: (payload) => {
        const updated = payload.new;
        if (!updated?.id) return;
        setMessages(prev => prev.map(msg => (msg.id === updated.id ? { ...msg, ...updated } : msg)));
      },
      onRoomDeleted: () => {
        toast({ title: 'Chat removed', description: 'This chat was deleted.' });
        onBack?.();
      },
      onRoomUpdated: (payload) => {
        if ((payload.new as any)?.is_active === false) {
          toast({ title: 'Chat archived', description: 'This chat is no longer available.' });
          onBack?.();
        }
      },
      onTyping: (payload: any) => {
        if (payload.new && payload.new.user_id !== user?.id) {
          setUsersTyping(prev => {
            const filtered = prev.filter(id => id !== payload.new.user_id);
            if (payload.new.is_typing) {
              return [...filtered, payload.new.user_id];
            }
            return filtered;
          });
        }
      },
    });

  // Handle typing indicator
  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing status (ignore errors if table doesn't exist yet)
    supabase
      .from('typing' as any)
      .upsert({ room_id: roomId, user_id: user.id, is_typing: true } as any, { onConflict: 'room_id,user_id' } as any)
      .then(() => {
        typingTimeoutRef.current = setTimeout(async () => {
          try {
            await supabase
              .from('typing' as any)
              .delete()
              .eq('room_id', roomId)
              .eq('user_id', user.id);
          } catch (e) {
            // Ignore typing errors
          }
        }, 2000);
      });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return;

    try {
      setSending(true);
      // Use secure RPC that enforces membership and inserts as the current user
      const { data: inserted, error } = await supabase.rpc('send_chat_message', {
        p_room_id: roomId,
        p_content: replyingTo ? `@${replyingTo.sender_profile?.display_name || 'user'}: ${message.trim()}` : message.trim(),
        p_message_type: 'text'
      });

      if (error) throw error;

      // Optimistically append so it shows even if realtime publication isn't
      // enabled -- carries the sender's own profile immediately (never
      // "Unknown User"), and the realtime echo above dedupes by id so this
      // never renders twice.
      if (inserted) {
        setMessages(prev => (prev.some(m => m.id === inserted.id) ? prev : [...prev, { ...inserted, sender_profile: mySenderProfile }]));
      }
      setMessage('');
      setReplyingTo(null);

      // Typing clear best-effort
      try {
        await supabase
          .from('typing' as any)
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', user.id);
      } catch (e) {}
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send',
        description: error?.message || 'Could not send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };
  // Delete for everyone, any message type, no time limit. A soft delete
  // (deleted_at) so every participant sees "This message was deleted"
  // instead of the thread silently rewriting itself, plus a real removal of
  // the underlying storage object (voice note/video/attachment) so it stops
  // being fetchable by its stored URL. Both happen server-side in
  // delete-chat-message -- see that function for why (no bucket has a
  // per-message DELETE policy, so only the service role can remove the
  // object; sender-only is enforced there too, not just by this client
  // check).
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message for everyone?')) return;
    try {
      const { data, error } = await supabase.functions.invoke('delete-chat-message', {
        body: { messageId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);

      setMessages(prev => prev.map(msg => (
        msg.id === messageId
          ? { ...msg, deleted_at: new Date().toISOString(), content: null, file_url: null, file_name: null, file_type: null, file_size: null }
          : msg
      )));
      toast({ title: 'Message deleted' });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ content: newContent, is_edited: true })
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, content: newContent, is_edited: true } : msg
        )
      );

      setEditingMessageId(null);
      toast({ title: 'Message updated' });
    } catch (error: any) {
      toast({
        title: 'Edit failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // 15MB: a user-picked file (e.g. a full-res phone video) can be far
  // bigger than anything the in-app recorder produces (60s voice / 15s
  // video are a few MB at most) -- mobile data is the constraint, not the
  // server, so this is checked before upload starts, not after a timeout.
  const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

  const handleFileUpload = async (file) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: `${file.name} is over 15MB. Try a shorter clip or a smaller image.`,
      });
      return;
    }
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      const isVideo = file.type.startsWith('video/');
      const mod = await moderateStorageUpload('chat-files', filePath, isVideo ? 'video' : 'image');
      if (mod.verdict !== 'allow') {
        const kind = isVideo ? 'video' : file.type.startsWith('image/') ? 'image' : 'file';
        toast({ title: 'File not sent', description: moderationRejectionMessage(mod.reason, kind), variant: 'destructive' });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      // Determine file type
      let fileType: 'audio' | 'document' | 'image' | 'video' = 'document';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type.startsWith('audio/')) fileType = 'audio';

      await ensureMembership();
      const { data: inserted, error } = await supabase.rpc('send_chat_message', {
        p_room_id: roomId,
        p_content: '[File]',
        p_message_type: 'file',
        p_file_url: publicUrl,
        p_file_name: file.name,
        p_file_type: fileType,
        p_file_size: file.size
      });
      if (error) throw error;
      if (inserted) {
        setMessages(prev => (prev.some(m => m.id === inserted.id) ? prev : [...prev, { ...inserted, sender_profile: mySenderProfile }]));
      }

      toast({
        title: 'File uploaded',
        description: 'File uploaded successfully',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message,
      });
    }
  };
  const recordAndSend = async (kind: 'audio' | 'video', maxSeconds: number) => {
    try {
      await ensureMembership();
      const blob = await recorder.start(kind, maxSeconds);
      if (!blob || blob.size === 0) {
        if (blob) {
          // Recording ran but produced no usable data -- tell the member
          // instead of silently doing nothing (the previous iOS symptom:
          // "Stop & send" appeared to work but nothing was ever sent).
          toast({ variant: 'destructive', title: 'Recording failed', description: 'Nothing was captured — please try again.' });
        }
        return;
      }
      // Derived from the blob's own type (set by useMediaRecorder from
      // whichever mimeType actually got used) rather than hardcoded --
      // iOS Safari records video/mp4, not video/webm.
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const { signedUrl } = await uploadChatMedia(roomId, blob, ext);
      const isVoice = kind === 'audio';
      const { data: inserted, error } = await supabase.rpc('send_chat_message', {
        p_room_id: roomId,
        p_content: isVoice ? '[Voice Note]' : '[Video Clip]',
        p_message_type: isVoice ? 'voice' : 'video',
        p_file_url: signedUrl,
        p_file_name: isVoice ? `voice-note.${ext}` : `video-clip.${ext}`,
        p_file_type: isVoice ? 'audio' : 'video',
        p_file_size: blob.size,
      });
      if (error) throw error;
      if (inserted) {
        setMessages(prev => (prev.some(m => m.id === inserted.id) ? prev : [...prev, { ...inserted, sender_profile: mySenderProfile }]));
      }
    } catch (error: any) {
      console.error('Recording error:', error);
      toast({ variant: 'destructive', title: 'Recording failed', description: error?.message || 'Could not capture media' });
    }
  };

  const startRecording = () => recordAndSend('audio', 60);
  // 15s, not the old 30s: a message-thread clip doesn't need 30s, and this
  // is mobile data, not server load, that the cap protects against.
  const startVideoClip = () => recordAndSend('video', 15);
  const stopRecording = () => recorder.stop();

  // recordGesture="hold" only: press-and-hold to record, release to send,
  // slide up past HOLD_CANCEL_DISTANCE_PX to cancel. Reuses the exact same
  // startRecording/startVideoClip/recorder.cancel() as the tap gesture --
  // only how they're triggered changes.
  const handleHoldStart = (kind: 'audio' | 'video') => (e: React.PointerEvent) => {
    if (recorder.recording) return;
    holdStartYRef.current = e.clientY;
    holdCancelledRef.current = false;
    if (kind === 'audio') startRecording(); else startVideoClip();
  };
  const handleHoldMove = (e: React.PointerEvent) => {
    if (!recorder.recording || holdStartYRef.current === null || holdCancelledRef.current) return;
    if (holdStartYRef.current - e.clientY > HOLD_CANCEL_DISTANCE_PX) {
      holdCancelledRef.current = true;
      recorder.cancel();
    }
  };
  const handleHoldEnd = () => {
    if (!recorder.recording) return;
    if (!holdCancelledRef.current) recorder.stop();
    holdStartYRef.current = null;
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    // No min-h floor -- ChatRoom.tsx must fit whatever height its parent
    // actually gives it (a full page, or a height-constrained sheet like
    // StallChatSheet.tsx). A hardcoded min-h-[600px] here forced this
    // component past a sheet's own bounds on any viewport shorter than
    // 600px (844x390 landscape, a 560px laptop), pushing the composer out
    // of reach with the message list not scrolling to compensate --
    // same bug class as ShareSeedDialog.tsx's 2026-09-17 fix, and min-h-0
    // is just as load-bearing here on every flex child in the chain.
    <div className="flex h-full min-h-0">
      {rail && (
        <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-r border-[#8B5CF6]/25 bg-[#14101F]/90 overflow-y-auto">
          {rail}
        </aside>
      )}
      <div className="flex min-h-0 flex-1 flex-col min-w-0 bg-[#0E1B15] text-[#F3F7F0]">
        {rail && (
          <div className="lg:hidden border-b border-[#8B5CF6]/25 bg-[#14101F]/90">
            {rail}
          </div>
        )}
      {/* Header -- sticky so Voice/Video call buttons stay reachable while
          the message list scrolls underneath it. */}
      <div className="sticky top-0 z-20 border-b border-[#4FA876]/15 bg-[#0E1B15]/95 backdrop-blur px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {showHeader && (
          <div className="flex items-center gap-4 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-[#8AA99A] hover:text-[#F3F7F0] hover:bg-[#4FA876]/10 px-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="text-sm">{backLabel || 'Back'}</span>
            </Button>
            <div className="min-w-0">
              <h2
                className="text-2xl tracking-tight truncate text-[#F3F7F0]"
                style={{ fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 600 }}
              >
                {roomInfo?.name}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                {participants.length > 0 && (() => {
                  const visible = participants.slice(0, 6);
                  const extra = Math.max(0, participants.length - visible.length);
                  const activeCount = participants.filter((p: any) =>
                    classifyVoiceState(lastSpokeAtByUser[p.user_id]) === 'active'
                  ).length;
                  return (
                    <>
                      <div className="flex -space-x-2.5">
                        {visible.map((p: any) => {
                          const color = getVoiceColor(p.user_id);
                          const state = classifyVoiceState(lastSpokeAtByUser[p.user_id]);
                          const popped = poppedUserId === p.user_id;
                          const ringOpacity = state === 'active' ? 1 : state === 'recent' ? 0.55 : 0.18;
                          return (
                            <div
                              key={p.user_id}
                              className="relative rounded-full motion-reduce:transition-none transition-transform duration-300"
                              style={{
                                transform: popped ? 'scale(1.18)' : 'scale(1)',
                                filter: popped ? `drop-shadow(0 0 10px ${color.glow})` : 'none',
                              }}
                              title={p.profiles?.display_name || p.profiles?.first_name || 'Member'}
                            >
                              <Avatar
                                className="h-8 w-8 border-2"
                                style={{ borderColor: color.ring, opacity: 0.4 + 0.6 * ringOpacity }}
                              >
                                <AvatarImage src={p.profiles?.avatar_url} />
                                <AvatarFallback
                                  className="text-[11px]"
                                  style={{ background: '#123330', color: color.ring }}
                                >
                                  {initialFrom(p.profiles?.display_name || p.profiles?.first_name)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          );
                        })}
                        {extra > 0 && (
                          <div
                            className="h-8 w-8 rounded-full border-2 border-[#4FA876]/30 bg-[#123330] flex items-center justify-center text-[10px] font-semibold text-[#8AA99A]"
                          >
                            +{extra}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-[#8AA99A] tabular-nums">
                        {activeCount > 0
                          ? `${activeCount} here now`
                          : `${participants.length} member${participants.length !== 1 ? 's' : ''}`}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {showToolbar && (
            <>
            <Button
              variant={recorder.recording && recorder.kind === 'audio' ? 'destructive' : 'ghost'}
              size="sm"
              {...(recordGesture === 'hold'
                ? {
                    onPointerDown: handleHoldStart('audio'),
                    onPointerUp: handleHoldEnd,
                    onPointerLeave: handleHoldEnd,
                    onPointerMove: handleHoldMove,
                  }
                : { onClick: recorder.recording && recorder.kind === 'audio' ? stopRecording : startRecording })}
              title={
                recorder.recording && recorder.kind === 'audio'
                  ? `${recordGesture === 'hold' ? 'Slide up to cancel' : 'Stop'} (${recorder.elapsed}s)`
                  : recordGesture === 'hold' ? 'Hold to record a voice note' : 'Record voice note'
              }
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button
              variant={recorder.recording && recorder.kind === 'video' ? 'destructive' : 'ghost'}
              size="sm"
              {...(recordGesture === 'hold'
                ? {
                    onPointerDown: handleHoldStart('video'),
                    onPointerUp: handleHoldEnd,
                    onPointerLeave: handleHoldEnd,
                    onPointerMove: handleHoldMove,
                  }
                : { onClick: recorder.recording && recorder.kind === 'video' ? stopRecording : startVideoClip })}
              title={
                recorder.recording && recorder.kind === 'video'
                  ? `${recordGesture === 'hold' ? 'Slide up to cancel' : 'Stop'} (${recorder.elapsed}s)`
                  : recordGesture === 'hold' ? 'Hold to record a video message' : 'Record video clip'
              }
            >
              {recorder.recording && recorder.kind === 'video' ? <Square className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            </Button>
            
            {showCallButton && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Start video call"
              onClick={async () => {
                console.log('📞 [ChatRoom] Phone button clicked');
                console.log('📞 [ChatRoom] Current user:', user?.id);
                console.log('📞 [ChatRoom] Participants:', participants);
                console.log('📞 [ChatRoom] startCall function:', typeof startCall);
                
                if (!startCall) {
                  console.error('❌ [ChatRoom] startCall is not available!');
                  toast({
                    title: "Error",
                    description: "Call system not initialized. Please refresh the page.",
                    variant: "destructive"
                  });
                  return;
                }
                
                // Find the other participant (not the current user)
                const otherParticipant = participants.find((p: any) => p.user_id !== user?.id);
                console.log('📞 [ChatRoom] Other participant found:', otherParticipant);
                
                if (!otherParticipant) {
                  console.error('❌ [ChatRoom] No other participant found');
                  toast({
                    title: "Error",
                    description: "No other participant found in this chat",
                    variant: "destructive"
                  });
                  return;
                }
                
                const receiverName = otherParticipant.profiles?.display_name || 
                                   `${otherParticipant.profiles?.first_name || ''} ${otherParticipant.profiles?.last_name || ''}`.trim() ||
                                   'User';
                
                console.log('📞 [ChatRoom] Starting call to:', otherParticipant.user_id, receiverName);
                
                try {
                  const result = await startCall(otherParticipant.user_id, receiverName, 'video', roomId);
                  console.log('📞 [ChatRoom] startCall result:', result);
                  if (!result) {
                    console.error('❌ [ChatRoom] startCall returned null/undefined');
                    toast({
                      title: "Call Failed",
                      description: "Failed to start the call. Check console for details.",
                      variant: "destructive"
                    });
                  }
                } catch (error) {
                  console.error('❌ [ChatRoom] Error calling startCall:', error);
                  toast({
                    title: "Call Error",
                    description: error instanceof Error ? error.message : "Unknown error occurred",
                    variant: "destructive"
                  });
                }
              }}
            >
              <Phone className="h-4 w-4" />
            </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMuted}
              aria-label={muted ? 'Unmute this room' : 'Mute this room'}
              title={muted ? 'Unmute this room' : 'Mute this room'}
            >
              {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </Button>
            </>
            )}

            {showHeader && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInviteOpen(true)}
            >
              Invite
            </Button>
            )}

            {/* Not for direct (1:1) rooms, ever, not a system room, ever
                (Global Chat: is_system_room=true -- nobody deletes it, not
                its creator, not gosat), and not unless the host explicitly
                allows it (allowDeleteRoom). Found 2026-09-19:
                get_or_create_direct_room sets created_by to whoever RPC'd
                it first -- the visitor, for the stall-chat button -- so
                "creator" here does not mean "the sower's room" or anything
                like ownership; it just means "whoever tapped first," and
                this button let that person unilaterally wipe the room, its
                messages, and the other participant's membership. A 1:1 DM
                has no one who should hold that power over the other side.
                Group rooms keep it -- a real creator/moderator concept
                still makes sense there. RLS is the real boundary regardless
                of any of these three conditions (chat_rooms_delete /
                chat_participants_delete, 20260919160000_system_room_delete_immune.sql)
                -- this button being hidden was never the actual security
                boundary, just the visible one. */}
            {allowDeleteRoom && roomInfo?.room_type !== 'direct' && !roomInfo?.is_system_room && roomInfo?.created_by === user?.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (!confirm('Delete this entire chat room? This cannot be undone.')) return;
                  try {
                    await supabase.from('chat_messages').delete().eq('room_id', roomId);
                    await supabase.from('chat_participants').delete().eq('room_id', roomId);
                    await supabase.from('chat_rooms').delete().eq('id', roomId);
                    toast({ title: 'Room deleted' });
                    onBack();
                  } catch (error: any) {
                    toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
                  }
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete Room
              </Button>
            )}
            
            {showHeader && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDonate(true)}
            >
              <DollarSign className="h-4 w-4" />
            </Button>
            )}

            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach(handleFileUpload);
                }}
              />
              <Button variant="ghost" size="sm" asChild>
                <span>
                  <Paperclip className="h-4 w-4" />
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      {recorder.recording && (
        <RecordingBanner
          kind={recorder.kind}
          elapsed={recorder.elapsed}
          stream={recorder.stream}
          mimeType={recorder.mimeType}
          error={recorder.error}
          onCancel={recorder.cancel}
          onStop={stopRecording}
        />
      )}

      {/* Video call - docked pane, doesn't take over the screen -- messages
          and the input footer below stay usable for the whole call. */}
      {currentCall && currentCall.status === 'accepted' && (
        <DockedCallPane>
          <CallErrorBoundary
            onBack={() => {
              if (currentCall?.id) {
                endCall(currentCall.id, 'ended');
              }
            }}
          >
            <JitsiCall
              roomName={currentCall.id}
              roomKind="call_session"
              fullHeight
              onLeave={() => {
                if (currentCall?.id) {
                  endCall(currentCall.id, 'ended');
                }
              }}
            />
          </CallErrorBoundary>
        </DockedCallPane>
      )}

      {/* Messages Area -- a plain overflow container, NOT Radix ScrollArea.
          ScrollArea's inner viewport is h-full (height:100%), which only
          resolves against a parent with a definite height; here the parent
          is a flex item sized by flex-1, whose computed height stays auto,
          so the viewport grew to its content and the composer footer below
          landed off-screen with nothing scrollable to reach it -- same
          fix as ShareSeedDialog.tsx's 2026-09-17 member list. */}
      <div ref={scrollAreaRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {/* Typing Indicator */}
        {usersTyping.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-[#8AA99A] mb-3 p-2 bg-[#123330]/40 rounded-lg border border-[#4FA876]/15">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 bg-[#F2C14E] rounded-full animate-bounce motion-reduce:animate-none"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <span>
              {usersTyping.slice(0, 2).join(', ')}
              {usersTyping.length > 2 && ' and others'} typing...
            </span>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => {
            const isEditing = editingMessageId === msg.id;
            const isOwn = msg.sender_id === user.id;

            return (
              <div key={msg.id} className={`group ${dropAnimation ? 'skilldrop-message' : ''}`}>
                {replyingTo?.id === msg.id && (
                  <div className="mb-2 ml-12 p-2 bg-muted/50 rounded-lg border-l-2 border-primary text-xs">
                    <div className="flex items-center justify-between">
                      <span>Replying to this message</span>
                      <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-5 px-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full px-4">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleEditMessage(msg.id, editText);
                        }
                      }}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleEditMessage(msg.id, editText)}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (() => {
                  const voice = getVoiceColor(msg.sender_id);
                  return (
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4`}>
                    <div className="flex flex-col gap-1">
                      <div
                        className="rounded-r-lg"
                        style={isOwn
                          ? undefined
                          : { borderLeft: `2px solid ${voice.ring}`, paddingLeft: 8, background: voice.tint }
                        }
                      >
                        <ChatMessage
                          message={msg}
                          isOwn={isOwn}
                          onDelete={isOwn ? () => handleDeleteMessage(msg.id) : undefined}
                          isInstructor={instructorId ? msg.sender_id === instructorId : undefined}
                          instructorMode={!!instructorId}
                        />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(msg)}
                          className="h-6 px-2 text-xs text-[#8AA99A] hover:text-[#F3F7F0] hover:bg-[#4FA876]/10"
                        >
                          Reply
                        </Button>
                        {isOwn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditText(msg.content || '');
                            }}
                            className="h-6 px-2 text-xs text-[#8AA99A] hover:text-[#F3F7F0] hover:bg-[#4FA876]/10"
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Input Area -- shrink-0 so the flex-1 message list above never
          squeezes the composer, and so it stays visibly at its content
          size even before the list has anything to scroll. */}
      <div className="shrink-0 border-t border-[#4FA876]/15 bg-[#0E1B15]/95 backdrop-blur p-4">
        {replyingTo && (
          <div className="mb-2 p-2 bg-[#123330]/50 rounded-lg border-l-2 border-[#F2C14E] text-xs flex items-center justify-between text-[#F3F7F0]">
            <div>
              <span className="font-semibold">Replying to:</span>
              <span className="ml-2 text-[#8AA99A]">{replyingTo.content?.substring(0, 50)}...</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-6 px-2 text-[#8AA99A] hover:text-[#F3F7F0] hover:bg-transparent">
              Cancel
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
            disabled={sending}
            onFocus={handleTyping}
            className="bg-[#123330]/60 border-[#4FA876]/20 text-[#F3F7F0] placeholder:text-[#8AA99A] focus-visible:ring-[#4FA876]/40 focus-visible:border-[#4FA876]/50"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sending}
            size="icon"
            className="bg-[#4FA876] text-[#0E1B15] hover:bg-[#4FA876]/90 disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Invite Users Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite users</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search users by name..."
              value={inviteSearch}
              onChange={(e) => setInviteSearch(e.target.value)}
            />
            <div className="text-xs text-muted-foreground">Selected: {selectedInvitees.length}</div>
            <ScrollArea className="h-56 border rounded-md p-2">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">Loading...</div>
              ) : availableUsers.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground text-center px-4">
                  {alreadyInRoom.length > 0
                    ? `${alreadyInRoom.join(', ')} ${alreadyInRoom.length === 1 ? 'is' : 'are'} already in this chat`
                    : inviteSearch.trim() ? 'No members match that name' : 'Start typing to search for members'}
                </div>
              ) : (
                <div className="space-y-2">
                  {availableUsers.map((u: any) => (
                    <div
                      key={u.user_id}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                      onClick={() => toggleInvitee(u.user_id)}
                    >
                      <Checkbox
                        checked={selectedInvitees.includes(u.user_id)}
                        onCheckedChange={() => toggleInvitee(u.user_id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback>{(u.display_name || u.first_name || 'U')?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm truncate">
                        {u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown User'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={selectedInvitees.length === 0}>Invite</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Donate Modal */}
      <DonateModal
        isOpen={showDonate}
        onClose={() => setShowDonate(false)}
        hostWallet={roomInfo?.created_by}
        hostName={roomInfo?.name}
      />

      </div>
    </div>
  );
};
