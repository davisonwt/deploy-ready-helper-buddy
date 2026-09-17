import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from "@/integrations/supabase/client"
import LivingButton from '../components/LivingButton'
import StallInteriorView from '@/components/stalls/StallInteriorView'
import EmptyPlotView from '@/components/stalls/EmptyPlotView'
import { useStallTemplates } from '@/hooks/useStallTemplates'
import { resolveStallHotspots } from '@/lib/stalls/stallTypes'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import OwnerMenuItems from '@/components/owner/OwnerMenuItems'
import SettlementConsentBanner from '@/components/dashboard/SettlementConsentBanner'
import type { StallHotspot, StallTier } from '@/lib/stalls/stallTypes'
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard'
import { useActiveLiveSession } from '@/hooks/useActiveLiveSession'
import { setActiveLiveSession } from '@/lib/liveSession/activeLiveSession'
import { insertProduct } from '@/api/products'
import { getDefaultCompanyId } from '@/lib/products/getDefaultCompanyId'
import { toast } from 'sonner'
import { X } from 'lucide-react'

interface StallRow {
  name: string;
  tier: StallTier;
  front_image_path: string | null;
  interior_image_path: string | null;
  hotspots: StallHotspot[] | null;
  published: boolean;
}

/**
 * Flow v2 step 13: /cockpit is now YOUR STALL, full stop -- the owner's own
 * StallInteriorView (already built out in earlier batches with its own
 * header-tap Owner Menu, StallSideNav, and StallTodayPanel -- "the stall is
 * the frame") rendered directly as the page, plus this page's own
 * Plant Seed/Go Live/Chat bottom bar. Every dashboard section that used to
 * live here (stats, tiers, week beads, the seed-card sliders, the custom
 * header) had its own confirmed v2 home before this step ran (steps 5-11)
 * and is gone, not just visually hidden. `hideClose` swaps the interior's
 * X (there's nothing to close back to here) for Log out -- the one other
 * account action that used to live in this page's removed header and had
 * nowhere else in the app to land.
 */
