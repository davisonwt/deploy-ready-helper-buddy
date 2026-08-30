import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import sowIndexBanner from '@/assets/seeds-strip.jpg';
import musicIcon from '@/assets/sow/icons/music.svg';
import artIcon from '@/assets/sow/icons/art.svg';
import booksIcon from '@/assets/sow/icons/books.svg';
import handIcon from '@/assets/sow/icons/hand.svg';
import wheelsIcon from '@/assets/sow/icons/wheels.svg';
import pillowIcon from '@/assets/sow/icons/pillow.svg';
import goodsIcon from '@/assets/sow/icons/goods.svg';
import communityIcon from '@/assets/sow/icons/community.svg';
import productionIcon from '@/assets/sow/icons/production.svg';

type ServiceKind = 'hand' | 'wheel' | 'pillow';

interface Card {
  key: string;
  label: string;
  icon: string;
  live: boolean;
  service?: ServiceKind;
  route: string;
}

const CREATIONS: Card[] = [
  { key: 'music', label: 'Music', icon: musicIcon, live: true, route: '/sow/music' },
  { key: 'art', label: 'Art', icon: artIcon, live: true, route: '/sow/art' },
  { key: 'books', label: 'Books', icon: booksIcon, live: true, route: '/sow/book' },
];

const SERVICES: Card[] = [
  { key: 'hand', label: 'Hand', icon: handIcon, live: true, service: 'hand', route: '/sow/hand' },
  { key: 'wheel', label: 'Wheel', icon: wheelsIcon, live: true, service: 'wheel', route: '/sow/wheel' },
  { key: 'pillow', label: 'Pillow', icon: pillowIcon, live: true, service: 'pillow', route: '/sow/pillow' },
];

// Field/Hearth/Forge are business types now (companies.kind), not a
// per-seed choice — one card, one form. /sow/product itself resolves the
// seed's kind from the sower's selected business.
const PRODUCE: Card[] = [
  { key: 'product', label: 'Product', icon: goodsIcon, live: true, route: '/sow/product' },
];

const ORCHARDS: Card[] = [
  { key: 'community', label: 'Community', icon: communityIcon, live: true, route: '/create-orchard' },
  { key: 'production', label: 'Production', icon: productionIcon, live: true, route: '/create-orchard' },
];

/**
 * `/sow` — the chooser page, spec-service-seeds.md §3. Replaces the old
 * flat tile picker (still live at /sow/classic, linked from every
 * "coming soon" card here) with four groups: Creations, Services & time,
 * Produce & goods, Orchards. A service card checks whether the viewer
 * already holds that Wandering role (wandering_roles) before routing —
 * straight to the seed form if so, to the role-unlock screen first if
 * not. No Heart tile here — Wandering Hearts is the dating feature, with
 * its own Dashboard tile; it was never a seed to sow.
 */
export default function SowChooserPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unlockedRoles, setUnlockedRoles] = useState<Set<ServiceKind>>(new Set());
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!user) { setChecked(true); return; }
    (async () => {
      const { data } = await supabase.from('wandering_roles').select('role').eq('user_id', user.id);
      if (!alive) return;
      setUnlockedRoles(new Set<ServiceKind>((data ?? []).map((r: any) => r.role as ServiceKind)));
      setChecked(true);
    })();
    return () => { alive = false; };
  }, [user]);

  const chooseService = (card: Card) => {
    if (!card.service) return;
    if (unlockedRoles.has(card.service)) {
      navigate(card.route);
      return;
    }
    navigate(`/register-wandering?role=${card.service}`);
  };

  const chooseOther = (card: Card) => {
    navigate(card.route);
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Dashboard
      </Button>

      <div
        className="relative w-full h-28 md:h-40 overflow-hidden rounded-2xl mb-8 border"
        style={{ borderColor: 'rgba(132,204,22,0.45)', boxShadow: '0 0 40px rgba(132,204,22,0.2)' }}
      >
        <img src={sowIndexBanner} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(132,204,22,0.2) 60%, rgba(0,0,0,0.1))' }}
        />
        <div className="absolute inset-0 flex flex-col justify-end items-center text-center p-4 md:p-6">
          <h1 className="text-white text-2xl md:text-3xl font-black tracking-tight drop-shadow-lg">What are you sowing?</h1>
          <p className="text-white/85 text-sm md:text-base mt-1 drop-shadow">A song, a service, an orchard — pick what fits.</p>
        </div>
      </div>

      <ChooserGroup title="Creations">
        {CREATIONS.map((card) => (
          <ContentTile key={card.key} card={card} onClick={() => chooseOther(card)} />
        ))}
      </ChooserGroup>

      <ChooserGroup title="Services & time">
        {SERVICES.map((card) => (
          <ServiceTile key={card.key} card={card} disabled={!checked} onClick={() => chooseService(card)} />
        ))}
      </ChooserGroup>

      <ChooserGroup title="Produce & goods">
        {PRODUCE.map((card) => (
          <ContentTile key={card.key} card={card} onClick={() => chooseOther(card)} />
        ))}
      </ChooserGroup>

      <ChooserGroup title="Orchards">
        {ORCHARDS.map((card) => (
          <ContentTile key={card.key} card={card} onClick={() => chooseOther(card)} />
        ))}
      </ChooserGroup>
    </div>
  );
}

function ChooserGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function ContentTile({ card, onClick }: { card: Card; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 aspect-square transition-all
        ${card.live
          ? 'border-border hover:border-primary/60 hover:bg-muted/50'
          : 'border-border/50 opacity-60 hover:opacity-90'}`}
    >
      {!card.live && <Lock className="absolute top-2 right-2 w-3.5 h-3.5 text-muted-foreground" />}
      <img src={card.icon} alt="" className="w-14 h-14" />
      <span className="text-sm font-medium text-center">{card.label}</span>
      {!card.live && <span className="text-[11px] text-muted-foreground">Coming soon</span>}
    </button>
  );
}

function ServiceTile({ card, disabled, onClick }: { card: Card; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 aspect-square transition-all border-border hover:border-primary/60 hover:bg-muted/50 disabled:opacity-50"
    >
      <img src={card.icon} alt="" className="w-14 h-14" />
      <span className="text-sm font-medium text-center">{card.label}</span>
    </button>
  );
}
