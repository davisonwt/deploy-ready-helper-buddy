/**
 * LiveNowPage — "Live Now" directory (urgent, 2026-09-15): every currently
 * active live session, so tribe members can find and join one another
 * without needing a shared link. Pulled from the same realtime presence
 * useTribalLiveOrchard already maintains (LiveNowStrip's data source) --
 * auto-refreshes as sessions start/end with no polling, since presence
 * sync already pushes updates the instant someone goes live or ends theirs.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Radio, Unlock, Users } from 'lucide-react';
import { useTribalLiveOrchard, type LivePresence } from '@/hooks/useTribalLiveOrchard';
import { useAuth } from '@/hooks/useAuth';
import { setActiveLiveSession } from '@/lib/liveSession/activeLiveSession';

export default function LiveNowPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { liveSeeds } = useTribalLiveOrchard();

  // Silent-rejoin revision: joining hands off to the shared
  // activeLiveSession store -- GlobalLiveSessionOverlay (mounted once near
  // the app root) is what actually renders <LiveStageOverlay> now, so the
  // call survives navigating away from /live-now and a backgrounded-tab
  // reload alike. See that component's own doc comment.
  const joinLive = (p: LivePresence) => {
    setActiveLiveSession({
      seedId: p.seed_id,
      title: p.seed_title,
      subtitle: `Hosted by ${p.display_name}`,
      jitsiRoom: p.jitsi_room,
      isHost: p.user_id === user?.id,
      hostSessionId: p.gatheringSessionId,
      images: p.seed_image ? [p.seed_image] : [],
      openPath: `/live/${p.seed_id}/room`,
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#0a0f1a]/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="flex items-center gap-2 text-base font-extrabold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
            🔴 Live Now
          </h1>
          <p className="text-xs text-white/50">Every active live session in the tribe right now</p>
        </div>
        <span className="ml-auto rounded-full border border-rose-400/40 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-200">
          {liveSeeds.length} live
        </span>
      </div>

      <div className="mx-auto max-w-2xl p-4">
        {liveSeeds.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-2 text-center text-white/40">
            <Radio className="h-8 w-8" />
            <div className="text-sm font-bold">No one is live right now.</div>
            <div className="text-xs">This list updates the instant someone goes live.</div>
          </div>
        )}

        <div className="space-y-2">
          {liveSeeds.map((p) => {
            const isOpen = p.access !== 'restricted';
            const isOwn = p.user_id === user?.id;
            const canJoin = isOpen || isOwn;
            return (
              <div
                key={`${p.user_id}-${p.seed_id}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-emerald-900/40">
                  {p.seed_image ? (
                    <img src={p.seed_image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">🌱</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-extrabold text-white">{p.display_name || 'Tribe member'}</span>
                    <span className="text-white/60">is live</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
                      <Radio className="h-2.5 w-2.5" /> Live
                    </span>
                    <span className="text-white/40">·</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${isOpen ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {isOpen ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {isOpen ? 'Open session' : 'Restricted session'}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-white/50">{p.seed_title}</div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-white/40">
                    <Users className="h-3 w-3" /> {(p.participant_count ?? 0) + 1} in the room
                  </div>
                </div>

                {canJoin ? (
                  <button
                    onClick={() => joinLive(p)}
                    className="flex-shrink-0 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-black hover:bg-emerald-400"
                  >
                    Join
                  </button>
                ) : (
                  <span
                    className="flex-shrink-0 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/40"
                    title="This host has kept this session invite-only"
                  >
                    Invite only
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