export default function CockpitPage() {
  const { user } = useAuth()
  const templates = useStallTemplates()
  const [stall, setStall] = useState<StallRow | null | undefined>(undefined) // undefined = loading, null = none yet
  const [plantMenuOpen, setPlantMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) { setStall(null); return }
    let alive = true
    supabase
      .from('stalls')
      .select('name, tier, front_image_path, interior_image_path, hotspots, published')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (alive) setStall((data as unknown as StallRow | null) ?? null) })
    return () => { alive = false }
  }, [user])

  // Ad-hoc "Go Live" (no seed) -- the bottom bar's own entry point, reusing
  // the existing Gathering Room engine (board/chat/raise-hand/speaker
  // permissions) rather than building a new one. Uses the SAME goLive()
  // every seed-attached live already calls, just with the host's own
  // user_id standing in for a real seed_id -- same non-product identity
  // Scripture Study already uses (StallInteriorView.tsx's
  // SCRIPTURE_STUDY_USER_ID), and gathering_sessions.seed_id has no FK to
  // any seed/product table, so this is a supported shape, not a hack.
  //
  // Silent-rejoin revision: this page no longer renders its own
  // <LiveStageOverlay> or owns "am I currently live" state directly --
  // GlobalLiveSessionOverlay (mounted once near the app root) is now the
  // one place that renders it, from the shared activeLiveSession store, so
  // the call survives navigating away from /cockpit and a backgrounded-tab
  // reload alike. This page's own job is just: start one (setActiveLiveSession),
  // and watch for OWN ad-hoc session ending while still mounted here to
  // offer the save-as-seed follow-up (a real gap if the host ends it from
  // some other page instead -- acceptable, see this page's own PR notes).
  const { goLive } = useTribalLiveOrchard()
  const activeLive = useActiveLiveSession()
  const [titleSheetOpen, setTitleSheetOpen] = useState(false)
  const [adHocTitle, setAdHocTitle] = useState('')
  const [startingLive, setStartingLive] = useState(false)
  const [endFlowOpen, setEndFlowOpen] = useState(false)
  const [endedTitle, setEndedTitle] = useState('')

  const isMyAdHocLive = !!user && !!activeLive && activeLive.isHost && activeLive.seedId === user.id
  const wasMyAdHocLiveRef = useRef(false)
  useEffect(() => {
    if (isMyAdHocLive) {
      wasMyAdHocLiveRef.current = true;
    } else if (wasMyAdHocLiveRef.current) {
      // Transitioned from "I was live" to "not live" while this page
      // stayed mounted -- GlobalLiveSessionOverlay already handled the
      // actual endLive() call (its own onClose); this page's only
      // remaining job is the save-as-seed follow-up.
      wasMyAdHocLiveRef.current = false;
      setEndedTitle(activeLive?.title ?? adHocTitle);
      setEndFlowOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyAdHocLive]);

  const startAdHocLive = async () => {
    if (!stall || !adHocTitle.trim() || !user) return
    setStartingLive(true)
    try {
      const presence = await goLive(
        { id: user.id, title: adHocTitle.trim(), image: stall.interior_image_path },
        { initialBoard: stall.interior_image_path ? { mode: 'image', imageUrl: stall.interior_image_path, imageIdx: 0 } : undefined }
      )
      if (presence) {
        setActiveLiveSession({
          seedId: user.id,
          title: adHocTitle.trim(),
          jitsiRoom: presence.jitsi_room,
          isHost: true,
          hostSessionId: presence.gatheringSessionId,
          images: stall.interior_image_path ? [stall.interior_image_path] : [],
          whispererSharePct: 0,
        })
        setTitleSheetOpen(false)
        setAdHocTitle('')
      } else {
        toast.error('Could not start your live session. Please try again.')
      }
    } finally {
      setStartingLive(false)
    }
  }

  // Bare content, no positioning of its own -- when a stall exists this
  // gets embedded INSIDE StallInteriorView (its own bottomBar/topBanner
  // props), sharing its z-[9999] stacking context so LiveStageOverlay/
  // StallHotspotSheet/StallJoinSheet's own overlays naturally cover it
  // instead of the reverse (see StallInteriorView.tsx's Props doc comment
  // -- a real, reproduced bug: an owner going live from /cockpit couldn't
  // reach LiveStage's hand-raise tray at all, hidden behind this bar,
  // when it was a page-level sibling with its own higher raw z-index).
  // The "no stall yet" branch below has no StallInteriorView to embed
  // into, so it keeps its own fixed+z-index wrapper.
  const bottomBarContent = (
    <div style={{
      display: 'flex', gap: 8, padding: '10px 12px',
      paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      background: '#080d17',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <Popover open={plantMenuOpen} onOpenChange={setPlantMenuOpen}>
        <PopoverTrigger asChild>
          <div style={{ flex: 1, cursor: 'pointer' }}>
            <LivingButton variant="enter" height={50} borderRadius={14} fontSize={12} letterSpacing="1px">
              🌱 Plant Seed
            </LivingButton>
          </div>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-56 p-2 bg-slate-900 border-slate-700">
          <OwnerMenuItems
            onNavigate={() => setPlantMenuOpen(false)}
            itemClassName="w-full text-left px-3 py-2 rounded-md text-sm text-white hover:bg-white/10 flex items-center gap-2"
          />
        </PopoverContent>
      </Popover>
      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setTitleSheetOpen(true)}>
        <LivingButton variant="live" height={50} borderRadius={14} fontSize={12} letterSpacing="1px">
          🔴 Go Live
        </LivingButton>
      </div>
      <Link to="/chatapp" style={{ flex: 1, textDecoration: 'none' }}>
        <LivingButton variant="share" height={50} borderRadius={14} fontSize={12} letterSpacing="1px">
          💬 Chat
        </LivingButton>
      </Link>
    </div>
  )

  // Flow v2 step 13: not a "dashboard section" -- a legal settlement-consent
  // nag (spec-payments.md) for a pre-existing sower with active listings who
  // hasn't accepted the payout terms yet. Self-gating (renders null for
  // everyone else); floats above the interior/CTA rather than living inside
  // either, since neither has a content column of its own to put it in.
  const consentNagContent = (
    <div style={{ padding: '10px 12px 0' }}>
      <SettlementConsentBanner />
    </div>
  )

  if (stall === undefined) {
    return <div style={{ position: 'fixed', inset: 0, background: '#060a12' }} />
  }

  if (!stall || !stall.published || !stall.interior_image_path) {
    return (
      <>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10001 }}>{consentNagContent}</div>
        <EmptyPlotView />
      </>
    )
  }

  return (
    <>
      <StallInteriorView
        ownerId={user.id}
        interiorImageUrl={stall.interior_image_path}
        stallName={stall.name}
        hotspots={resolveStallHotspots(stall.interior_image_path, stall.hotspots, templates)}
        isOwner
        hideClose
        onClose={() => {}}
        topBanner={consentNagContent}
        bottomBar={bottomBarContent}
      />

      {/* Ad-hoc Go Live, step 1: just a title -- no seed, no whisperer
          commission, no product fields at all. */}
      {titleSheetOpen && (
        <div className="fixed inset-0 z-[2147483647] flex items-end justify-center bg-black/70 sm:items-center" onClick={() => !startingLive && setTitleSheetOpen(false)}>
          <div className="w-full max-w-sm rounded-t-2xl border border-rose-500/30 bg-[#0a0f1a] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-extrabold">🔴 Go Live</h3>
              <button type="button" onClick={() => setTitleSheetOpen(false)} aria-label="Close"><X className="h-4 w-4 text-white/50" /></button>
            </div>
            <p className="mb-3 text-xs text-white/50">Broadcast live to the tribe, right now -- no seed needed.</p>
            <input
              autoFocus
              value={adHocTitle}
              onChange={(e) => setAdHocTitle(e.target.value)}
              placeholder="What's this live about?"
              maxLength={80}
              onKeyDown={(e) => { if (e.key === 'Enter' && adHocTitle.trim()) void startAdHocLive(); }}
              className="mb-3 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-rose-400/60 focus:outline-none"
            />
            <button
              type="button"
              disabled={!adHocTitle.trim() || startingLive}
              onClick={() => void startAdHocLive()}
              className="w-full rounded-lg bg-rose-500 py-2.5 text-sm font-extrabold text-black hover:bg-rose-400 disabled:opacity-40"
            >
              {startingLive ? 'Starting…' : 'Go Live'}
            </button>
          </div>
        </div>
      )}

      {/* Ad-hoc Go Live, step 2: rendered by GlobalLiveSessionOverlay now
          (mounted once near the app root), not here -- see this page's own
          top-of-file comment on the silent-rejoin revision. That also
          retires the z-index wrapper this used to need: StallInteriorView's
          z-[9999] tree can't out-rank an overlay that isn't even a sibling
          of it in the DOM anymore. */}

      {endFlowOpen && (
        <SaveLiveAsSeedDialog
          defaultTitle={endedTitle}
          coverImage={stall.interior_image_path}
          onDone={() => setEndFlowOpen(false)}
        />
      )}
    </>
  )
}

