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
}

export default function TierSeedFlowPage({ tier }: Props) {
  const navigate = useNavigate();
  const cfg = TIER_BY_ID[tier];
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [seeds, setSeeds] = useState<SeedRow[]>([]);
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
      if (ids.length > 0) {
        const { data: productRows } = await supabase
          .from('products')
          .select('id, title, cover_image_url, image_urls, price, company_id')
          .in('company_id', ids)
          .limit(60);
        if (alive) setSeeds((productRows as SeedRow[]) || []);
      } else {
        setSeeds([]);
      }
      if (alive) setLoading(false);
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

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Themed hero */}
      <header
        className="border-b border-border"
        style={{ background: cfg.gradient }}
      >
        <div className="container max-w-6xl mx-auto px-4 pt-6 pb-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-xs text-white/80 hover:text-white mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-4xl">{cfg.emoji}</div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{cfg.label}</h1>
              <p className="text-sm text-white/80">{cfg.description}</p>
            </div>
          </div>

          {/* Tier switcher */}
          <nav className="mt-4 flex flex-wrap gap-2">
            {TIERS.map((t) => {
              const active = t.id === tier;
              return (
                <Link
                  key={t.id}
                  to={`/${t.slug}`}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
                  style={{
                    background: active ? t.accent : 'rgba(255,255,255,0.06)',
                    color: active ? '#0b1220' : 'rgba(255,255,255,0.85)',
                    borderColor: active ? t.accent : 'rgba(255,255,255,0.18)',
                  }}
                >
                  {t.emoji} {t.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Themed SeedFlow strip */}
        <SeedFlow height={42} seedCount={32} zIndex={1} />
      </header>

      <section className="container max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading {cfg.label} sowers…</div>
        ) : companies.length === 0 ? (
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
          </div>
        )}
      </section>
    </main>
  );
}
