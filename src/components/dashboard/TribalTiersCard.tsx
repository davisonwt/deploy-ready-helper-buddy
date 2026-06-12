import { Link } from 'react-router-dom';
import { TIERS } from '@/lib/tiers';

/**
 * Dashboard entry-point card linking out to each of the 5 tier SeedFlow pages
 * (Homestead → Grove → Orchard → Estate → Harvest Works).
 */
export default function TribalTiersCard() {
  return (
    <section
      className="mb-4 rounded-2xl border border-border bg-card p-4"
      aria-labelledby="tribal-tiers-heading"
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 id="tribal-tiers-heading" className="text-sm font-semibold tracking-wide text-foreground">
          🌍 Tribal Tiers — SeedFlows by scale
        </h2>
        <Link to="/factories" className="text-xs text-primary hover:underline">
          All companies →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {TIERS.map((t) => (
          <Link
            key={t.id}
            to={`/${t.slug}`}
            className="group rounded-xl border border-border bg-background/40 hover:border-primary/60 transition-colors p-3 text-left"
            style={{ boxShadow: `inset 0 0 0 1px ${t.accent}22` }}
            title={t.description}
          >
            <div className="text-2xl leading-none mb-1">{t.emoji}</div>
            <div className="text-sm font-semibold" style={{ color: t.accent }}>
              {t.label}
            </div>
            <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
              {t.tagline}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
