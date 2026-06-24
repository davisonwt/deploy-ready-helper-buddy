import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Calendar, Hand, Heart, Loader2, Tag, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useClassroomLive } from '@/hooks/useClassroomLive';
import { useToast } from '@/hooks/use-toast';
import { JITSI_CONFIG } from '@/lib/jitsi-config';
import { HandQueuePanel } from './HandQueuePanel';
import { DocumentsPanel } from './DocumentsPanel';
import { SubmissionsPanel } from './SubmissionsPanel';
import { SessionMessages } from './SessionMessages';
import { BestowalDialog } from './BestowalDialog';

interface ClassroomSession {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  status: string | null;
  instructor_id: string;
  is_free: boolean | null;
  session_fee: number | string | null;
  chat_room_id: string | null;
}

interface Props {
  session: ClassroomSession;
}

export default function ClassroomLiveRoom({ session }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isHost = !!user && user.id === session.instructor_id;
  const userId = user?.id ?? null;

  const {
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
  } = useClassroomLive({ sessionId: session.id, userId, isHost });

  const me = useMemo(
    () => participants.find((p) => p.user_id === userId) ?? null,
    [participants, userId],
  );
  const hostName = useMemo(
    () => participants.find((p) => p.user_id === session.instructor_id)?.display_name ?? 'Instructor',
    [participants, session.instructor_id],
  );

  /* -------------------- Jitsi container + api -------------------- */
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [jitsiLoading, setJitsiLoading] = useState(true);
  const [audioMuted, setAudioMuted] = useState(true);
  const audioMutedRef = useRef(true);
  useEffect(() => { audioMutedRef.current = audioMuted; }, [audioMuted]);
  const handRaisedJitsiRef = useRef(false);
  const [bestowOpen, setBestowOpen] = useState(false);

  /* On mount: join DB and Jitsi */
  useEffect(() => {
    if (!userId) return;
    joinSession();
    const onUnload = () => {
      // Best-effort cleanup
      if (apiRef.current) { try { apiRef.current.dispose(); } catch {} }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      leaveSession();
      if (apiRef.current) { try { apiRef.current.dispose(); } catch {}; apiRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, session.id]);

  /* Load Jitsi once user has joined */
  useEffect(() => {
    if (!joined || !user) return;
    if (apiRef.current) return;
    const roomName = JITSI_CONFIG.generateRoomName('classroom', session.id);
    const displayName =
      (user as any).user_metadata?.display_name ||
      (user as any).user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Sower';

    const start = () => {
      if (!containerRef.current) return;
      try {
        const options = JITSI_CONFIG.createJitsiOptions(roomName, displayName, 'live', {
          configOverwrite: {
            ...JITSI_CONFIG.getLiveRoomConfig(),
            startWithAudioMuted: !isHost,
            startWithVideoMuted: true,
            subject: session.title,
          },
          interfaceConfigOverwrite: JITSI_CONFIG.getInterfaceConfig({
            toolbarButtons: isHost
              ? ['microphone', 'camera', 'desktop', 'tileview', 'settings', 'hangup']
              : ['microphone', 'camera', 'settings', 'hangup'],
          }),
        });
        (options as any).parentNode = containerRef.current;
        const api = new (window as any).JitsiMeetExternalAPI(JITSI_CONFIG.domain, options);
        apiRef.current = api;
        api.addListener('videoConferenceJoined', () => setJitsiLoading(false));
        api.addListener('audioMuteStatusChanged', ({ muted }: { muted: boolean }) => {
          setAudioMuted(muted);
        });
        api.addListener('readyToClose', () => {
          handleLeave();
        });
      } catch (e) {
        console.error('Jitsi init', e);
        setJitsiLoading(false);
      }
    };

    if ((window as any).JitsiMeetExternalAPI) start();
    else {
      const s = document.createElement('script');
      s.src = `https://${JITSI_CONFIG.domain}/external_api.js`;
      s.async = true;
      s.onload = start;
      s.onerror = () => setJitsiLoading(false);
      document.body.appendChild(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, user?.id, session.id, isHost]);

  /* Sync can_speak (from host) -> Jitsi mute state for attendees */
  const lastCanSpeakRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!apiRef.current || !me || isHost) return;
    const canSpeak = !!me.can_speak;
    if (lastCanSpeakRef.current === canSpeak) return;
    const wasNull = lastCanSpeakRef.current === null;
    lastCanSpeakRef.current = canSpeak;

    if (canSpeak && !wasNull) {
      toast({
        title: '🎙 You have the floor',
        description: 'The instructor has unmuted you. Tap the mic button to speak.',
      });
    }
    if (!canSpeak && !audioMutedRef.current) {
      // Force-mute via Jitsi
      try { apiRef.current.executeCommand('toggleAudio'); } catch {}
      if (!wasNull) toast({ title: 'Mic returned to the instructor', description: 'You have been re-muted.' });
    }
  }, [me?.can_speak, isHost, me, toast]);

  const handleRaiseHand = async () => {
    const next = !(me?.hand_raised);
    handRaisedJitsiRef.current = next;
    try { apiRef.current?.executeCommand('toggleRaiseHand'); } catch {}
    await setHandRaised(next);
  };

  const handleLeave = async () => {
    await leaveSession();
    if (apiRef.current) { try { apiRef.current.dispose(); } catch {}; apiRef.current = null; }
    navigate('/communications-hub');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#14101F] text-[#E8D9B5] p-6">
        <p className="font-spectral">Please sign in to enter this classroom.</p>
        <Button onClick={() => navigate('/login')}>Sign in</Button>
      </div>
    );
  }

  return (
    <main
      className="min-h-screen text-[#E8D9B5]"
      style={{
        background:
          'radial-gradient(ellipse at top, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0) 55%), linear-gradient(180deg, #1a1430 0%, #14101F 60%, #100c1a 100%)',
      }}
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLeave}
          className="mb-3 gap-2 px-0 text-[#E8D9B5]/70 hover:text-[#E8D9B5] hover:bg-transparent"
        >
          <ArrowLeft className="h-4 w-4" /> Leave classroom
        </Button>

        {/* Header */}
        <header className="mb-4 rounded-2xl border border-[#8B5CF6]/30 bg-[#1a1430]/70 backdrop-blur p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-1.5">
                <BookOpen className="h-6 w-6 text-[#8B5CF6] shrink-0" />
                <h1 className="font-spectral text-2xl sm:text-3xl text-[#E8D9B5] tracking-tight truncate">{session.title}</h1>
              </div>
              {session.description && (
                <p className="text-[#E8D9B5]/80 font-spectral italic text-sm">{session.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2.5 text-xs text-[#E8D9B5]/60">
                {session.scheduled_at && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {new Date(session.scheduled_at).toLocaleString()}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/50 px-2 py-0.5 font-semibold uppercase tracking-wider">
                  <Tag className="h-3 w-3" />
                  {session.is_free ? 'Free entry' : `${Number(session.session_fee ?? 0).toFixed(2)} USDT entry`}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {participants.length} live
                </span>
              </div>
            </div>

            {!isHost && (
              <Button
                onClick={() => setBestowOpen(true)}
                className="shrink-0 bg-gradient-to-r from-[#8B5CF6] to-[#F0B23F] hover:opacity-90 text-white font-bold gap-2"
              >
                <Heart className="h-4 w-4" /> Bestow
              </Button>
            )}
          </div>
        </header>

        {/* Live grid */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Jitsi stage */}
          <div className="rounded-2xl border border-[#8B5CF6]/30 bg-black/60 overflow-hidden relative" style={{ minHeight: 480, height: 'calc(100vh - 320px)' }}>
            {jitsiLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-[#E8D9B5]/80 z-10 bg-[#0a0612]/80">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-[#8B5CF6]" />
                  <p className="text-sm font-spectral">Connecting to the live classroom…</p>
                </div>
              </div>
            )}
            <div ref={containerRef} className="w-full h-full" />

            {/* Floating attendee controls: Raise hand */}
            {!isHost && (
              <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={handleRaiseHand}
                  className={`gap-1.5 shadow-lg ${me?.hand_raised ? 'bg-[#F0B23F] text-[#14101F] hover:bg-[#F0B23F]/90' : 'bg-[#1a1430]/90 border border-[#8B5CF6]/50 text-[#E8D9B5] hover:bg-[#8B5CF6]/20'}`}
                >
                  <Hand className="h-3.5 w-3.5" />
                  {me?.hand_raised ? 'Hand raised' : 'Raise hand'}
                </Button>
                {me?.can_speak && audioMuted && (
                  <Button
                    size="sm"
                    onClick={() => { try { apiRef.current?.executeCommand('toggleAudio'); } catch {} }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg"
                  >
                    Unmute now
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Side panel */}
          <aside className="rounded-2xl border border-[#8B5CF6]/30 bg-[#14101F]/85 overflow-hidden flex flex-col" style={{ minHeight: 480, height: 'calc(100vh - 320px)' }}>
            <Tabs defaultValue="chat" className="flex flex-col h-full">
              <TabsList className="w-full grid grid-cols-4 bg-[#1a1430]/80 border-b border-[#8B5CF6]/25 rounded-none h-10 shrink-0">
                <TabsTrigger value="chat" className="text-xs data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-[#E8D9B5]">Chat</TabsTrigger>
                <TabsTrigger value="hands" className="text-xs data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-[#E8D9B5]">{isHost ? 'Hands' : 'Floor'}</TabsTrigger>
                <TabsTrigger value="docs" className="text-xs data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-[#E8D9B5]">Docs</TabsTrigger>
                <TabsTrigger value="subs" className="text-xs data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-[#E8D9B5]">Tasks</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 mt-0 overflow-hidden">
                <SessionMessages
                  messages={messages}
                  participants={participants}
                  userId={userId!}
                  hostId={session.instructor_id}
                  onSendText={sendTextMessage}
                  onSendVoice={sendVoiceMessage}
                />
              </TabsContent>

              <TabsContent value="hands" className="flex-1 mt-0 overflow-y-auto">
                <HandQueuePanel
                  isHost={isHost}
                  participants={participants}
                  hostUserId={session.instructor_id}
                  onSetCanSpeak={setCanSpeak}
                />
              </TabsContent>

              <TabsContent value="docs" className="flex-1 mt-0 overflow-y-auto">
                <DocumentsPanel
                  isHost={isHost}
                  media={media}
                  onUpload={(f) => uploadMedia(f, 'host_preload')}
                />
              </TabsContent>

              <TabsContent value="subs" className="flex-1 mt-0 overflow-y-auto">
                <SubmissionsPanel
                  isHost={isHost}
                  userId={userId!}
                  media={media}
                  participants={participants}
                  onUpload={(f) => uploadMedia(f, 'attendee_task')}
                  onScore={scoreSubmission}
                />
              </TabsContent>
            </Tabs>
          </aside>
        </div>
      </div>

      {!isHost && userId && (
        <BestowalDialog
          open={bestowOpen}
          onOpenChange={setBestowOpen}
          sowerId={session.instructor_id}
          bestowerId={userId}
          sessionId={session.id}
          sessionKind="classroom"
          hostName={hostName}
        />
      )}
    </main>
  );
}
