/**
 * LiveStageOverlay — the full-screen "Go Live" overlay used everywhere a tribe
 * member starts/joins a live seed (LivingSeedCard, /orchard-alive, dashboard).
 *
 * Layout:
 *   ┌────────────────── header (live · title · faceless · open seed · close) ──────────────────┐
 *   │ LEFT: <LiveStage … />                  │  RIGHT: seed media (carousel + audio/video)    │
 *   │                                        │         + live chat                            │
 *   └─────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Built on the existing LiveStage + Supabase realtime broadcast (`liveroom:${seedId}`).
 * No new DB tables.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  X, MessageCircle, ChevronLeft, ChevronRight, EyeOff, Eye, Send, Users, Radio, Share2, Lock, Unlock, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import LiveStage from '@/components/live/LiveStage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTribalLiveOrchard, type SessionAccess } from '@/hooks/useTribalLiveOrchard';
import { useGatheringModerators } from '@/hooks/useGatheringModerators';
import { useLiveStage } from '@/hooks/useLiveStage';

export interface LiveStageOverlayProps {
  seedId: string;
  title: string;
  subtitle?: string;
  jitsiRoom: string;
  isHost: boolean;
  /** goLive()'s own gathering_sessions.id -- see LiveStage.tsx's prop of the same name. Omit for a guest. */
  hostSessionId?: string | null;
  isRadio?: boolean;
  sowerUserId?: string | null;
  images?: string[];
  mediaUrl?: string | null;
  mediaKind?: 'audio' | 'video' | 'book' | 'orchard' | 'seed';
  whispererSharePct?: number;
  /** Path the "Open seed" header button navigates to. If omitted the button is hidden. */
  openPath?: string;
  /** Called when the user closes the overlay. Caller decides whether to also endLive(). */
  onClose: () => void;
}

/**
 * Read-only status for one row of the participants sheet: who is host, who is
 * a moderator, who currently holds the live mic, and who is on the big screen.
 * Deliberately has no actions -- the moderator controls stay where they are.
 */
