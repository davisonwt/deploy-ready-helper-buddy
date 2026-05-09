/**
 * LiveNowStrip — pinned strip of currently-live seeds.
 * Mounted on the Dashboard and on the Tribal Feeds page so every tribe
 * member is notified the moment someone goes live and can join in one tap.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Users, ArrowRight } from 'lucide-react';
import { useTribalLiveOrchard, type LivePresence } from '@/hooks/useTribalLiveOrchard';
import LiveStageOverlay from '@/components/live/LiveStageOverlay';
import { useAuth } from '@/hooks/useAuth';

function LiveNowStrip({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { liveSeeds, endLive } = useTribalLiveOrchard();
  const [joining, setJoining] = useState<LivePresence | null>(null);

  if (!liveSeeds || liveSeeds.length === 0) return null;

  return (
    <>
      <section
        className={`relative w-full overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-black/40 to-emerald-950/30 p-3 ${className}`}
      >
        <div className="mb-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-extrabold uppercase tracking-wider text-rose-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
            </span>
            Live now in the orchard
          </div>
          <span className="rounded-full border border-rose-400/40 bg-rose-500/10 px-2 py-0.5 font-bold text-rose-200">
            {liveSeeds.length}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {liveSeeds.map((p) => (
            <article
              key={`${p.user_id}-${p.seed_id}`}
              className="relative flex w-[260px] flex-shrink-0 overflow-hidden rounded-xl border border-rose-500/30 bg-black/55 backdrop-blur"
            >
              <div className="relative h-[88px] w-[88px] flex-shrink-0 bg-emerald-900/40">
                {p.seed_image ? (
                  <img src={p.seed_image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">🌱</div>
                )}
                <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
                  <Radio className="h-2.5 w-2.5" /> Live
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-between p-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-extrabold text-white">{p.seed_title}</div>
                  <div className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-emerald-200/80">
                    <Users className="h-2.5 w-2.5" /> {p.display_name || 'Tribe member'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setJoining(p)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-500 px-2 py-1.5 text-[11px] font-extrabold text-black hover:bg-emerald-400"
                  >
                    Join the live <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => navigate(`/live/${p.seed_id}/room`)}
                    className="rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-[10px] font-bold text-white/80 hover:bg-white/10"
                    title="See everyone in this live"
                  >
                    See all
                  </button>
                  {user?.id === p.user_id && (
                    <button
                      onClick={async () => { await endLive({ seedId: p.seed_id, seedTitle: p.seed_title }); }}
                      className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-[10px] font-bold text-rose-200 hover:bg-rose-500/20"
                      title="End your live"
                    >
                      End
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {joining && (
        <LiveStageOverlay
          seedId={joining.seed_id}
          title={joining.seed_title}
          subtitle={`Hosted by ${joining.display_name}`}
          jitsiRoom={joining.jitsi_room}
          isHost={joining.user_id === user?.id}
          images={joining.seed_image ? [joining.seed_image] : []}
          openPath={`/seed/${joining.seed_id}`}
          onClose={() => setJoining(null)}
        />
      )}
    </>
  );
}
export { LiveNowStrip };

export default LiveNowStrip;