/** Offered once an ad-hoc live ends -- same option Scripture Study/recorded
 * shows already use. No actual recording exists to attach (Daily cloud
 * recording isn't enabled anywhere in this app -- see docs/GATHERING-
 * ROOM.md's own inventory), so this saves a simple commemorative seed
 * (title + note + the stall's own interior as cover), not a video/audio
 * file -- honest about what's actually being saved. Skip just ends the
 * session with nothing saved, same as today. */
function SaveLiveAsSeedDialog({ defaultTitle, coverImage, onDone }: { defaultTitle: string; coverImage: string | null; onDone: () => void }) {
  const { user } = useAuth()
  const [title, setTitle] = useState(defaultTitle)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!user || !title.trim()) return
    setSaving(true)
    try {
      const { data: sower } = await supabase.from('sowers').select('id').eq('user_id', user.id).maybeSingle()
      if (!sower?.id) { toast.error("Couldn't find your sower profile -- nothing saved."); onDone(); return }
      const companyId = await getDefaultCompanyId(sower.id)
      if (!companyId) { toast.error("Couldn't find your stall's default listing -- nothing saved."); onDone(); return }
      await insertProduct({
        sower_id: sower.id,
        company_id: companyId,
        title: title.trim(),
        description: note.trim() || null,
        price: 0,
        status: 'active',
        delivery_type: 'digital',
        kind: 'product',
        type: 'product',
        file_url: '',
        cover_image_url: coverImage,
        image_urls: coverImage ? [coverImage] : [],
      })
      toast.success('Saved to your stall.')
    } catch (e) {
      console.error('SaveLiveAsSeedDialog: save failed', e)
      toast.error('Could not save this live as a seed.')
    } finally {
      setSaving(false)
      onDone()
    }
  }

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-end justify-center bg-black/70 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl border border-emerald-500/30 bg-[#0a0f1a] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white sm:rounded-2xl">
        <h3 className="mb-1 text-sm font-extrabold">🌱 Save this live as a seed?</h3>
        <p className="mb-3 text-xs text-white/50">Keeps a free listing in your stall so the tribe can find it later.</p>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          maxLength={80}
          className="mb-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/60 focus:outline-none"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="A short note about this live (optional)"
          rows={3}
          maxLength={500}
          className="mb-3 w-full resize-none rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/60 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDone}
            disabled={saving}
            className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm font-bold text-white/70 hover:bg-white/5 disabled:opacity-40"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !title.trim()}
            className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-extrabold text-black hover:bg-emerald-400 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save to my stall'}
          </button>
        </div>
      </div>
    </div>
  )
}