function StatusBadges({ isHost, isModerator, hasMic, isSharing }: {
  isHost: boolean; isModerator: boolean; hasMic: boolean; isSharing: boolean;
}) {
  const pills: { key: string; label: string; className: string }[] = [];
  if (isHost) pills.push({ key: 'host', label: 'Host', className: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' });
  if (isModerator && !isHost) pills.push({ key: 'mod', label: 'Moderator', className: 'bg-sky-500/20 text-sky-200 border-sky-400/30' });
  if (hasMic) pills.push({ key: 'mic', label: 'Live mic', className: 'bg-amber-500/20 text-amber-200 border-amber-400/30' });
  if (isSharing) pills.push({ key: 'share', label: 'Sharing', className: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/30' });
  if (pills.length === 0) return null;
  return (
    <span className="ml-auto flex shrink-0 flex-wrap items-center gap-1">
      {pills.map((p) => (
        <span key={p.key} className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none ${p.className}`}>
          {p.label}
        </span>
      ))}
    </span>
  );
}

export default function LiveStageOverlay({
  seedId, title, subtitle, jitsiRoom, isHost, hostSessionId,
  isRadio = false, sowerUserId,
  images = [], mediaUrl, mediaKind,
  whispererSharePct = 10,
  openPath,
  onClose,
}: LiveStageOverlayProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateSessionAccess } = useTribalLiveOrchard();
  // Part 2: host or a session moderator can delete a chat message -- own
  // instance of the hook (see useGatheringModerators.ts's own doc comment
  // on why LiveStage.tsx and this overlay each resolve it independently).
  const { isHostOrMod, hostId, moderatorUserIds } = useGatheringModerators(seedId, isHost, hostSessionId);

  // "See everyone" bug fix (root cause: this button used to navigate() to
  // /live/:seedId/room -- a real route change, which unmounts whichever
  // page renders this overlay and, with it, <LiveStage>'s Daily call.
  // Confirmed live: the acting viewer got dropped from the call entirely
  // (others stayed connected -- their own tabs never unmounted). Fixed by
  // showing the same info in-place instead of navigating anywhere.
  // isHost:false and no hostSessionId on purpose -- this second useLiveStage
  // instance is read-only display only, never writes board_state and never
  // runs the host-only "close the session row on unmount" cleanup (that
  // path is gated on hostSessionId being set), so it can't interfere with
  // <LiveStage>'s own instance of this same hook.
  const {
    approved: everyoneApproved,
    hands: everyoneHands,
    // Read-only, for the participants sheet's per-row status below.
    liveSpeakerUserId: everyoneSpeakerUserId,
    stage: everyoneStage,
    present: everyonePresent,
  } = useLiveStage(seedId, { isHost: false, enabled: true });
  // The group that was invisible: in the session, never raised a hand. Derived
  // by subtraction so nobody can appear in two groups at once.
  const watching = useMemo(() => {
    const onPanel = new Set<string>(everyoneApproved.map((g) => g.user_id));
    if (hostId) onPanel.add(hostId);
    const waiting = new Set<string>(everyoneHands.map((h) => h.user_id));
    return everyonePresent.filter((p) => !onPanel.has(p.user_id) && !waiting.has(p.user_id));
  }, [everyonePresent, everyoneApproved, everyoneHands, hostId]);
  const [participantsSheetOpen, setParticipantsSheetOpen] = useState(false);
  // The approved list is guests only (useLiveStage builds it from approve_hand),
  // so the host would otherwise be missing from a sheet titled "Everyone here".
  const [hostName, setHostName] = useState<string | null>(null);
  useEffect(() => {
    if (!hostId) { setHostName(null); return; }
    let alive = true;
    supabase
      .from('public_profiles' as any)
      .select('username, display_name')
      .eq('user_id', hostId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const p = data as { username?: string; display_name?: string } | null;
        setHostName(p?.display_name || p?.username || null);
      });
    return () => { alive = false; };
  }, [hostId]);

  const imgList = (images || []).filter(Boolean) as string[];
  const [overlayImgIdx, setOverlayImgIdx] = useState(0);
  const [faceless, setFaceless] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<Array<{ id: string; from: string; text: string; at: number }>>([]);
  const [chatDraft, setChatDraft] = useState('');

  // "Live Now" directory (2026-09-15): host-only Open/Restricted toggle.
  // Read straight off this host's own gathering_sessions row (hostSessionId
  // is only ever set for the actual host -- see this prop's own doc
  // comment) rather than threading access through every goLive() caller;
  // one place to read/toggle it, works everywhere this overlay is used.
  const [access, setAccess] = useState<SessionAccess>('open');
  useEffect(() => {
    if (!isHost || !hostSessionId) return;
    let cancelled = false;
    supabase.from('gathering_sessions' as any).select('access').eq('id', hostSessionId).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const a = (data as any)?.access as SessionAccess | undefined;
        if (a === 'open' || a === 'restricted') setAccess(a);
      });
    return () => { cancelled = true; };
  }, [isHost, hostSessionId]);

  const toggleAccess = async () => {
    const next: SessionAccess = access === 'open' ? 'restricted' : 'open';
    setAccess(next);
    await updateSessionAccess(seedId, next);
    toast.success(next === 'open' ? 'Session is now Open — listed in Live Now, anyone can join' : 'Session is now Restricted — invite link only, not listed as joinable');
  };

  // Live-room chat (Supabase realtime broadcast)
  useEffect(() => {
    const ch = supabase.channel(`liveroom:${seedId}`);
    ch.on('broadcast', { event: 'chat' }, ({ payload }) => {
      setChatMsgs(m => [...m.slice(-99), payload as any]);
    }).on('broadcast', { event: 'delete_chat' }, ({ payload }) => {
      // Chat is broadcast-only, never persisted -- "delete" just means
      // every currently-connected client drops it from their own local
      // list, same as it was never durable to begin with.
      setChatMsgs(m => m.filter(msg => msg.id !== (payload as { id: string }).id));
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [seedId]);

  // Part 2: host or moderator only -- see useGatheringModerators.ts.
  const deleteChatMessage = (id: string) => {
    if (!isHostOrMod) return;
    setChatMsgs(m => m.filter(msg => msg.id !== id));
    supabase.channel(`liveroom:${seedId}`).send({ type: 'broadcast', event: 'delete_chat', payload: { id } });
  };

  const sendChat = () => {
    const text = chatDraft.trim();
    if (!text) return;
    const msg = {
      id: Math.random().toString(36).slice(2),
      from: (user as any)?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Guest',
      text,
      at: Date.now(),
    };
    supabase.channel(`liveroom:${seedId}`).send({ type: 'broadcast', event: 'chat', payload: msg });
    setChatMsgs(m => [...m.slice(-99), msg]);
    setChatDraft('');
  };

  // Same share action as LiveStage's own portrait action-bar Share button
  // (handlePortraitShareTap) -- desktop's top bar never had an equivalent.
  const handleShareTap = async () => {
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelled */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); toast.success('Link copied!'); } catch { toast.error("Couldn't copy the link"); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex flex-col bg-black"
    >
      <div className="flex items-center justify-between gap-y-1 border-b border-emerald-500/20 bg-emerald-950/60 px-4 py-2 text-white max-lg:portrait:flex-wrap max-lg:portrait:shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-400" />
          Live: <span className="font-semibold">{title}</span>
          <span className="ml-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
            🎤 {isHost ? 'You are hosting' : `Whisperer earns ${whispererSharePct}%`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={() => void toggleAccess()}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-bold ${
                access === 'open' ? 'text-emerald-300 hover:bg-emerald-500/10' : 'text-amber-300 hover:bg-amber-500/10'
              }`}
              title={access === 'open'
                ? 'Open — anyone can find and join from Live Now. Tap to make invite-only.'
                : 'Restricted — invite link only, not listed as joinable. Tap to make it open.'}
            >
              {access === 'open' ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {access === 'open' ? 'Open session' : 'Restricted'}
            </button>
          )}
          <button
            onClick={() => setFaceless(f => !f)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
            title="Hide face — guests see the seed image instead"
          >
            {faceless ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {faceless ? 'Show face' : 'Faceless'}
          </button>
          <button
            onClick={() => void handleShareTap()}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
            title="Copy the invite link"
          >
            <Share2 className="h-3 w-3" /> Share
          </button>
          <button
            onClick={() => setParticipantsSheetOpen(true)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
            title="See everyone joined / queued / in the pocket"
          >
            <Users className="h-3 w-3" /> See everyone
          </button>
          {openPath && (
            <button
              onClick={() => navigate(openPath)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
            >
              <MessageCircle className="h-3 w-3" /> Open seed
            </button>
          )}
          {isHost && (
            <button
              onClick={onClose}
              className="flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-200 hover:bg-rose-500/20"
              title="End your live for everyone"
            >
              <Radio className="h-3 w-3" /> End live
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
          >
            <X className="h-3 w-3" /> Close
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* LEFT: Stage. Portrait phone: an explicit flex ratio against the
            chat panel below (both min-h-0) instead of flex-1 racing a
            content-sized sibling -- previously the board could get
            squeezed toward its min-h-[40vh] floor by however much chat/
            seed-media content happened to need, and nothing stopped the
            total from exceeding the viewport (chat's own input pushed off
            the bottom). A fixed ratio makes "board is the largest
            element" and "chat never pushes the board off screen" both
            true regardless of message count. Desktop/landscape (md+)
            unaffected -- flex-1 there still means "the rest of the row". */}
        <div className="relative flex-1 min-h-[40vh] bg-black max-lg:portrait:flex-[3] max-lg:portrait:min-h-0 max-lg:portrait:basis-0">
          <LiveStage
            seedId={seedId}
            title={title}
            jitsiRoom={jitsiRoom}
            isHost={isHost}
            hostSessionId={hostSessionId}
            isRadio={isRadio}
            sowerUserId={sowerUserId ?? null}
            whispererSharePct={whispererSharePct}
            images={imgList}
            mediaUrl={mediaUrl ?? null}
            mediaKind={mediaKind}
          />
        </div>

        {/* RIGHT: seed media + chat. Portrait phone: explicit flex ratio
            against the board above (see its own comment) -- and seed
            media (carousel/inline video/audio) is dropped entirely so
            this panel is just chat, filling its whole allotted share. */}
        <div className="flex w-full md:w-[360px] flex-col border-l border-white/5 bg-[#0a0f1a] text-white max-lg:portrait:flex-[2] max-lg:portrait:min-h-0 max-lg:portrait:basis-0 max-lg:portrait:w-full">
          <div className="hidden max-lg:landscape:block lg:block border-b border-white/5 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">🌱 Seed Media</div>
            <div className="mt-1 truncate text-sm font-bold">{title}</div>
            {subtitle && <div className="mt-0.5 line-clamp-2 text-xs text-white/60">{subtitle}</div>}
          </div>

          {/* Image carousel (desktop/landscape only, see above) */}
          {imgList.length > 0 && (
            <div className="hidden max-lg:landscape:block lg:block relative h-44 bg-black">
              <img
                key={imgList[overlayImgIdx % imgList.length]}
                src={imgList[overlayImgIdx % imgList.length]}
                alt=""
                className="h-full w-full object-contain"
              />
              {imgList.length > 1 && (
                <>
                  <button
                    aria-label="Previous"
                    onClick={() => setOverlayImgIdx(i => (i - 1 + imgList.length) % imgList.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/85"
                  ><ChevronLeft className="h-4 w-4" /></button>
                  <button
                    aria-label="Next"
                    onClick={() => setOverlayImgIdx(i => (i + 1) % imgList.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/85"
                  ><ChevronRight className="h-4 w-4" /></button>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold">
                    {(overlayImgIdx % imgList.length) + 1}/{imgList.length}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Inline media (desktop/landscape only, see above) */}
          {mediaUrl && mediaKind === 'video' && (
            <video src={mediaUrl} controls className="hidden max-lg:landscape:block lg:block w-full bg-black" />
          )}
          {mediaUrl && mediaKind === 'audio' && (
            <audio src={mediaUrl} controls className="hidden max-lg:landscape:block lg:block w-full p-2" />
          )}

          {/* Chat -- fills whatever's left of this panel's own flex-[2]
              share on portrait; input stays a normal flow child (not
              position:fixed) so it's never hidden behind the on-screen
              keyboard, just wherever this bounded column's bottom is. */}
          <div className="flex flex-1 min-h-0 flex-col">
            <div className="border-b border-t border-white/5 bg-black/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              💬 Live Chat
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {chatMsgs.length === 0 && (
                <div className="p-3 text-center text-xs text-white/40 italic">
                  Be the first to say hello.
                </div>
              )}
              {chatMsgs.map(m => (
                <div key={m.id} className="flex items-start gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-emerald-300">{m.from}</div>
                    <div className="text-white/85">{m.text}</div>
                  </div>
                  {isHostOrMod && (
                    <button
                      type="button"
                      onClick={() => deleteChatMessage(m.id)}
                      aria-label="Delete message"
                      title="Delete message"
                      className="shrink-0 rounded p-0.5 text-white/30 hover:bg-rose-500/20 hover:text-rose-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); sendChat(); }}
              className="flex gap-1.5 border-t border-white/5 p-2"
            >
              <input
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Ask the host…"
                className="flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-emerald-400/60 focus:outline-none"
              />
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 text-black hover:bg-emerald-400"
                aria-label="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* "See everyone" -- in-place, on top of the still-live call (see the
          hook comment above for why this replaced a navigate() call). */}
      {participantsSheetOpen && (
        <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/70 sm:items-center" onClick={() => setParticipantsSheetOpen(false)}>
          <div
            className="max-h-[70vh] w-full max-w-sm overflow-hidden rounded-t-2xl border border-emerald-500/30 bg-[#0a0f1a] text-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-3">
              <span className="text-sm font-extrabold">👥 Everyone here</span>
              <button onClick={() => setParticipantsSheetOpen(false)} aria-label="Close"><X className="h-4 w-4 text-white/50" /></button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-3 space-y-3">
              <div>
                {/* Counts the host too -- the row is right there below, so a
                    header reading 0 above a visible person was its own small lie. */}
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">In the pocket · {everyoneApproved.length + (hostId ? 1 : 0)}</div>
                {everyoneApproved.length === 0 && !hostId && <div className="rounded-md bg-black/20 p-2 text-center text-xs italic text-white/40">Empty seats.</div>}
                {/* Host row: the approved list is guests only, so without this the
                    one person always in the session would be missing from a sheet
                    called "Everyone here". Read-only, like every row here. */}
                {hostId && (
                  <div className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5 text-xs">
                    <div className="h-6 w-6 rounded-full bg-emerald-900/40" />
                    <span className="truncate font-bold">
                      {isHost ? 'You' : hostName || 'Host'}
                    </span>
                    <StatusBadges
                      isHost
                      isModerator={false}
                      hasMic={everyoneSpeakerUserId === hostId}
                      isSharing={(everyoneStage?.spotlightUserId ?? null) === hostId}
                    />
                  </div>
                )}
                {everyoneApproved.map((g) => (
                  <div key={g.user_id} className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5 text-xs">
                    {g.avatar ? <img src={g.avatar} alt="" className="h-6 w-6 rounded-full object-cover" /> : <div className="h-6 w-6 rounded-full bg-emerald-900/40" />}
                    <span className="truncate font-bold">{g.name}</span>
                    <StatusBadges
                      isHost={g.user_id === hostId}
                      isModerator={moderatorUserIds.has(g.user_id)}
                      hasMic={everyoneSpeakerUserId === g.user_id}
                      isSharing={(everyoneStage?.spotlightUserId ?? null) === g.user_id}
                    />
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">Waiting to come up · {everyoneHands.length}</div>
                {everyoneHands.length === 0 && <div className="rounded-md bg-black/20 p-2 text-center text-xs italic text-white/40">No one waiting.</div>}
                {everyoneHands.map((h) => (
                  <div key={h.user_id} className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5 text-xs">
                    {h.avatar ? <img src={h.avatar} alt="" className="h-6 w-6 rounded-full object-cover" /> : <div className="h-6 w-6 rounded-full bg-amber-900/40" />}
                    <span className="truncate font-bold">{h.name}</span>
                  </div>
                ))}
              </div>
              {/* In the session, never raised a hand. Invisible until 2026-09-18:
                  a member was chatting in a live whose sheet read 0 and 0. */}
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-400">Watching · {watching.length}</div>
                {watching.length === 0 && <div className="rounded-md bg-black/20 p-2 text-center text-xs italic text-white/40">No one else in the session.</div>}
                {watching.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5 text-xs">
                    {p.avatar ? <img src={p.avatar} alt="" className="h-6 w-6 rounded-full object-cover" /> : <div className="h-6 w-6 rounded-full bg-sky-900/40" />}
                    <span className="truncate font-bold">{p.user_id === user?.id ? 'You' : p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
