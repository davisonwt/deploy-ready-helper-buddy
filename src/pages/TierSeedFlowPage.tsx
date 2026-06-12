import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Factory } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SeedFlow from '@/components/SeedFlow';
import { type Tier, TIER_BY_ID } from '@/lib/tiers';

interface Props {
  tier: Tier;
}

interface CompanyRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_factory: boolean;
  is_verified: boolean;
  tier: Tier;
}

interface SeedRow {
  id: string;
  title: string;
  cover_image_url: string | null;
  image_urls: string[] | null;
  price: number | null;
  company_id: string | null;
  sower_id: string | null;
  type: string | null;
  category: string | null;
}

interface SowerGroup {
  id: string;
  name: string;
  avatar_url: string | null;
  slug: string | null;
}

export default function TierSeedFlowPage({ tier }: Props) {
  const navigate = useNavigate();
  const cfg = TIER_BY_ID[tier];
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [seeds, setSeeds] = useState<SeedRow[]>([]);
  const [sowers, setSowers] = useState<SowerGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${cfg.label} — SeedFlow · Sow2Grow`;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: companyRows } = await supabase
        .from('companies')
        .select('id, slug, name, tagline, logo_url, banner_url, is_factory, is_verified, tier')
        .eq('tier', tier)
        .order('is_verified', { ascending: false })
        .order('name', { ascending: true });

      const list = (companyRows as CompanyRow[]) || [];
      if (!alive) return;
      setCompanies(list);

      const ids = list.map((c) => c.id);
      const companyProducts = ids.length > 0
        ? (await supabase
            .from('products')
            .select('id, title, cover_image_url, image_urls, price, company_id, sower_id, type, category')
            .in('company_id', ids)
            .limit(60)).data as SeedRow[] | null
        : [];

      let individualSeeds: SeedRow[] = [];
      let sowerGroups: SowerGroup[] = [];

      // Homestead = individual sowers (no company yet). Show every solo-sown seed here.
      if (tier === 'homestead') {
        const { data: soloRows } = await supabase
          .from('products')
          .select('id, title, cover_image_url, image_urls, price, company_id, sower_id, type, category')
          .is('company_id', null)
          .not('sower_id', 'is', null)
          .limit(500);
        individualSeeds = (soloRows as SeedRow[]) || [];

        const sowerIds = Array.from(
          new Set(individualSeeds.map((s) => s.sower_id).filter(Boolean) as string[])
        );
        if (sowerIds.length > 0) {
          // products.sower_id -> sowers.id (NOT profiles)
          const { data: sowerRows } = await supabase
            .from('sowers')
            .select('id, display_name, slug, logo_url')
            .in('id', sowerIds);
          const found = new Map<string, SowerGroup>();
          (sowerRows || []).forEach((s: any) => {
            found.set(s.id, {
              id: s.id,
              name: s.display_name || 'Sower',
              avatar_url: s.logo_url || null,
              slug: s.slug || null,
            });
          });
          sowerGroups = sowerIds.map(
            (sid) =>
              found.get(sid) || { id: sid, name: 'Sower', avatar_url: null, slug: null }
          );
        }
      }

      if (alive) {
        setSeeds([...(companyProducts || []), ...individualSeeds]);
        setSowers(sowerGroups);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tier, cfg.label]);

  const seedsByCompany = useMemo(() => {
    const map = new Map<string, SeedRow[]>();
    for (const s of seeds) {
      if (!s.company_id) continue;
      const arr = map.get(s.company_id) || [];
      arr.push(s);
      map.set(s.company_id, arr);
    }
    return map;
  }, [seeds]);

  const seedsBySower = useMemo(() => {
    const map = new Map<string, SeedRow[]>();
    for (const s of seeds) {
      if (s.company_id || !s.sower_id) continue;
      const arr = map.get(s.sower_id) || [];
      arr.push(s);
      map.set(s.sower_id, arr);
    }
    return map;
  }, [seeds]);

  const hasAny = companies.length > 0 || sowers.length > 0;

  return (
    <main className="min-h-screen bg-background text-foreground relative">
      {/* Themed ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px] opacity-40"
        style={{ background: cfg.gradient }}
      />

      <div className="relative z-10">
        {/* Go Back pill — matches My Garden */}
        <div className="sticky top-3 z-50 px-4 pt-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-background/90 px-4 py-3 text-sm font-extrabold text-foreground shadow-2xl backdrop-blur-md hover:bg-card"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        {/* Centered hero — matches My Garden */}
        <div className="relative overflow-hidden border-b border-white/10 backdrop-blur-md bg-[#0f172a]/60">
          <div className="relative container mx-auto px-4 py-12">
            <div className="text-center max-w-4xl mx-auto">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div
                  className="p-4 rounded-2xl backdrop-blur-md border text-5xl leading-none"
                  style={{
                    background: `${cfg.accent}1a`,
                    borderColor: `${cfg.accent}4d`,
                  }}
                >
                  {cfg.emoji}
                </div>
                <h1
                  className="text-4xl sm:text-5xl font-bold text-white"
                  style={{ textShadow: `0 2px 8px ${cfg.accent}40` }}
                >
                  {cfg.label}
                </h1>
              </div>
              <p className="text-slate-200/90 text-base sm:text-lg mb-2 max-w-2xl mx-auto">
                {cfg.description}
              </p>
              <p className="text-slate-400 text-sm">{cfg.tagline}</p>
            </div>
          </div>

          {/* Themed SeedFlow strip */}
          <SeedFlow height={42} seedCount={32} zIndex={1} />
        </div>
      </div>


      <section className="container max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading {cfg.label} sowers…</div>
        ) : !hasAny ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <div className="text-3xl mb-2">{cfg.emoji}</div>
            <h2 className="font-semibold mb-1">No {cfg.label} sowers yet</h2>
            <p className="text-sm text-muted-foreground">
              Be the first — set your company tier to <strong>{cfg.label}</strong> and your seeds
              will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {companies.map((c) => {
              const list = seedsByCompany.get(c.id) || [];
              return (
                <article
                  key={c.id}
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                  style={{ borderColor: `${cfg.accent}33` }}
                >
                  <header className="flex items-center gap-3 p-4 border-b border-border">
                    <div className="h-12 w-12 rounded-lg bg-background border border-border overflow-hidden flex items-center justify-center shrink-0">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        <Factory className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h2 className="font-semibold truncate">{c.name}</h2>
                        {c.is_verified && (
                          <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                      {c.tagline && (
                        <p className="text-xs text-muted-foreground truncate">{c.tagline}</p>
                      )}
                    </div>
                    <Link
                      to={`/factories/${c.slug}`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/60 hover:text-primary transition-colors"
                    >
                      Visit page →
                    </Link>
                  </header>

                  {list.length === 0 ? (
                    <div className="p-4 text-xs text-muted-foreground">No seeds yet.</div>
                  ) : (
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {list.slice(0, 8).map((s) => (
                        <Link
                          key={s.id}
                          to={`/seed/${s.id}`}
                          className="rounded-lg overflow-hidden border border-border bg-background hover:border-primary/60 transition-colors"
                        >
                          <div
                            className="aspect-square bg-muted"
                            style={{
                              backgroundImage: (() => {
                                const img = s.cover_image_url || (s.image_urls && s.image_urls[0]);
                                return img ? `url(${img})` : undefined;
                              })(),
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          />
                          <div className="p-2">
                            <div className="text-xs font-medium truncate">{s.title}</div>
                            {s.price != null && (
                              <div className="text-[11px] text-muted-foreground">
                                ${Number(s.price).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}

            {sowers.map((p) => {
              const list = seedsBySower.get(p.id) || [];
              if (list.length === 0) return null;
              return (
                <article
                  key={`sower-${p.id}`}
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                  style={{ borderColor: `${cfg.accent}33` }}
                >
                  <header className="flex items-center gap-3 p-4 border-b border-border">
                    <div className="h-12 w-12 rounded-full bg-background border border-border overflow-hidden flex items-center justify-center shrink-0">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg">{cfg.emoji}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold truncate">{p.name}</h2>
                      <p className="text-xs text-muted-foreground truncate">Individual sower · {list.length} seed{list.length === 1 ? '' : 's'}</p>
                    </div>
                    <Link
                      to={p.slug ? `/sower/${p.slug}` : `/sower/${p.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/60 hover:text-primary transition-colors"
                    >
                      Visit page →
                    </Link>
                  </header>

                  {(() => {
                    // Group this sower's seeds by type (music, book, video, art, etc.)
                    const groups = new Map<string, SeedRow[]>();
                    for (const s of list) {
                      const key = (s.type || s.category || 'other').toString().toLowerCase();
                      const arr = groups.get(key) || [];
                      arr.push(s);
                      groups.set(key, arr);
                    }
                    const labelFor = (k: string) => {
                      const map: Record<string, string> = {
                        music: 'Music',
                        book: 'Books',
                        books: 'Books',
                        video: 'Videos',
                        videos: 'Videos',
                        art: 'Art',
                        course: 'Courses',
                        physical: 'Physical Goods',
                        digital: 'Digital Goods',
                        service: 'Services',
                        other: 'Other Seeds',
                      };
                      return map[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                    };
                    return (
                      <div className="p-4 space-y-5">
                        {Array.from(groups.entries()).map(([key, items]) => (
                          <div key={key}>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                              {labelFor(key)} · {items.length}
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {items.map((s) => (
                                <Link
                                  key={s.id}
                                  to={`/seed/${s.id}`}
                                  className="rounded-lg overflow-hidden border border-border bg-background hover:border-primary/60 transition-colors"
                                >
                                  <div
                                    className="aspect-square bg-muted"
                                    style={{
                                      backgroundImage: (() => {
                                        const img = s.cover_image_url || (s.image_urls && s.image_urls[0]);
                                        return img ? `url(${img})` : undefined;
                                      })(),
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                    }}
                                  />
                                  <div className="p-2">
                                    <div className="text-xs font-medium truncate">{s.title}</div>
                                    {s.price != null && (
                                      <div className="text-[11px] text-muted-foreground">
                                        ${Number(s.price).toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
