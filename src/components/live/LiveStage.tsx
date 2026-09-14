/**
 * LiveStage — universal "Go Live" stage layout.
 *
 * Layout:
 *   ┌──────────────────────────────────────┐
 *   │  HOST tile (camera | image | board)   │
 *   │  ┌─────────────────────────────────┐ │
 *   │  │       big presentation          │ │
 *   │  └─────────────────────────────────┘ │
 *   │  Guest boxes: [g1][g2][g3][g4]…      │
 *   │  Hand-raise tray (host only)         │
 *   └──────────────────────────────────────┘
 *
 * Built on top of the existing Jitsi iframe (audio/video transport) plus
 * a Supabase realtime broadcast channel (`stage:${seedId}`) for the
 * presentation mode + hand-raise queue. No new DB tables.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera, Image as ImageIcon, PencilLine, Film,
  Hand, Mic, MicOff, Video, VideoOff, X, Check, UserMinus, PhoneOff,
  ChevronLeft, ChevronRight, Music, Heart, Search, Star, Crown, Users, Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDailyCallObject, type CallParticipant } from '@/hooks/useDailyCallObject';
import { useAuth } from '@/hooks/useAuth';
import { useLiveStage, type StageMode, type NowPlaying, type ApprovedGuest, type HandRaise } from '@/hooks/useLiveStage';
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { supabase } from '@/integrations/supabase/client';
import { moderateStorageUpload } from '@/lib/moderation/moderateUpload';
import QuickBestowModal from '@/components/bestow/QuickBestowModal';
import { PdfBoard, ClipBoard, SeedPinBoard, NowLabel } from './GatheringBoard';
import { FileText, Clapperboard, Sprout } from 'lucide-react';

const VOICE_NOTE_MAX_SECONDS = 45;

/** Same upload-then-moderate-then-publicUrl shape as GatheringBoard's
 * uploadBoardFile -- kept separate since this one is always audio, always
 * capped, and lives on the guest side of the queue, not the host's board. */
