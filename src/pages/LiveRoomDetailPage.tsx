/**
 * LiveRoomDetailPage — second page for a single live.
 * Shows the front stage (host + spotlighted speaker), the live pocket
 * (approved guests), the queueing line (raised hands + ask-big requests),
 * everyone who has joined, the seed's media, and inline chat.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, Video, VideoOff, Crown, Hand, X, Send, Star, Users } from 'lucide-react';
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard';
import { useLiveStage } from '@/hooks/useLiveStage';
import { useAuth } from '@/hooks/useAuth';
import LiveStageOverlay from '@/components/live/LiveStageOverlay';
import { supabase } from '@/integrations/supabase/client';
import { fetchProductMedia } from '@/api/products';

export default function LiveRoomDetailPage() {
  const { seedId } = useParams<{ seedId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { liveSeeds } = useTribalLiveOrchard();

  const presence = useMemo(
    () => (seedId ? liveSeeds.find((p) => p.seed_id === seedId) : null),
    [liveSeeds, seedId]
  );
  const isHost = !!user && !!presence && presence.user_id === user.id;

  const {
    approved, hands, spotlightRequests, stage,
    setSpotlight, removeGuest, toggleMute, approveHand, denyHand,
    requestSpotlight, raiseHand, cancelHand,
    myHandRaised, iAmApproved, mySpotlightRequested,
  } = useLiveStage(seedId || null, { isHost, enabled: !!seedId });

  const [chatMsgs, setChatMsgs] = useState<Array<{ id: string; from: string; text: string; at: number }>>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [showStage, setShowStage] = useState(false);
  const [seedMedia, setSeedMedia] = useState<{ images: string[]; video?: string | null }>({ images: [] });

  // Live chat
  useEffect(() => {
    if (!seedId) return;
    const ch = supabase.channel(`liveroom:${seedId}`);
    ch.on('broadcast', { event: 'chat' }, ({ payload }) => {
      setChatMsgs((m) => [...m.slice(-99), payload as any]);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [seedId]);

  // Pull seed images
  useEffect(() => {
    if (!seedId) return;
    (async () => {
      const { data: seed } = await supabase
        .from('seeds').select('images, video_url').eq('id', seedId).maybeSingle();
      if (seed) {
        setSeedMedia({ images: Array.isArray(seed.images) ? seed.images.filter(Boolean) : [], video: seed.video_url });
        return;
      }
      const { data: prod } = await fetchProductMedia(seedId);
      if (prod) {
        const imgs = (prod.image_urls && prod.image_urls.length ? prod.image_urls : (prod.cover_image_url ? [prod.cover_image_url] : []))
          .filter(Boolean);
        setSeedMedia({ images: imgs });
      }
    })();
  }, [seedId]);

  const sendChat = () => {
    const text = chatDraft.trim();
    if (!text || !seedId) return;
    const msg = {
      id: Math.random().toString(36).slice(2),
      from: (user as any)?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Guest',
      text, at: Date.now(),
    };
    supabase.channel(`liveroom:${seedId}`).send({ type: 'broadcast', event: 'chat', payload: msg });
    setChatMsgs((m) => [...m.slice(-99), msg]);
    setChatDraft('');
  };

  if (!seedId) return null;

  if (!presence) {
    return (
      <div className="min-h-screen bg-[#060a12] p-6 text-white">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-emerald-300 hover:text-emerald-200">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="text-2xl font-extrabold">This live has ended</div>
          <p className="mt-2 text-sm text-white/60">No one is currently broadcasting on this seed.</p>
        </div>
      </div>
    );
  }

  const spotlightedGuest = approved.find((g) => g.user_id === stage.spotlightUserId);
  const onStageNames = [presence.display_name, spotlightedGuest?.name].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-[#060a12] text-white">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-emerald-300 hover:text-emerald-200">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="min-w-0 text-center">
          <div className="truncate text-sm font-extrabold">{presence.seed_title}</div>
          <div className="text-[11px] text-white/60">Hosted by {presence.display_name}</div>
        </div>
        <button
          onClick={() => setShowStage(true)}
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-black hover:bg-emerald-400"
        >
          {isHost ? 'Open stage' : 'Join the live'}
        </button>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 p-4 md:grid-cols-[1fr_320px]">
        {/* LEFT: Front stage + seed media */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/30 to-emerald-950/20 p-4">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-rose-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
              On stage now
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StageTile
                name={presence.display_name}
                avatar={presence.avatar_url}
                role="HOST"
                big={!stage.spotlightUserId}
              />
              {spotlightedGuest && (
                <StageTile name={spotlightedGuest.name} avatar={spotlightedGuest.avatar} role="ON BIG SCREEN" big />
              )}
            </div>
            <div className="mt-3 text-[11px] text-white/60">
              Speaking: {onStageNames.join(' · ')}
            </div>
          </div>

          {seedMedia.images.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">🌱 Seed media</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {seedMedia.images.map((src, i) => (
                  <img key={i} src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
                ))}
              </div>
              {seedMedia.video && (
                <video src={seedMedia.video} controls className="mt-2 w-full rounded-lg bg-black" />
              )}
            </div>
          )}
        </section>

        {/* RIGHT: Pocket / Queue / Joined / Chat */}
        <aside className="space-y-3">
          <Panel title={`Live pocket · ${approved.length}`} icon={<Mic className="h-3.5 w-3.5" />}>
            {approved.length === 0 && <Empty>Empty seats — no one in the pocket yet.</Empty>}
            {approved.map((g) => (
              <Row
                key={g.user_id}
                avatar={g.avatar}
                name={g.name}
                badge={g.mode === 'video' ? 'Camera' : 'Faceless'}
                badgeColor={g.mode === 'video' ? 'cyan' : 'emerald'}
                accent={stage.spotlightUserId === g.user_id ? 'gold' : undefined}
                actions={
                  isHost ? (
                    <>
                      <IconBtn title={stage.spotlightUserId === g.user_id ? 'Drop big screen' : 'Send to big screen'}
                        onClick={() => setSpotlight(stage.spotlightUserId === g.user_id ? null : g.user_id)}
                      ><Star className={`h-3 w-3 ${stage.spotlightUserId === g.user_id ? 'fill-amber-300 text-amber-300' : ''}`} /></IconBtn>
                      <IconBtn title={g.muted ? 'Unmute' : 'Mute'} onClick={() => toggleMute(g.user_id, !g.muted)}>
                        {g.muted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                      </IconBtn>
                      <IconBtn title="Remove from pocket" onClick={() => removeGuest(g.user_id)} danger>
                        <X className="h-3 w-3" />
                      </IconBtn>
                    </>
                  ) : g.user_id === user?.id ? (
                    !mySpotlightRequested ? (
                      <button onClick={requestSpotlight} className="rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-500/20">Ask big</button>
                    ) : (
                      <span className="text-[10px] italic text-amber-200/80">asked…</span>
                    )
                  ) : null
                }
              />
            ))}
          </Panel>

          <Panel title={`Queue · ${hands.length + spotlightRequests.length}`} icon={<Hand className="h-3.5 w-3.5" />}>
            {hands.length === 0 && spotlightRequests.length === 0 && <Empty>No one waiting to come up.</Empty>}
            {hands.map((h) => (
              <Row
                key={`h-${h.user_id}`}
                avatar={h.avatar}
                name={h.name}
                badge={h.want === 'video' ? 'Camera' : 'Faceless'}
                badgeColor={h.want === 'video' ? 'cyan' : 'emerald'}
                actions={
                  isHost ? (
                    <>
                      <button onClick={() => approveHand(h)} className="rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-extrabold text-black hover:bg-emerald-400">Bring up</button>
                      <IconBtn title="Decline" onClick={() => denyHand(h.user_id)} danger><X className="h-3 w-3" /></IconBtn>
                    </>
                  ) : null
                }
              />
            ))}
            {spotlightRequests.map((r) => (
              <Row
                key={`s-${r.user_id}`}
                name={r.name}
                badge="Asking BIG"
                badgeColor="amber"
                actions={isHost ? (
                  <>
                    <button onClick={() => setSpotlight(r.user_id)} className="rounded-md bg-amber-500 px-2 py-1 text-[10px] font-extrabold text-black hover:bg-amber-400">Send big</button>
                  </>
                ) : null}
              />
            ))}

            {!isHost && !iAmApproved && (
              <div className="mt-2 flex items-center gap-1.5 border-t border-white/5 pt-2">
                {!myHandRaised ? (
                  <>
                    <span className="text-[11px] text-white/60">Ask to come up:</span>
                    <button onClick={() => raiseHand('voice')} className="flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold hover:bg-emerald-500/20">
                      <Mic className="h-3 w-3" /> Faceless
                    </button>
                    <button onClick={() => raiseHand('video')} className="flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold hover:bg-cyan-500/20">
                      <Video className="h-3 w-3" /> Camera
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] italic text-amber-200">Hand raised — waiting for host…</span>
                    <button onClick={cancelHand} className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-[10px] hover:bg-white/10">Cancel</button>
                  </>
                )}
              </div>
            )}
          </Panel>

          <Panel title="Joined" icon={<Users className="h-3.5 w-3.5" />}>
            <div className="text-[11px] text-white/60">
              Joiner names appear here when their browser confirms presence — your tribe is watching.
            </div>
          </Panel>

          <Panel title="Live chat" icon={<Send className="h-3.5 w-3.5" />}>
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
              {chatMsgs.length === 0 && <Empty>Be the first to say hello.</Empty>}
              {chatMsgs.map((m) => (
                <div key={m.id} className="rounded-md bg-white/5 px-2 py-1 text-xs">
                  <span className="font-bold text-emerald-300">{m.from}: </span>
                  <span className="text-white/85">{m.text}</span>
                </div>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="mt-2 flex gap-1.5">
              <input value={chatDraft} onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Say something to the live…"
                className="flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-emerald-400/60 focus:outline-none" />
              <button type="submit" className="rounded-md bg-emerald-500 px-2 text-black hover:bg-emerald-400" aria-label="Send"><Send className="h-3.5 w-3.5" /></button>
            </form>
          </Panel>
        </aside>
      </main>

      {showStage && (
        <LiveStageOverlay
          seedId={seedId}
          title={presence.seed_title}
          jitsiRoom={presence.jitsi_room}
          isHost={isHost}
          images={seedMedia.images}
          openPath={`/seed/${seedId}`}
          onClose={() => setShowStage(false)}
        />
      )}
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
        {icon}{title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md bg-black/20 p-2 text-center text-[11px] italic text-white/45">{children}</div>;
}

function StageTile({ name, avatar, role, big }: { name: string; avatar?: string | null; role: string; big?: boolean }) {
  return (
    <div className={`relative aspect-video overflow-hidden rounded-xl border ${big ? 'border-amber-400/60 shadow-[0_0_24px_-6px_rgba(251,191,36,0.6)]' : 'border-white/15'} bg-black`}>
      {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover opacity-90" /> : (
        <div className="flex h-full w-full items-center justify-center text-3xl">🎤</div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
        <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
          {role === 'HOST' ? <Crown className="h-3 w-3" /> : <Star className="h-3 w-3" />} {role}
        </div>
        <div className="truncate text-sm font-bold">{name}</div>
      </div>
    </div>
  );
}

function Row({
  avatar, name, badge, badgeColor = 'emerald', accent, actions,
}: {
  avatar?: string | null; name: string; badge?: string; badgeColor?: 'emerald' | 'cyan' | 'amber'; accent?: 'gold'; actions?: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
    cyan: 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200',
    amber: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  };
  return (
    <div className={`flex items-center gap-2 rounded-md border ${accent === 'gold' ? 'border-amber-400/50 bg-amber-500/5' : 'border-white/5 bg-black/20'} p-1.5`}>
      <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-emerald-900/40">
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs">🌱</div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold">{name}</div>
        {badge && <div className={`mt-0.5 inline-block rounded-full border px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wider ${colorMap[badgeColor]}`}>{badge}</div>}
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title?: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-6 w-6 items-center justify-center rounded ${danger ? 'border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20' : 'border border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`}
    >
      {children}
    </button>
  );
}
