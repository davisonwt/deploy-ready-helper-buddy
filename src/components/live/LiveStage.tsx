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
  ChevronLeft, ChevronRight, Music, Heart, Search, Star, Crown,
} from 'lucide-react';
import { JITSI_DOMAIN } from '@/lib/jitsi-config';
import { useAuth } from '@/hooks/useAuth';
import { useLiveStage, type StageMode, type NowPlaying } from '@/hooks/useLiveStage';
import { supabase } from '@/integrations/supabase/client';
import QuickBestowModal from '@/components/bestow/QuickBestowModal';

export interface LiveStageProps {
  seedId: string;
  title: string;
  jitsiRoom: string;
  isHost: boolean;
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
  { mode: 'whiteboard', icon: PencilLine, label: 'Board' },
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
  seedId, title, jitsiRoom, isHost,
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
  } = useLiveStage(seedId, { isHost, enabled: true });

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

  // Whether the local user should actually have a Jitsi audio/video transport
  // Hosts always join; viewers only join when approved (so we save bandwidth).
  const inCall = isHost || iAmApproved;

  const jitsiSrc = useMemo(() => {
    const startMuted = !isHost && approved.find(g => g.user_id === user?.id)?.muted ? 1 : 0;
    const startVideoMuted = !isHost && (approved.find(g => g.user_id === user?.id)?.mode !== 'video') ? 1 : 0;
    return `https://${JITSI_DOMAIN}/${jitsiRoom}#config.prejoinPageEnabled=false&config.disableDeepLinking=true&config.startWithAudioMuted=${startMuted}&config.startWithVideoMuted=${startVideoMuted}&userInfo.displayName=%22${encodeURIComponent(displayName)}%22`;
  }, [jitsiRoom, isHost, approved, user?.id, displayName]);

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
                onClick={() => setStageMode({ mode: t.mode, imageUrl: t.mode === 'image' ? imgList[0] : null, imageIdx: 0 })}
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
        {/* Camera mode → Jitsi iframe */}
        {stage.mode === 'camera' && inCall && (
          <iframe
            title={title}
            src={jitsiSrc}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="absolute inset-0 h-full w-full border-0"
          />
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

        {/* Picture-in-picture host camera when not in camera mode (host preview) */}
        {isHost && stage.mode !== 'camera' && (
          <div className="absolute bottom-3 right-3 z-[5] h-32 w-44 overflow-hidden rounded-lg border border-emerald-500/30 bg-black shadow-2xl">
            <iframe
              title="host-cam"
              src={jitsiSrc}
              allow="camera; microphone; autoplay"
              className="h-full w-full border-0"
            />
          </div>
        )}
      </div>

      {/* Guest boxes row — Discord/TikTok style "seats" */}
      {(approved.length > 0 || isHost) && (
        <div className="flex items-stretch gap-2 border-t border-white/10 bg-gradient-to-b from-black/80 to-black/95 px-3 py-2.5 overflow-x-auto">
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

      {/* Host: spotlight requests tray */}
      {isHost && spotlightRequests.length > 0 && (
        <div className="border-t border-amber-500/30 bg-gradient-to-r from-amber-950/40 to-amber-900/20 px-3 py-2">
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

      {/* Host: hand-raise tray */}
      {isHost && hands.length > 0 && (
        <div className="border-t border-amber-500/30 bg-amber-950/30 px-3 py-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
            🙋 Hand raises ({hands.length})
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {hands.map(h => (
              <motion.div
                key={h.user_id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-black/40 px-2 py-1 text-xs"
              >
                {h.want === 'video' ? <Video className="h-3 w-3 text-amber-300" /> : <Mic className="h-3 w-3 text-amber-300" />}
                <span className="font-bold">{h.name}</span>
                <button
                  onClick={() => approveHand(h)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black hover:bg-emerald-400"
                  title="Approve"
                ><Check className="h-3 w-3" /></button>
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

      {/* Guest: request-to-join controls */}
      {!isHost && !iAmApproved && (
        <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-black/70 px-3 py-2">
          <Hand className="h-4 w-4 text-amber-300" />
          {!myHandRaised ? (
            <>
              <span className="text-xs text-white/70">Request to join the live:</span>
              <button
                onClick={() => raiseHand('voice')}
                className="flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs font-bold hover:bg-emerald-500/20"
              >
                <Mic className="h-3 w-3" /> Voice
              </button>
              <button
                onClick={() => raiseHand('video')}
                className="flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-xs font-bold hover:bg-cyan-500/20"
              >
                <Video className="h-3 w-3" /> Video
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

      {/* Universal Bestow CTA — guests bestow toward the now-playing seed */}
      {!isHost && nowPlaying.sower_user_id && nowPlaying.sower_user_id !== user?.id && (
        <div className="flex items-center justify-between gap-2 border-t border-rose-500/20 bg-rose-950/20 px-3 py-2">
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
