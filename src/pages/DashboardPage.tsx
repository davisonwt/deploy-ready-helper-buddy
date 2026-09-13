import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Store, Plus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from "@/integrations/supabase/client"
import LivingButton from '../components/LivingButton'
import StallInteriorView from '@/components/stalls/StallInteriorView'
import { useStallTemplates } from '@/hooks/useStallTemplates'
import { resolveStallHotspots } from '@/lib/stalls/stallTypes'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import OwnerMenuItems from '@/components/owner/OwnerMenuItems'
import SettlementConsentBanner from '@/components/dashboard/SettlementConsentBanner'
import type { StallHotspot, StallTier } from '@/lib/stalls/stallTypes'

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
      .then(({ data }) => { if (alive) setStall((data as StallRow | null) ?? null) })
    return () => { alive = false }
  }, [user])

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
      <Link to="/communications-hub" style={{ flex: 1, textDecoration: 'none' }}>
        <LivingButton variant="live" height={50} borderRadius={14} fontSize={12} letterSpacing="1px">
          🔴 Go Live
        </LivingButton>
      </Link>
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
        <div style={{
          position: 'fixed', inset: 0, background: '#060a12',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <Link to="/stall/build" style={{ textDecoration: 'none', maxWidth: 360, width: '100%' }}>
            <div style={{
              border: '2px dashed rgba(255,255,255,0.25)', borderRadius: 16,
              padding: '32px 24px', textAlign: 'center', color: '#e2e8f0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <Store size={36} />
              <div style={{ fontWeight: 800, fontSize: 18 }}>Build your stall</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>A shop-front for your seeds, sower, or whisperer work.</div>
              <Plus size={18} />
            </div>
          </Link>
        </div>
      </>
    )
  }

  return (
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
  )
}
