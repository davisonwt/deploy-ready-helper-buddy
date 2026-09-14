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
  Hand, Mic, MicOff, Video, VideoOff, X, Check, UserMinus,
  ChevronLeft, ChevronRight, Music, Heart, Search, Star, Crown, Users, Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDailyIframeSrc } from '@/lib/daily-config';
import { useAuth } from '@/hooks/useAuth';
import { useLiveStage, type StageMode, type NowPlaying, type ApprovedGuest, type HandRaise } from '@/hooks/useLiveStage';
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

  const spotlightUserId = stage.spotlightUserId ?? null;
  const spotlightedGuest = approved.find(g => g.user_id === spotlightUserId) ?? null;

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
    setStageMode({ mode: 'video', mediaUrl: m.audio_url, mediaKind: 'audio', nowPlaying: np });
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

  // Push board text changes (debounced) when host edits
  useEffect(() => {
    if (!isHost || stage.mode !== 'whiteboard') return;
    const t = setTimeout(() => {
      setStageMode({ mode: 'whiteboard', text: boardText });
    }, 250);
    return () => clearTimeout(t);
  }, [boardText, isHost, stage.mode, setStageMode]);

  useEffect(() => {
    if (!isHost && stage.mode === 'whiteboard' && typeof stage.text === 'string') {
      setBoardText(stage.text);
    }
  }, [isHost, stage.mode, stage.text]);

  const displayName = (user as any)?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Tribe';

  // Whether the local user should actually have an audio/video transport.
  // Hosts always join; viewers only join when approved (so we save bandwidth).
  const inCall = isHost || iAmApproved;

  // P1-6: was a bare iframe against a raw meet.sow2growapp.com URL with no
  // JWT. Daily's own prebuilt UI doesn't support the old start-muted/
  // start-video-off URL hints (those were config.* Jitsi params) -- a
  // viewer who joins muted-by-approval now un-mutes themselves manually
  // inside Daily's own controls instead of it being pre-set for them.
  const { src: jitsiSrc, loading: callLoading } = useDailyIframeSrc(inCall ? 'custom' : null, jitsiRoom, displayName);

  // Stage content (what occupies the big tile)
  const stageImage = stage.mode === 'image'
    ? (stage.imageUrl || imgList[(stage.imageIdx ?? 0) % Math.max(imgList.length, 1)])
    : null;

  return (
    <div className={`flex h-full w-full flex-col bg-black text-white ${className}`}>
      {/* Host presentation tabs */}
      {isHost && (
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
        {/* Camera mode → Daily call iframe */}
        {stage.mode === 'camera' && inCall && jitsiSrc && (
          <iframe
            title={title}
            src={jitsiSrc}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="absolute inset-0 h-full w-full border-0"
          />
        )}
        {stage.mode === 'camera' && inCall && !jitsiSrc && callLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">Connecting…</div>
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
                    setStageMode({ mode: 'image', imageUrl: imgList[next], imageIdx: next });
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/85"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    const next = ((stage.imageIdx ?? 0) + 1) % imgList.length;
                    setStageMode({ mode: 'image', imageUrl: imgList[next], imageIdx: next });
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
            {isHost ? (
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

        {/* Gathering Room batch 1 board modes */}
        {stage.mode === 'pdf' && (
          <div className="absolute inset-0">
            <PdfBoard isHost={isHost} stage={stage} setStageMode={setStageMode} />
          </div>
        )}
        {stage.mode === 'clip' && (
          <div className="absolute inset-0">
            <ClipBoard isHost={isHost} stage={stage} setStageMode={setStageMode} />
          </div>
        )}
        {stage.mode === 'seed' && (
          <div className="absolute inset-0 bg-[#0b1120]">
            <SeedPinBoard isHost={isHost} stage={stage} setStageMode={setStageMode} />
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
            Daily's prebuilt UI is the whole iframe's own content (no SDK,
            no way to suppress its per-tile hover menu from our side --
            see daily-config.ts's own doc comment); this at least stops
            OUR OWN board controls and Daily's tile UI from sitting in the
            exact same corner. */}
        {isHost && stage.mode !== 'camera' && jitsiSrc && (
          <div className="absolute top-3 right-3 z-[5] h-20 w-28 max-lg:portrait:h-20 max-lg:portrait:w-28 lg:h-32 lg:w-44 overflow-hidden rounded-lg border border-emerald-500/30 bg-black shadow-2xl">
            <iframe
              title="host-cam"
              src={jitsiSrc}
              allow="camera; microphone; autoplay"
              className="h-full w-full border-0"
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
}

/** Host + up to 3 approved speakers as small round tiles in a row. A
 * tile's own mute/spotlight/remove controls are collapsed behind a tap on
 * that tile (host only) instead of floating permanently over it -- this is
 * what "nothing overlaps the board" means for the speaker strip itself. */
function PortraitSpeakerStrip({ isHost, approved, spotlightUserId, openTileId, setOpenTileId, onSetSpotlight, onToggleMute, onRemoveGuest }: PortraitSpeakerStripProps) {
  const guests = approved.slice(0, 3);
  return (
    <div className="flex shrink-0 items-center gap-3 overflow-x-auto border-t border-white/10 bg-black/80 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpenTileId(null)}
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${
          !spotlightUserId ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'border-emerald-500/40'
        } bg-emerald-950/50`}
        aria-label="Host"
      >
        <Crown className="h-5 w-5 text-amber-300" />
      </button>
      {guests.map((g) => {
        const isLit = g.user_id === spotlightUserId;
        const open = openTileId === g.user_id;
        return (
          <div key={g.user_id} className="relative shrink-0">
            <button
              type="button"
              onClick={() => isHost && setOpenTileId(open ? null : g.user_id)}
              aria-label={g.name}
              className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                isLit ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'border-emerald-500/40'
              } bg-emerald-950/40`}
            >
              {g.avatar ? (
                <img src={g.avatar} alt={g.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-emerald-200">{g.name.charAt(0).toUpperCase()}</span>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black">
                {g.mode === 'video'
                  ? <Video className="h-2.5 w-2.5 text-amber-300" />
                  : (g.muted ? <MicOff className="h-2.5 w-2.5 text-rose-400" /> : <Mic className="h-2.5 w-2.5 text-emerald-300" />)}
              </span>
            </button>
            {isHost && open && (
              <div className="absolute left-1/2 top-full z-20 mt-1.5 flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-black/95 p-1 shadow-xl backdrop-blur">
                <button type="button" onClick={() => { onSetSpotlight(isLit ? null : g.user_id); setOpenTileId(null); }} className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-black" aria-label={isLit ? 'Remove from big screen' : 'Send to big screen'}>
                  <Star className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => onToggleMute(g.user_id, !g.muted)} className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-black" aria-label={g.muted ? 'Unmute' : 'Mute'}>
                  {g.muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
                <button type="button" onClick={() => { onRemoveGuest(g.user_id); setOpenTileId(null); }} className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white" aria-label="Remove from stage">
                  <UserMinus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
      {guests.length === 0 && (
        <span className="truncate text-xs italic text-white/40">Seats open — raise a hand to join</span>
      )}
    </div>
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
