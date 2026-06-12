import { Link } from 'react-router-dom';
import { TIERS } from '@/lib/tiers';

/**
 * Dashboard entry-point card linking out to each of the 5 tier SeedFlow pages
 * (Homestead → Grove → Orchard → Estate → Harvest Works).
 * Each tile shows an illustrative image and reveals an explainer popover on hover/focus.
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
            className="group relative rounded-xl border border-border bg-background/40 hover:border-primary/60 transition-colors overflow-hidden text-left"
            style={{ boxShadow: `inset 0 0 0 1px ${t.accent}22` }}
            aria-label={`${t.label} — ${t.tagline}`}
          >
            {/* Illustration */}
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <img
                src={t.image}
                alt={`${t.label} illustration`}
                width={512}
                height={384}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75) 100%)`,
                }}
              />
              <div className="absolute top-1.5 left-1.5 text-xl drop-shadow">{t.emoji}</div>
            </div>

            {/* Label */}
            <div className="p-2.5">
              <div className="text-sm font-semibold" style={{ color: t.accent }}>
                {t.label}
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                {t.tagline}
              </div>
            </div>

            {/* Hover/focus popover */}
            <div
              role="tooltip"
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 max-w-[80vw] z-30
                         opacity-0 translate-y-1
                         group-hover:opacity-100 group-hover:translate-y-0
                         group-focus-visible:opacity-100 group-focus-visible:translate-y-0
                         transition-all duration-200"
            >
              <div
                className="rounded-lg border border-border bg-popover text-popover-foreground shadow-xl p-3"
                style={{ borderColor: `${t.accent}66` }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base leading-none">{t.emoji}</span>
                  <span className="text-xs font-semibold" style={{ color: t.accent }}>
                    {t.label}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{t.explainer}</p>
              </div>
              {/* Arrow */}
              <div
                className="mx-auto -mt-1 h-2 w-2 rotate-45 bg-popover border-r border-b"
                style={{ borderColor: `${t.accent}66` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