async function uploadVoiceNote(userId: string, blob: Blob): Promise<string | null> {
  const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
  const path = `${userId}/gathering/voicenote-${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage.from('stalls').upload(path, blob, {
    cacheControl: '3600', contentType: blob.type || undefined, upsert: false,
  });
  if (uploadErr) { console.error('voice note upload failed', { message: uploadErr.message, path, blobType: blob.type, blobSize: blob.size }); return null; }
  const { verdict, reason } = await moderateStorageUpload('stalls', path, 'video');
  if (verdict !== 'allow') { console.error('voice note moderation rejected', { verdict, reason, path }); await supabase.storage.from('stalls').remove([path]); return null; }
  const { data: pub } = supabase.storage.from('stalls').getPublicUrl(path);
  return pub.publicUrl;
}

export interface LiveStageProps {
  seedId: string;
  title: string;
  jitsiRoom: string;
  isHost: boolean;
  /** This session's gathering_sessions.id, from goLive()'s own return value
   * -- set only for the actual host (goLive()'s caller), never a guest.
   * Passed straight through to useLiveStage so it never has to guess/race
   * for its own row; omit for a viewer/guest render. */
  hostSessionId?: string | null;
  /** When true, host gets a tribal-music dropdown to pick the playing seed */
  isRadio?: boolean;
  /** seed owner — bestowals default to this user */
  sowerUserId?: string | null;
  images?: string[];
  mediaUrl?: string | null;
  mediaKind?: 'audio' | 'video' | 'book' | 'orchard' | 'seed';
  className?: string;
  /** Whisperer % the host of the live earns from each bestowal */
  whispererSharePct?: number;
}

const TABS: { mode: StageMode; icon: typeof Camera; label: string; hostOnly?: boolean }[] = [
  { mode: 'camera',     icon: Camera,     label: 'Camera' },
  { mode: 'image',      icon: ImageIcon,  label: 'Image' },
  { mode: 'whiteboard', icon: PencilLine, label: 'Text' },
  { mode: 'pdf',        icon: FileText,   label: 'PDF' },
  { mode: 'clip',       icon: Clapperboard, label: 'Clip' },
  { mode: 'seed',       icon: Sprout,     label: 'Seed' },
  { mode: 'video',      icon: Film,       label: 'Media' },
];

interface MusicSeedOption {
  id: string;
  title: string;
  user_id: string;
  audio_url: string | null;
  image: string | null;
}

export default function LiveStage({
  seedId, title, jitsiRoom, isHost, hostSessionId,
  isRadio = false, sowerUserId,
  images = [], mediaUrl, mediaKind,
  className = '',
  whispererSharePct = 10,
}: LiveStageProps) {
  const { user } = useAuth();
  const {
    stage, setStageMode,
    hands, raiseHand, cancelHand, approveHand, denyHand,
    approved, removeGuest, toggleMute,
    spotlightRequests, setSpotlight, requestSpotlight, cancelSpotlightRequest, denySpotlight,
    myHandRaised, iAmApproved, mySpotlightRequested, iAmSpotlighted,
    playingVoiceNote, finishVoiceNote,
  } = useLiveStage(seedId, { isHost, enabled: true, hostSessionId });
  const [recordingNote, setRecordingNote] = useState(false);
  const [noteBusy, setNoteBusy] = useState(false);
  const noteRecorder = useMediaRecorder();
  // Phone-portrait layout only (see the portrait-only blocks below): which
  // speaker-strip tile's tap-revealed controls are open, and whether the
  // host's queue-management sheet is open. Both replace an always-visible
  // desktop tray with a tap-to-reveal one -- same underlying actions
  // (setSpotlight/toggleMute/removeGuest/approveHand/denyHand), nothing new
  // in the engine.
  const [openTileId, setOpenTileId] = useState<string | null>(null);
  const [queueSheetOpen, setQueueSheetOpen] = useState(false);

  // "Live Now" directory: report how many approved guests are on this live
  // to presence, so the directory can show a participant count without
  // joining every session just to count heads. Host-only -- a guest's own
  // `approved` list is identical (same broadcast state), but only the
  // host's tab has a presence entry to update.
  const { updateParticipantCount } = useTribalLiveOrchard();
  useEffect(() => {
    if (!isHost) return;
    updateParticipantCount(seedId, approved.length);
  }, [isHost, seedId, approved.length, updateParticipantCount]);

  const spotlightUserId = stage.spotlightUserId ?? null;
  const spotlightedGuest = approved.find(g => g.user_id === spotlightUserId) ?? null;
  // Whoever currently owns the big screen gets board control too -- a
  // spotlighted, approved guest, not just the literal host. setStageMode
  // itself (useLiveStage.ts) enforces the same rule server-broadcast-side;
  // this just gates which UI renders (tabs row, PDF/clip/seed upload
  // rights). Fine for those -- a stray extra click from the host while
  // someone else presents just re-broadcasts the same shared state, no
  // local draft to go stale.
  const isPresenter = isHost || iAmSpotlighted;
  // The whiteboard textarea is different: it has its OWN local draft state
  // (`boardText`) that only ever syncs FROM the broadcast for whoever isn't
  // currently typing -- there can only be one real "hands on the keyboard"
  // at a time. Gating that on isPresenter (true for the host unconditionally,
  // spotlight or not) meant the host's own boardText never mirrored an
  // incoming broadcast: a spotlighted guest's typing reached every OTHER
  // viewer, but the host's own textarea just kept showing their own stale
  // pre-handoff text forever. Confirmed live via the E2E test -- the host
  // never saw the panelist's text at all. isActiveEditor is host, UNLESS
  // someone else is currently spotlighted, in which case it's them.
  const isActiveEditor = spotlightUserId ? iAmSpotlighted : isHost;

  // Always-current `stage` for callbacks that intentionally don't list it as
  // a dependency (the whiteboard debounce below, and the host-content-
  // restore effect) -- reading `stage` directly there would either reset a
  // debounce timer on every unrelated board broadcast, or close over a
  // stale value.
  const stageRef = useRef(stage);
  useEffect(() => { stageRef.current = stage; }, [stage]);

  // Host-only: snapshot the host's own board the moment spotlight hands
  // control to a guest, restore it the moment spotlight returns to the host
  // (spotlightUserId back to null) -- otherwise "control returns to host"
  // left whatever the panelist last showed sitting there instead of the
  // host's own content. Skips the very first run (mount/late-join hydration
  // already having a spotlight set is not a real handoff transition).
  const hostBoardSnapshotRef = useRef<typeof stage | null>(null);
  const prevSpotlightRef = useRef<string | null>(null);
  const spotlightHydratedRef = useRef(false);
  useEffect(() => {
    if (!isHost) return;
    if (!spotlightHydratedRef.current) {
      spotlightHydratedRef.current = true;
      prevSpotlightRef.current = spotlightUserId;
      return;
    }
    const prev = prevSpotlightRef.current;
    if (prev !== spotlightUserId) {
      if (prev === null && spotlightUserId !== null) {
        hostBoardSnapshotRef.current = stageRef.current;
      } else if (spotlightUserId === null && hostBoardSnapshotRef.current) {
        setStageMode(hostBoardSnapshotRef.current);
        hostBoardSnapshotRef.current = null;
      }
      prevSpotlightRef.current = spotlightUserId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotlightUserId, isHost]);

  const [boardText, setBoardText] = useState('');
  const imgList = images.filter(Boolean);

  // Bestow modal (guests bestow toward the now-playing seed)
  const [bestowOpen, setBestowOpen] = useState(false);

  // Radio: tribal-music seed library + "now playing"
  const [musicLib, setMusicLib] = useState<MusicSeedOption[]>([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicSearch, setMusicSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!isRadio || !isHost || musicLib.length > 0) return;
    setMusicLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('orchards')
        .select('id, title, user_id, audio_url, images')
        .ilike('category', '%music%')
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error && data) {
        setMusicLib(
          (data as any[]).map((o) => ({
            id: o.id,
            title: o.title,
            user_id: o.user_id,
            audio_url: o.audio_url,
            image: Array.isArray(o.images) && o.images.length ? o.images[0] : null,
          }))
        );
      }
      setMusicLoading(false);
    })();
  }, [isRadio, isHost, musicLib.length]);

  const filteredMusic = useMemo(
    () => (musicSearch
      ? musicLib.filter(m => m.title.toLowerCase().includes(musicSearch.toLowerCase()))
      : musicLib),
    [musicLib, musicSearch]
  );

  const playMusicSeed = (m: MusicSeedOption) => {
    const np: NowPlaying = {
      seed_id: m.id,
      title: m.title,
      sower_user_id: m.user_id,
      media_url: m.audio_url,
      media_kind: 'audio',
      image: m.image,
    };
    setStageMode({ ...stage, mode: 'video', mediaUrl: m.audio_url, mediaKind: 'audio', nowPlaying: np });
    setPickerOpen(false);
  };

  const nowPlaying: NowPlaying = (stage.nowPlaying as NowPlaying) || {
    seed_id: seedId,
    title,
    sower_user_id: sowerUserId ?? null,
    media_url: mediaUrl ?? null,
    media_kind: (mediaKind === 'audio' || mediaKind === 'video') ? mediaKind : null,
    image: imgList[0] ?? null,
  };
  const activeMediaUrl = stage.mediaUrl ?? mediaUrl ?? null;
  const activeMediaKind = stage.mediaKind ?? (mediaKind === 'audio' || mediaKind === 'video' ? mediaKind : null);

  // Portrait action bar (Raise hand / Queue / Gift / Share) -- all reuse
  // existing engine pieces already above (raiseHand/cancelHand/hands,
  // the Bestow CTA's own gating, a plain share-the-link fallback). No new
  // payment/queue logic; Gift stays a "coming soon" toast when there's no
  // real sower to bestow toward (e.g. Scripture Study's synthetic
  // session), exactly like the desktop Bestow CTA already silently omits
  // itself in that case.
  const handlePortraitQueueTap = () => {
    if (isHost) { setQueueSheetOpen(true); return; }
    if (myHandRaised) {
      const pos = hands.findIndex(h => h.user_id === user?.id) + 1;
      toast(pos > 0 ? `You're #${pos} in the queue.` : "You're in the queue — waiting for the host.");
    } else {
      toast(hands.length > 0 ? `${hands.length} waiting — raise your hand to join the queue.` : 'No one in the queue yet — raise your hand to join.');
    }
  };
  const handlePortraitGiftTap = () => {
    if (nowPlaying.sower_user_id && nowPlaying.sower_user_id !== user?.id) {
      setBestowOpen(true);
    } else {
      toast('Gift — coming soon.');
    }
  };
  const handlePortraitShareTap = async () => {
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelled */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); toast.success('Link copied!'); } catch { toast.error("Couldn't copy the link"); }
  };

  // Push board text changes (debounced) when the presenter edits. Spreads
  // the LATEST stage (via stageRef, not a `stage` dependency -- that would
  // reset this debounce on every unrelated board broadcast) instead of a
  // bare {mode, text}: a bare payload wiped pdfUrl/clipUrl/pinnedSeed/etc.
  // the moment anyone typed in the Text tab, which is what actually caused
  // "PDF lost on tab switch" -- switching TO whiteboard was harmless (the
  // tab-click handler already spreads ...stage), but this effect firing
  // 250ms later, on its own, was not.
  useEffect(() => {
    if (!isActiveEditor || stage.mode !== 'whiteboard') return;
    const t = setTimeout(() => {
      setStageMode({ ...stageRef.current, mode: 'whiteboard', text: boardText });
    }, 250);
    return () => clearTimeout(t);
  }, [boardText, isActiveEditor, stage.mode, setStageMode]);

  useEffect(() => {
    if (!isActiveEditor && stage.mode === 'whiteboard' && typeof stage.text === 'string') {
      setBoardText(stage.text);
    }
  }, [isActiveEditor, stage.mode, stage.text]);

  // Whoever just BECAME the active editor (spotlight handed back, or taken)
  // starts from the current shared text, not whatever they last mirrored as
  // a bystander -- otherwise a returning host's textarea opens pre-filled
  // with a departed panelist's old text (the mirror effect above only ever
  // writes boardText while NOT the active editor, so nothing else clears it
  // on the handoff itself).
  const prevIsActiveEditorRef = useRef(isActiveEditor);
  useEffect(() => {
    if (!prevIsActiveEditorRef.current && isActiveEditor) {
      setBoardText(stageRef.current.text ?? '');
    }
    prevIsActiveEditorRef.current = isActiveEditor;
  }, [isActiveEditor]);

  const displayName = (user as any)?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Tribe';

  // Whether the local user should actually have an audio/video transport.
  // Hosts always join; viewers only join when approved (so we save bandwidth).
  const inCall = isHost || iAmApproved;

  // Explicit "Leave call" override -- inCall alone (host/approved) would
  // otherwise immediately reconnect. Reset whenever inCall itself goes
  // false (removed/un-approved) so the next real entry starts fresh.
  const [leftCall, setLeftCall] = useState(false);
  useEffect(() => { if (!inCall) setLeftCall(false); }, [inCall]);
  const roomActive = inCall && !leftCall;

  // Headless call -- ONE join per tab (see useDailyCallObject's own doc
  // comment: the old bare-iframe version rendered two independent iframes
  // against the same room/token -- the big camera-mode tile and the
  // always-present host PIP -- each a separate join publishing its own
  // mic, which is what caused the echo/feedback risk). Every render below
  // (big tile, tile grid, PIP thumbnail) reads from these same fields.
  const {
    participants: callParticipants,
    joined: callJoined,
    connecting: callConnecting,
    error: callError,
    audioOn: myAudioOn,
    videoOn: myVideoOn,
    toggleAudio: toggleMyAudio,
    toggleVideo: toggleMyVideo,
    localMicSilent: myMicSilent,
  } = useDailyCallObject(roomActive ? 'custom' : null, jitsiRoom, displayName, roomActive);
  const myLocalVideoTrack = Object.values(callParticipants).find(p => p.local)?.videoTrack ?? null;

  // "Tap to enable sound" recovery -- see ParticipantAudio's own doc
  // comment: an unmuted <audio>.play() blocked by the browser's autoplay
  // policy fails silently with no error surfaced anywhere else. bumping
  // audioRetryKey inside a real click handler re-runs .play() on every
  // mounted ParticipantAudio within that click's user-activation window.
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioRetryKey, setAudioRetryKey] = useState(0);
  const handleEnableAudio = () => { setAudioBlocked(false); setAudioRetryKey(k => k + 1); };

  // Mic-off-then-on forces a fresh silence check (useDailyCallObject.ts
  // resets its "already checked" ref on every toggleAudio call) -- the
  // banner's own retry action, for a mic that was silent because of a
  // one-off device-selection glitch rather than a real permission block
  // (still silent after this just confirms it's the latter).
  const handleRetryMic = () => {
    toggleMyAudio();
    setTimeout(() => toggleMyAudio(), 400);
  };

  // Stage content (what occupies the big tile)
  const stageImage = stage.mode === 'image'
    ? (stage.imageUrl || imgList[(stage.imageIdx ?? 0) % Math.max(imgList.length, 1)])
    : null;

  return (
    <div className={`flex h-full w-full flex-col bg-black text-white ${className}`}>
      {/* Recovers from the browser silently blocking unmuted audio autoplay
          -- see ParticipantAudio's own doc comment. Shown the moment ANY
          remote participant's audio.play() is rejected; clicking it is a
          real user gesture, which is what unblocks playback. */}
      {audioBlocked && (
        <button
          type="button"
          onClick={handleEnableAudio}
          className="w-full shrink-0 bg-amber-500 px-3 py-2 text-center text-xs font-bold text-black transition-colors hover:bg-amber-400"
        >
          🔇 Tap to enable sound
        </button>
      )}
      {/* SENDING problem, not receiving -- shown only to the affected user's
          own client (this is local state from THIS tab's own
          useDailyCallObject call, never broadcast). A short on-device
          WebAudio check (monitorLocalMicSilence, useDailyCallObject.ts)
          found this client's own mic track live but producing no real
          audio -- the failure mode reported live, 2026-09-14, from a
          participant on Microsoft Edge: track state said 'playable',
          camera/video worked fine, but no one in the room ever heard them,
          with no error or banner anywhere to tell them why. Everyone else
          just silently not hearing you gives you nothing to act on; this
          does. */}
      {roomActive && myAudioOn && myMicSilent && (
        <div className="z-20 flex w-full shrink-0 flex-col items-center gap-1.5 border-b-2 border-rose-300 bg-rose-600 px-3 py-3 text-center text-white shadow-[0_0_20px_rgba(225,29,72,0.6)] sm:flex-row sm:justify-center sm:gap-3">
          <span className="flex items-center gap-2 text-sm font-extrabold">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            🎙️ Your microphone isn't being shared — no one can hear you.
          </span>
          <span className="text-xs font-medium text-rose-100">
            Check your browser's mic permission &amp; input device (Settings → Privacy → Microphone on Edge/Chrome) —
            and your computer's own OS microphone privacy setting too (Windows Settings → Privacy → Microphone / macOS
            System Settings → Privacy &amp; Security → Microphone): a browser can be allowed while the OS still blocks it.
          </span>
          <button
            type="button"
            onClick={handleRetryMic}
            className="flex-shrink-0 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-rose-700 hover:bg-rose-50"
          >
            Try again
          </button>
        </div>
      )}
      {/* Always mounted while the call is active, independent of stage.mode
          -- see CallAudioLayer's own doc comment: this is what keeps remote
          audio playing while the host is presenting PDF/TEXT/etc, not just
          in camera mode. */}
      {roomActive && (
        <CallAudioLayer participants={callParticipants} retryKey={audioRetryKey} onBlocked={() => setAudioBlocked(true)} />
      )}
      {/* Presentation tabs -- host, or whoever's currently spotlighted */}
      {isPresenter && (
        <div className="flex items-center gap-1 border-b border-white/10 bg-black/60 px-2 py-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = stage.mode === t.mode;
            return (
              <button
                key={t.mode}
                // Merge onto the existing stage, not replace it -- a bare
                // {mode, imageUrl, imageIdx} discarded pdfUrl/pdfPage/
                // clipUrl/etc. every time, so switching away from PDF and
                // back (even re-clicking the same already-active tab)
                // silently lost the host's own uploaded PDF/clip, forcing
                // a re-upload. Found while testing the zoom/scroll fix.
                onClick={() => setStageMode({ ...stage, mode: t.mode, imageUrl: t.mode === 'image' ? imgList[0] : null, imageIdx: 0 })}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                  active ? 'bg-emerald-500 text-black' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <Icon className="h-3 w-3" /> {t.label}
              </button>
            );
          })}
          <span className="ml-auto text-[10px] text-white/40">Stage</span>
        </div>
      )}

      {/* Radio: tribal-music dropdown for the host */}
      {isRadio && isHost && (
        <div className="relative border-b border-white/10 bg-emerald-950/30 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(v => !v)}
              className="flex items-center gap-1.5 rounded-md border border-emerald-400/40 bg-black/40 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/10"
            >
              <Music className="h-3 w-3" />
              {nowPlaying?.title && stage.nowPlaying ? `🎵 ${nowPlaying.title}` : 'Pick tribal music'}
            </button>
            <span className="text-[10px] text-white/50">
              {musicLoading ? 'Loading library…' : `${musicLib.length} music seeds`}
            </span>
          </div>
          {pickerOpen && (
            <div className="absolute left-2 right-2 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-emerald-500/30 bg-[#0a1320] shadow-2xl">
              <div className="sticky top-0 flex items-center gap-1 border-b border-white/10 bg-[#0a1320] p-2">
                <Search className="h-3 w-3 text-white/40" />
                <input
                  autoFocus
                  value={musicSearch}
                  onChange={(e) => setMusicSearch(e.target.value)}
                  placeholder="Search music seeds…"
                  className="flex-1 bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
                />
                <button onClick={() => setPickerOpen(false)} className="text-white/50 hover:text-white"><X className="h-3 w-3" /></button>
              </div>
              {filteredMusic.length === 0 && (
                <div className="p-3 text-center text-xs text-white/40">No music seeds found.</div>
              )}
              {filteredMusic.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => playMusicSeed(m)}
                  className="flex w-full items-center gap-2 border-b border-white/5 p-2 text-left text-xs hover:bg-emerald-500/10"
                >
                  {m.image
                    ? <img src={m.image} alt="" className="h-8 w-8 flex-shrink-0 rounded object-cover" />
                    : <div className="h-8 w-8 flex-shrink-0 rounded bg-emerald-500/10" />}
                  <span className="flex-1 truncate text-white/85">{m.title}</span>
                  <Music className="h-3 w-3 text-emerald-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Big stage area */}
      <div className="relative flex-1 min-h-0 bg-black">
        {/* Gathering Room batch 1: "Now: <title>" label, every mode. */}
        <NowLabel title={stage.mode === 'seed' && stage.pinnedSeed ? stage.pinnedSeed.title : title} />
        {/* Gathering Room batch 2: the #1 queue position's voice note,
            auto-playing to every participant -- each client plays its own
            local copy (not mixed into the Daily media stream itself; that
            needs the shared-audio-track work reserved for batch 4/Music)
            and calls finishVoiceNote() on its own 'ended', which only
            actually advances the queue on the host's copy. */}
        {playingVoiceNote && (
          <div className="absolute top-12 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full border border-purple-400/50 bg-purple-950/70 px-3 py-1.5 text-xs font-bold text-purple-100 backdrop-blur">
            <Mic className="h-3.5 w-3.5 text-purple-300 animate-pulse" />
            {playingVoiceNote.name}'s voice note
            <audio src={playingVoiceNote.url} autoPlay onEnded={finishVoiceNote} className="hidden" />
          </div>
        )}
        {/* Spotlight banner — who currently owns the big screen */}
        {spotlightedGuest && stage.mode === 'camera' && (
          <div className="absolute top-2 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full border border-amber-400/60 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-100 backdrop-blur">
            <Crown className="h-3.5 w-3.5 text-amber-300" />
            On the big screen: <span className="text-amber-300">{spotlightedGuest.name}</span>
            {isHost && (
              <button
                onClick={() => setSpotlight(null)}
                className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/40 hover:bg-black/70"
                title="Return spotlight to host"
              ><X className="h-3 w-3" /></button>
            )}
          </div>
        )}
        {/* Camera mode → our own headless call rendering (no Daily UI ever) */}
        {stage.mode === 'camera' && inCall && !leftCall && (
          <CallStageArea
            participants={callParticipants}
            connecting={callConnecting}
            joined={callJoined}
            error={callError}
            spotlightUserId={spotlightUserId}
            audioOn={myAudioOn}
            videoOn={myVideoOn}
            onToggleAudio={toggleMyAudio}
            onToggleVideo={toggleMyVideo}
            onLeave={() => setLeftCall(true)}
          />
        )}
        {stage.mode === 'camera' && inCall && leftCall && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white/60">
              <div className="text-sm">You left the call.</div>
              <button
                type="button"
                onClick={() => setLeftCall(false)}
                className="mt-2 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-emerald-400"
              >
                Rejoin
              </button>
            </div>
          </div>
        )}
        {stage.mode === 'camera' && !inCall && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white/50">
              <div className="text-sm">Host's camera is live.</div>
              <div className="mt-1 text-xs">Raise your hand to join the call →</div>
            </div>
          </div>
        )}

        {/* Image mode */}
        {stage.mode === 'image' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            {stageImage ? (
              <img src={stageImage} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-white/40 text-sm">No images uploaded for this seed.</div>
            )}
            {isHost && imgList.length > 1 && (
              <>
                <button
                  onClick={() => {
                    const next = ((stage.imageIdx ?? 0) - 1 + imgList.length) % imgList.length;
                    setStageMode({ ...stage, mode: 'image', imageUrl: imgList[next], imageIdx: next });
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/85"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    const next = ((stage.imageIdx ?? 0) + 1) % imgList.length;
                    setStageMode({ ...stage, mode: 'image', imageUrl: imgList[next], imageIdx: next });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/85"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold">
                  {((stage.imageIdx ?? 0) % imgList.length) + 1} / {imgList.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Whiteboard mode */}
        {stage.mode === 'whiteboard' && (
          <div className="absolute inset-0 bg-[#0b1120] p-4">
            {isActiveEditor ? (
              <textarea
                value={boardText}
                onChange={(e) => setBoardText(e.target.value)}
                placeholder="Type your presentation, notes, or scripture here…"
                className="h-full w-full resize-none rounded-lg border border-emerald-500/20 bg-black/40 p-4 font-mono text-base leading-relaxed text-emerald-100 placeholder:text-white/30 focus:border-emerald-400/60 focus:outline-none"
              />
            ) : (
              <div className="h-full w-full overflow-auto whitespace-pre-wrap rounded-lg border border-emerald-500/20 bg-black/40 p-4 font-mono text-base leading-relaxed text-emerald-100">
                {boardText || <span className="italic text-white/30">Host hasn't written anything yet…</span>}
              </div>
            )}
          </div>
        )}

        {/* Gathering Room batch 1 board modes -- `isHost` here means "can
            control this board's content," which is the presenter (host or
            spotlighted guest), not literally the seed's host. */}
        {stage.mode === 'pdf' && (
          <div className="absolute inset-0">
            <PdfBoard isHost={isPresenter} stage={stage} setStageMode={setStageMode} />
          </div>
        )}
        {stage.mode === 'clip' && (
          <div className="absolute inset-0">
            <ClipBoard isHost={isPresenter} stage={stage} setStageMode={setStageMode} />
          </div>
        )}
        {stage.mode === 'seed' && (
          <div className="absolute inset-0 bg-[#0b1120]">
            <SeedPinBoard isHost={isPresenter} stage={stage} setStageMode={setStageMode} />
          </div>
        )}

        {/* Media mode */}
        {stage.mode === 'video' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-3">
            {nowPlaying.image && activeMediaKind === 'audio' && (
              <img src={nowPlaying.image} alt="" className="mb-3 max-h-[55%] max-w-[80%] rounded object-contain" />
            )}
            {activeMediaUrl && activeMediaKind === 'video' && (
              <video src={activeMediaUrl} controls autoPlay className="max-h-full max-w-full" />
            )}
            {activeMediaUrl && activeMediaKind === 'audio' && (
              <audio src={activeMediaUrl} controls autoPlay className="w-[80%]" />
            )}
            {!activeMediaUrl && (
              <div className="text-white/40 text-sm">
                {isRadio && isHost
                  ? 'Pick a tribal music seed below to start playing.'
                  : 'No media attached to this seed.'}
              </div>
            )}
            {nowPlaying.title && activeMediaUrl && (
              <div className="mt-3 rounded-full border border-emerald-400/30 bg-black/60 px-3 py-1 text-xs">
                🎵 Now playing: <span className="font-bold text-emerald-300">{nowPlaying.title}</span>
              </div>
            )}
          </div>
        )}

        {/* Picture-in-picture host camera when not in camera mode (host
            preview) -- top-right, not bottom-right: the board's own
            controls (PdfBoard/ClipBoard's ZoomControls AND, for PDF, the
            page-turn pill) already live at bottom-right/bottom-center.
            Bound to the SAME local video track as the camera-mode tile
            grid (myLocalVideoTrack, from the one shared useDailyCallObject
            call above) -- not a second join, just a second <video> element
            reading the same MediaStreamTrack. Audio keeps flowing whether
            or not this thumbnail shows a picture (see
            useDailyCallObject's own doc comment: mic/camera are
            independent track calls). */}
        {isHost && roomActive && stage.mode !== 'camera' && (
          <div className="absolute top-3 right-3 z-[5] flex flex-col items-end gap-1">
            <div className="h-20 w-28 max-lg:portrait:h-20 max-lg:portrait:w-28 lg:h-32 lg:w-44 overflow-hidden rounded-lg border border-emerald-500/30 bg-black shadow-2xl">
              {myVideoOn && myLocalVideoTrack ? (
                <ParticipantVideo track={myLocalVideoTrack} className="h-full w-full object-cover" mirror />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/40">
                  <VideoOff className="h-6 w-6" />
                </div>
              )}
            </div>
            <MiniCallControls
              audioOn={myAudioOn}
              videoOn={myVideoOn}
              onToggleAudio={toggleMyAudio}
              onToggleVideo={toggleMyVideo}
              onLeave={() => setLeftCall(true)}
            />
          </div>
        )}
      </div>

      {/* Phone portrait: compact speaker strip + action bar replace
          everything below (guest boxes row, spotlight/hand-raise trays,
          guest raise-hand controls, Bestow CTA) -- same engine state,
          reorganized so nothing floats loose over the board and the
          board stays the largest element. Desktop/landscape keeps all of
          the below completely unchanged (each gets max-lg:portrait:hidden
          added, nothing else about them changes). */}
      <div className="hidden max-lg:portrait:flex max-lg:portrait:flex-col">
        <PortraitSpeakerStrip
          isHost={isHost}
          approved={approved}
          spotlightUserId={spotlightUserId}
          openTileId={openTileId}
          setOpenTileId={setOpenTileId}
          onSetSpotlight={setSpotlight}
          onToggleMute={toggleMute}
          onRemoveGuest={removeGuest}
          callParticipants={callParticipants}
          hostVideoTrack={myLocalVideoTrack}
          hostVideoOn={myVideoOn}
          hostAvatar={(user as any)?.user_metadata?.avatar_url || null}
        />
        <PortraitActionBar
          isHost={isHost}
          myHandRaised={myHandRaised}
          hands={hands}
          onRaiseHand={() => raiseHand('voice')}
          onCancelHand={cancelHand}
          onOpenQueue={handlePortraitQueueTap}
          onGift={handlePortraitGiftTap}
          onShare={() => void handlePortraitShareTap()}
        />
      </div>
      {queueSheetOpen && (
        <PortraitQueueSheet
          hands={hands}
          onApprove={approveHand}
          onDeny={denyHand}
          onClose={() => setQueueSheetOpen(false)}
        />
      )}

      {/* Guest boxes row — Discord/TikTok style "seats" (desktop/landscape only, see portrait speaker strip above) */}
      {(approved.length > 0 || isHost) && (
        <div className="hidden max-lg:landscape:flex lg:flex items-stretch gap-2 border-t border-white/10 bg-gradient-to-b from-black/80 to-black/95 px-3 py-2.5 overflow-x-auto">
          {/* Host's own seat */}
          <div
            className={`relative flex h-24 w-32 flex-shrink-0 flex-col items-center justify-center rounded-lg border-2 ${
              !spotlightUserId ? 'border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)]' : 'border-emerald-500/40'
            } bg-emerald-950/50`}
            title="Host"
          >
            <Crown className="h-6 w-6 text-amber-300" />
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">Host</span>
            {!spotlightUserId && (
              <span className="absolute top-1 right-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-black">BIG</span>
            )}
          </div>

          {approved.length === 0 && (
            <div className="flex h-24 flex-1 items-center justify-center rounded-lg border-2 border-dashed border-white/10 px-4 text-xs text-white/40 italic">
              Empty seats — guests can raise their hand to join
            </div>
          )}

          {approved.map(g => {
            const isLit = g.user_id === spotlightUserId;
            return (
              <div
                key={g.user_id}
                className={`relative flex h-24 w-32 flex-shrink-0 flex-col items-center justify-center rounded-lg border-2 ${
                  isLit ? 'border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)]' : 'border-emerald-500/40'
                } bg-emerald-950/40`}
                title={g.name}
              >
                {g.avatar ? (
                  <img src={g.avatar} alt={g.name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-base font-bold text-emerald-200">
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-200">
                  {g.mode === 'video'
                    ? <Video className="h-3 w-3" />
                    : (g.muted ? <MicOff className="h-3 w-3 text-rose-400" /> : <Mic className="h-3 w-3" />)}
                  <span className="max-w-[80px] truncate font-bold">{g.name}</span>
                </div>
                {isLit && (
                  <span className="absolute top-1 left-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-black">BIG</span>
                )}

                {/* Host controls */}
                {isHost && (
                  <div className="absolute -top-2 -right-2 flex gap-0.5">
                    <button
                      onClick={() => setSpotlight(isLit ? null : g.user_id)}
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        isLit ? 'bg-amber-400 text-black' : 'bg-amber-500 text-black hover:bg-amber-400'
                      }`}
                      title={isLit ? 'Remove from big screen' : 'Send to big screen'}
                    >
                      <Star className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => toggleMute(g.user_id, !g.muted)}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-black hover:bg-sky-400"
                      title={g.muted ? 'Unmute' : 'Mute'}
                    >
                      {g.muted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => removeGuest(g.user_id)}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-400"
                      title="Remove from stage"
                    >
                      <UserMinus className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Guest's own seat: request big screen */}
                {!isHost && iAmApproved && g.user_id === user?.id && !isLit && (
                  <button
                    onClick={mySpotlightRequested ? cancelSpotlightRequest : requestSpotlight}
                    className={`absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                      mySpotlightRequested
                        ? 'border-amber-400 bg-amber-500/30 text-amber-200'
                        : 'border-amber-400/60 bg-black text-amber-200 hover:bg-amber-500/20'
                    }`}
                    title="Ask the host for the big screen"
                  >
                    <Star className="h-2.5 w-2.5" />
                    {mySpotlightRequested ? 'Asked…' : 'Ask big'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Host: spotlight requests tray (desktop/landscape only) */}
      {isHost && spotlightRequests.length > 0 && (
        <div className="hidden max-lg:landscape:block lg:block border-t border-amber-500/30 bg-gradient-to-r from-amber-950/40 to-amber-900/20 px-3 py-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
            ⭐ Big-screen requests ({spotlightRequests.length})
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {spotlightRequests.map(r => (
              <motion.div
                key={r.user_id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-black/40 px-2 py-1 text-xs"
              >
                <Star className="h-3 w-3 text-amber-300" />
                <span className="font-bold">{r.name}</span>
                <button
                  onClick={() => setSpotlight(r.user_id)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black hover:bg-emerald-400"
                  title="Send to big screen"
                ><Check className="h-3 w-3" /></button>
                <button
                  onClick={() => denySpotlight(r.user_id)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-400"
                  title="Decline"
                ><X className="h-3 w-3" /></button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Host: hand-raise tray (desktop/landscape only -- portrait's own
          host uses the tap-triggered PortraitQueueSheet above instead) */}
      {isHost && hands.length > 0 && (
        <div className="hidden max-lg:landscape:block lg:block border-t border-amber-500/30 bg-amber-950/30 px-3 py-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
            🙋 Hand raises ({hands.length})
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {hands.map((h, i) => (
              <motion.div
                key={h.user_id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-black/40 px-2 py-1 text-xs"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[9px] font-black text-amber-300">#{i + 1}</span>
                {h.voiceNoteUrl ? <Mic className="h-3 w-3 text-emerald-300" /> : h.want === 'video' ? <Video className="h-3 w-3 text-amber-300" /> : <Mic className="h-3 w-3 text-amber-300" />}
                <span className="font-bold">{h.name}</span>
                {h.voiceNoteUrl && <span className="text-[9px] text-emerald-300">voice note — plays at #1</span>}
                {!h.voiceNoteUrl && (
                  <button
                    onClick={() => approveHand(h)}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black hover:bg-emerald-400"
                    title="Approve"
                  ><Check className="h-3 w-3" /></button>
                )}
                <button
                  onClick={() => denyHand(h.user_id)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-400"
                  title="Decline"
                ><X className="h-3 w-3" /></button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Guest: request-to-join controls (desktop/landscape only -- portrait's own guest uses the action bar's Raise hand button instead) */}
      {!isHost && !iAmApproved && (
        <div className="hidden max-lg:landscape:flex lg:flex flex-col items-center justify-center gap-2 border-t border-white/10 bg-black/70 px-3 py-2">
          {recordingNote ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-300 animate-pulse">● recording… {noteRecorder.elapsed}s</span>
              <button
                onClick={() => noteRecorder.cancel()}
                className="flex items-center gap-1 rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs hover:bg-white/10"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            </div>
          ) : (
          <div className="flex items-center gap-2">
          <Hand className="h-4 w-4 text-amber-300" />
          {!myHandRaised ? (
            <>
              <span className="text-xs text-white/70">Ask to come up:</span>
              <button
                onClick={() => raiseHand('voice')}
                className="flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs font-bold hover:bg-emerald-500/20"
                title="Join with voice only — your face stays hidden"
              >
                <Mic className="h-3 w-3" /> Faceless
              </button>
              <button
                onClick={() => raiseHand('video')}
                className="flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-xs font-bold hover:bg-cyan-500/20"
                title="Join with camera on"
              >
                <Video className="h-3 w-3" /> Camera on
              </button>
              <button
                disabled={noteBusy}
                onClick={async () => {
                  setRecordingNote(true);
                  try {
                    const blob = await noteRecorder.start('audio', VOICE_NOTE_MAX_SECONDS);
                    setRecordingNote(false);
                    if (!blob || blob.size === 0 || !user) {
                      console.warn('voice note: no blob captured', { hasBlob: !!blob, size: blob?.size, hasUser: !!user });
                      return;
                    }
                    setNoteBusy(true);
                    const url = await uploadVoiceNote(user.id, blob);
                    setNoteBusy(false);
                    if (url) raiseHand('voice', url);
                    else console.warn('voice note: upload/moderation failed, no url');
                  } catch (err) {
                    console.error('voice note recording failed', err);
                    setRecordingNote(false);
                    setNoteBusy(false);
                  }
                }}
                className="flex items-center gap-1 rounded-md border border-purple-400/40 bg-purple-500/10 px-2 py-1 text-xs font-bold hover:bg-purple-500/20 disabled:opacity-50"
                title="Record a short voice note instead of waiting for a live slot — it plays to everyone when your turn comes up"
              >
                {noteBusy ? '…' : <Mic className="h-3 w-3" />} Record a voice note instead
              </button>
            </>
          ) : (
            <>
              <span className="text-xs text-amber-300 italic">Hand raised — waiting for host…</span>
              <button
                onClick={cancelHand}
                className="flex items-center gap-1 rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs hover:bg-white/10"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            </>
          )}
          </div>
          )}
        </div>
      )}

      {/* Universal Bestow CTA — guests bestow toward the now-playing seed (desktop/landscape only -- portrait's own Gift action-bar button opens the same modal) */}
      {!isHost && nowPlaying.sower_user_id && nowPlaying.sower_user_id !== user?.id && (
        <div className="hidden max-lg:landscape:flex lg:flex items-center justify-between gap-2 border-t border-rose-500/20 bg-rose-950/20 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-rose-100">
            <Heart className="h-3.5 w-3.5 text-rose-400" />
            <span className="truncate">Support “{nowPlaying.title}”</span>
          </div>
          <button
            onClick={() => setBestowOpen(true)}
            className="flex items-center gap-1 rounded-md bg-rose-500 px-3 py-1 text-xs font-bold text-white hover:bg-rose-400"
          >
            <Heart className="h-3 w-3" /> Bestow
          </button>
        </div>
      )}

      <QuickBestowModal
        open={bestowOpen}
        onClose={() => setBestowOpen(false)}
        orchardId={nowPlaying.seed_id}
        seedTitle={nowPlaying.title}
        sowerUserId={nowPlaying.sower_user_id || ''}
        hostUserId={isRadio ? (user?.id ?? null) : (sowerUserId ?? null)}
        whispererSharePct={whispererSharePct}
      />
    </div>
  );
}

// ── Headless Daily call rendering (replaces Daily's own prebuilt iframe UI,
// which never mounts anywhere in this file) ─────────────────────────────────
// Every piece here reads MediaStreamTracks off the SAME useDailyCallObject
// call above -- there is exactly one join per tab. ParticipantVideo/
// ParticipantAudio are the only two places a track is ever attached to a
// media element; the camera-mode grid and the non-camera PIP both go
// through them instead of each owning their own call.

/** Binds one MediaStreamTrack to a <video>. Never carries audio (video-only
 * track) -- ParticipantAudio is the only thing that plays sound, and only
 * ever for remote participants (see below), so the local mic is never
 * played back to itself. */
function ParticipantVideo({ track, className, mirror }: { track: MediaStreamTrack | null; className?: string; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = track ? new MediaStream([track]) : null;
  }, [track]);
  if (!track) return null;
  return <video ref={ref} autoPlay playsInline muted className={className} style={mirror ? { transform: 'scaleX(-1)' } : undefined} />;
}

/** Plays one remote participant's audio track. Never rendered for the local
 * participant -- that would play your own mic back to you.
 *
 * Renders standalone (no `autoPlay` attribute) and calls `.play()`
 * explicitly instead. The two are not equivalent for an UNMUTED element:
 * ParticipantVideo's `autoPlay` works because it's rendered `muted` (browsers
 * always allow muted autoplay); audio can't be muted and still be heard, and
 * an unmuted `autoPlay` failing under the browser's autoplay-with-sound
 * policy fails SILENTLY -- no thrown error, no console warning our own code
 * would see, just no sound. An explicit `.play()` call returns a promise we
 * can catch: on `NotAllowedError` we tell the caller (`onBlocked`) instead of
 * the participant just never hearing anything with no way to know why. */
function ParticipantAudio({ track, retryKey, onBlocked }: { track: MediaStreamTrack | null; retryKey?: number; onBlocked?: () => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = track ? new MediaStream([track]) : null;
    if (!track) return;
    el.play().catch((err: unknown) => {
      const name = (err as { name?: string } | undefined)?.name;
      if (name === 'NotAllowedError') onBlocked?.();
      else console.error('ParticipantAudio: play() failed', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, retryKey]);
  return <audio ref={ref} playsInline className="hidden" />;
}

/** Always mounted whenever the call is active, regardless of `stage.mode` --
 * previously every ParticipantAudio lived inside CallTile, which only ever
 * rendered inside camera-mode's CallStageArea, so switching to PDF/TEXT/etc.
 * silently stopped ALL remote audio (the Daily connection itself stayed
 * joined -- mic kept publishing -- there was just nothing left mounted to
 * PLAY what came back). One audio element per remote participant, full stop;
 * CallTile is purely visual and never touches audio. `retryKey` re-runs
 * `.play()` on every mounted element (see the "tap to enable sound" banner
 * in LiveStage's own render, and its `onBlocked`/retry wiring). */
function CallAudioLayer({ participants, retryKey, onBlocked }: { participants: Record<string, CallParticipant>; retryKey: number; onBlocked: () => void }) {
  const remotes = Object.values(participants).filter(p => !p.local);
  return (
    <>
      {remotes.map(p => (
        <ParticipantAudio key={p.sessionId} track={p.audioTrack} retryKey={retryKey} onBlocked={onBlocked} />
      ))}
    </>
  );
}

function CallTile({ participant, big }: { participant: CallParticipant; big?: boolean }) {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-lg bg-emerald-950/40 ${big ? 'h-full w-full' : 'h-24 w-32 flex-shrink-0'}`}>
      {participant.videoTrack ? (
        <ParticipantVideo track={participant.videoTrack} className="h-full w-full object-cover" mirror={participant.local} />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-base font-bold text-emerald-200">
          {participant.userName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white/90">
        {participant.audioOn ? <Mic className="h-2.5 w-2.5" /> : <MicOff className="h-2.5 w-2.5 text-rose-400" />}
        <span className="max-w-[70px] truncate">{participant.local ? 'You' : participant.userName}</span>
      </div>
    </div>
  );
}

interface CallStageAreaProps {
  participants: Record<string, CallParticipant>;
  connecting: boolean;
  joined: boolean;
  error: string | null;
  spotlightUserId: string | null;
  audioOn: boolean;
  videoOn: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeave: () => void;
}

/** Fills the big stage tile in camera mode. Spotlighted participant (if any)
 * goes big with everyone else in a thin dock strip below; otherwise a plain
 * wrapping grid, same participants Daily's own prebuilt UI used to lay out
 * on its own. */
function CallStageArea({ participants, connecting, joined, error, spotlightUserId, audioOn, videoOn, onToggleAudio, onToggleVideo, onLeave }: CallStageAreaProps) {
  const list = Object.values(participants);
  const spotlighted = spotlightUserId ? list.find(p => p.userId === spotlightUserId) ?? null : null;
  const others = spotlighted ? list.filter(p => p.sessionId !== spotlighted.sessionId) : [];

  return (
    <div className="absolute inset-0 flex flex-col bg-black">
      <div className="relative flex-1 min-h-0">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-rose-300">{error}</div>
        )}
        {!error && connecting && !joined && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">Connecting…</div>
        )}
        {!error && joined && spotlighted && <CallTile participant={spotlighted} big />}
        {!error && joined && !spotlighted && (
          <div className="flex h-full w-full flex-wrap items-center justify-center gap-2 overflow-y-auto p-2">
            {list.length === 0 && <div className="text-sm text-white/40">Waiting for others to join…</div>}
            {list.map(p => <CallTile key={p.sessionId} participant={p} />)}
          </div>
        )}
      </div>
      {spotlighted && others.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-t border-white/10 bg-black/60 px-2 py-1.5">
          {others.map(p => <CallTile key={p.sessionId} participant={p} />)}
        </div>
      )}
      <CallControlBar audioOn={audioOn} videoOn={videoOn} onToggleAudio={onToggleAudio} onToggleVideo={onToggleVideo} onLeave={onLeave} />
    </div>
  );
}

interface CallControlsProps {
  audioOn: boolean;
  videoOn: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeave: () => void;
}

/** Our own control bar -- mic, camera, leave. Daily's default UI never
 * renders anywhere in this file (createCallObject is headless by design). */
function CallControlBar({ audioOn, videoOn, onToggleAudio, onToggleVideo, onLeave }: CallControlsProps) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2 border-t border-white/10 bg-black/80 px-3 py-2">
      <button
        type="button"
        onClick={onToggleAudio}
        aria-label={audioOn ? 'Mute mic' : 'Unmute mic'}
        title={audioOn ? 'Mute mic' : 'Unmute mic'}
        className={`flex h-9 w-9 items-center justify-center rounded-full ${audioOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-rose-500 text-white hover:bg-rose-400'}`}
      >
        {audioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={onToggleVideo}
        aria-label={videoOn ? 'Turn camera off' : 'Turn camera on'}
        title={videoOn ? 'Turn camera off' : 'Turn camera on'}
        className={`flex h-9 w-9 items-center justify-center rounded-full ${videoOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
      >
        {videoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={onLeave}
        aria-label="Leave call"
        title="Leave call"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-500"
      >
        <PhoneOff className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Compact version of the same three controls, for the non-camera-mode PIP. */
function MiniCallControls({ audioOn, videoOn, onToggleAudio, onToggleVideo, onLeave }: CallControlsProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/80 px-1.5 py-1">
      <button type="button" onClick={onToggleAudio} aria-label={audioOn ? 'Mute mic' : 'Unmute mic'} title={audioOn ? 'Mute mic' : 'Unmute mic'} className={`flex h-6 w-6 items-center justify-center rounded-full ${audioOn ? 'text-white' : 'bg-rose-500 text-white'}`}>
        {audioOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
      </button>
      <button type="button" onClick={onToggleVideo} aria-label={videoOn ? 'Turn camera off' : 'Turn camera on'} title={videoOn ? 'Turn camera off' : 'Turn camera on'} className={`flex h-6 w-6 items-center justify-center rounded-full ${videoOn ? 'text-white' : 'text-white/50'}`}>
        {videoOn ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
      </button>
      <button type="button" onClick={onLeave} aria-label="Leave call" title="Leave call" className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white">
        <PhoneOff className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── Phone portrait layout pieces (390×844-class devices only) ──────────────
// Only ever rendered from inside the `max-lg:portrait:flex` wrapper above --
// desktop/landscape never mounts these, and keeps its own always-visible
// trays exactly as they were. Every action below calls the SAME
// useLiveStage functions the desktop trays already call; nothing new in
// the engine, just a compact tap-to-reveal presentation instead of an
// always-visible one.

interface PortraitSpeakerStripProps {
  isHost: boolean;
  approved: ApprovedGuest[];
  spotlightUserId: string | null;
  openTileId: string | null;
  setOpenTileId: (id: string | null) => void;
  onSetSpotlight: (userId: string | null) => void;
  onToggleMute: (userId: string, muted: boolean) => void;
  onRemoveGuest: (userId: string) => void;
  /** Live Daily call data, keyed by session id -- matched to an
   * ApprovedGuest by .userId so a tile can show the participant's actual
   * camera feed, not just their avatar/initial. */
  callParticipants: Record<string, CallParticipant>;
  hostVideoTrack: MediaStreamTrack | null;
  hostVideoOn: boolean;
  hostAvatar: string | null;
}

/** One tile's own picture: live camera feed (camera on) > avatar photo >
 * initial, in that priority -- "for host and all approved guests" means
 * the same three-tier fallback for both, not avatar-or-initial alone
 * (the bug reported live, 2026-09-15: tiles never rendered video at all,
 * even with a camera on). */
function TilePicture({ track, avatar, name, mirror }: { track: MediaStreamTrack | null; avatar: string | null; name: string; mirror?: boolean }) {
  if (track) return <ParticipantVideo track={track} className="h-full w-full rounded-full object-cover" mirror={mirror} />;
  if (avatar) return <img src={avatar} alt={name} className="h-full w-full rounded-full object-cover" />;
  return <span className="text-sm font-bold text-emerald-200">{name.charAt(0).toUpperCase()}</span>;
}

/** Host + up to 3 approved speakers as small round tiles in a row. A
 * tile's own mute/spotlight/remove controls open in a fixed bottom sheet
 * (PortraitTileActionsSheet below), not an absolutely-positioned popup
 * anchored to the tile itself -- that popup used to render inside THIS
 * row's own `overflow-x-auto` container, which per the CSS spec forces
 * the other axis (overflow-y) to also clip once either axis is non-
 * visible, silently cutting the popup off below the row instead of
 * showing it. Reported live, 2026-09-15, as "the spotlight control is
 * missing or not working" -- it was rendering, just invisible/unreachable
 * beneath the scrollable strip. A fixed-position sheet can't be clipped
 * by any ancestor's overflow, same reasoning PortraitQueueSheet already
 * relies on. */
function PortraitSpeakerStrip({ isHost, approved, spotlightUserId, openTileId, setOpenTileId, onSetSpotlight, onToggleMute, onRemoveGuest, callParticipants, hostVideoTrack, hostVideoOn, hostAvatar }: PortraitSpeakerStripProps) {
  const guests = approved.slice(0, 3);
  const findVideoTrack = (userId: string) => Object.values(callParticipants).find(p => p.userId === userId)?.videoTrack ?? null;
  const openGuest = guests.find(g => g.user_id === openTileId) ?? null;
  return (
    <>
      <div className="flex shrink-0 items-center gap-3 overflow-x-auto border-t border-white/10 bg-black/80 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpenTileId(null)}
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 ${
            !spotlightUserId ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'border-emerald-500/40'
          } bg-emerald-950/50`}
          aria-label="Host"
        >
          {hostVideoOn && hostVideoTrack ? (
            <ParticipantVideo track={hostVideoTrack} className="h-full w-full rounded-full object-cover" mirror />
          ) : hostAvatar ? (
            <img src={hostAvatar} alt="Host" className="h-full w-full rounded-full object-cover" />
          ) : (
            <Crown className="h-5 w-5 text-amber-300" />
          )}
        </button>
        {guests.map((g) => {
          const isLit = g.user_id === spotlightUserId;
          return (
            <button
              key={g.user_id}
              type="button"
              onClick={() => isHost && setOpenTileId(g.user_id)}
              aria-label={g.name}
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 ${
                isLit ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'border-emerald-500/40'
              } bg-emerald-950/40`}
            >
              <TilePicture track={findVideoTrack(g.user_id)} avatar={g.avatar ?? null} name={g.name} />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black">
                {g.mode === 'video'
                  ? <Video className="h-2.5 w-2.5 text-amber-300" />
                  : (g.muted ? <MicOff className="h-2.5 w-2.5 text-rose-400" /> : <Mic className="h-2.5 w-2.5 text-emerald-300" />)}
              </span>
            </button>
          );
        })}
        {guests.length === 0 && (
          <span className="truncate text-xs italic text-white/40">Seats open — raise a hand to join</span>
        )}
      </div>
      {isHost && openGuest && (
        <PortraitTileActionsSheet
          guest={openGuest}
          isLit={openGuest.user_id === spotlightUserId}
          onSetSpotlight={onSetSpotlight}
          onToggleMute={onToggleMute}
          onRemoveGuest={onRemoveGuest}
          onClose={() => setOpenTileId(null)}
        />
      )}
    </>
  );
}

/** Fixed bottom sheet (same pattern as PortraitQueueSheet below -- proven
 * not to get clipped by any ancestor) for one guest tile's actions: send
 * to/remove from the big screen, mute/unmute, remove from stage. Host-only,
 * opened by a single tap on that guest's tile. */
function PortraitTileActionsSheet({ guest, isLit, onSetSpotlight, onToggleMute, onRemoveGuest, onClose }: {
  guest: ApprovedGuest;
  isLit: boolean;
  onSetSpotlight: (userId: string | null) => void;
  onToggleMute: (userId: string, muted: boolean) => void;
  onRemoveGuest: (userId: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[1100] bg-black/60" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[1101] rounded-t-2xl border-t border-amber-500/30 bg-[#0b1120] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">{guest.name}</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-white/60" /></button>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => { onSetSpotlight(isLit ? null : guest.user_id); onClose(); }}
            className="flex w-full items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm font-bold text-amber-200"
          >
            <Star className="h-4 w-4" /> {isLit ? 'Remove from big screen' : 'Send to big screen'}
          </button>
          <button
            type="button"
            onClick={() => { onToggleMute(guest.user_id, !guest.muted); onClose(); }}
            className="flex w-full items-center gap-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-3 text-sm font-bold text-sky-200"
          >
            {guest.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />} {guest.muted ? 'Unmute' : 'Mute'}
          </button>
          <button
            type="button"
            onClick={() => { onRemoveGuest(guest.user_id); onClose(); }}
            className="flex w-full items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-3 text-sm font-bold text-rose-200"
          >
            <UserMinus className="h-4 w-4" /> Remove from stage
          </button>
        </div>
      </div>
    </>
  );
}

interface PortraitActionBarProps {
  isHost: boolean;
  myHandRaised: boolean;
  hands: HandRaise[];
  onRaiseHand: () => void;
  onCancelHand: () => void;
  onOpenQueue: () => void;
  onGift: () => void;
  onShare: () => void;
}

/** One fixed row: Raise hand · Queue · Gift · Share. Host's own "Raise
 * hand" slot is inert (hosts don't raise hands to themselves); Queue opens
 * the approve/deny sheet for the host instead of a status toast. */
function PortraitActionBar({ isHost, myHandRaised, hands, onRaiseHand, onCancelHand, onOpenQueue, onGift, onShare }: PortraitActionBarProps) {
  return (
    <div className="grid shrink-0 grid-cols-4 gap-1 border-t border-white/10 bg-black/90 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        disabled={isHost}
        onClick={isHost ? undefined : (myHandRaised ? onCancelHand : onRaiseHand)}
        className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wide ${
          isHost ? 'text-white/25' : myHandRaised ? 'bg-amber-500/20 text-amber-300' : 'text-white/80 hover:bg-white/10'
        }`}
      >
        <Hand className="h-4 w-4" /> {myHandRaised && !isHost ? 'Cancel' : 'Raise hand'}
      </button>
      <button type="button" onClick={onOpenQueue} className="relative flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/80 hover:bg-white/10">
        <Users className="h-4 w-4" /> Queue
        {hands.length > 0 && (
          <span className="absolute -top-0.5 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-black">{hands.length}</span>
        )}
      </button>
      <button type="button" onClick={onGift} className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-300 hover:bg-white/10">
        <Heart className="h-4 w-4" /> Gift
      </button>
      <button type="button" onClick={onShare} className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/80 hover:bg-white/10">
        <Share2 className="h-4 w-4" /> Share
      </button>
    </div>
  );
}

/** Host-only, tap-triggered from the action bar's Queue button -- same
 * ordered hand-raise list + approve/deny the desktop tray already shows,
 * as a bottom sheet instead of an always-visible strip. */
function PortraitQueueSheet({ hands, onApprove, onDeny, onClose }: { hands: HandRaise[]; onApprove: (h: HandRaise) => void; onDeny: (userId: string) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-[1100] bg-black/60" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[1101] max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-amber-500/30 bg-[#0b1120] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-amber-300">🙋 Hand raises ({hands.length})</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-white/60" /></button>
        </div>
        {hands.length === 0 && <p className="py-6 text-center text-sm text-white/40">No one's waiting right now.</p>}
        <div className="space-y-2">
          {hands.map((h, i) => (
            <div key={h.user_id} className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-black/40 px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-black text-amber-300">#{i + 1}</span>
              {h.voiceNoteUrl ? <Mic className="h-4 w-4 shrink-0 text-emerald-300" /> : h.want === 'video' ? <Video className="h-4 w-4 shrink-0 text-amber-300" /> : <Mic className="h-4 w-4 shrink-0 text-amber-300" />}
              <span className="flex-1 truncate text-sm font-bold text-white">{h.name}</span>
              {h.voiceNoteUrl && <span className="shrink-0 text-[10px] text-emerald-300">plays at #1</span>}
              {!h.voiceNoteUrl && (
                <button type="button" onClick={() => onApprove(h)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-black" aria-label="Approve"><Check className="h-4 w-4" /></button>
              )}
              <button type="button" onClick={() => onDeny(h.user_id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white" aria-label="Decline"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
