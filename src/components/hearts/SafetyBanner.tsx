import { Shield, Sparkles } from 'lucide-react';

/**
 * SafetyBanner — sanctuary-themed reassurance strip.
 * Walnut + gold to harmonise with the Fireside palette.
 */
export function SafetyBanner() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 shadow-md backdrop-blur-md"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--th-walnut) / 0.85), hsl(var(--th-walnut-dark) / 0.9))',
        borderColor: 'hsl(var(--th-gold) / 0.3)',
        boxShadow: 'inset 0 1px 0 hsl(var(--th-gold) / 0.12), 0 8px 28px hsl(var(--th-walnut-dark) / 0.4)',
      }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full"
           style={{ background: 'radial-gradient(circle, hsl(var(--th-ember) / 0.25), transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full"
           style={{ background: 'radial-gradient(circle, hsl(var(--th-gold) / 0.18), transparent 70%)' }} />
      <div className="relative flex items-start gap-3 text-sm">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'radial-gradient(circle at 35% 30%, hsl(var(--th-gold) / 0.35), hsl(var(--th-walnut-dark)) 75%)',
            border: '1px solid hsl(var(--th-gold) / 0.45)',
          }}
        >
          <Shield className="h-4 w-4 text-[hsl(var(--th-gold-bright))]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 font-semibold text-[hsl(var(--th-cream))]">
            All chats, voice & video stay safely inside Sow2Grow
            <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--th-gold-bright))]" />
          </div>
          <div className="mt-0.5 text-xs leading-relaxed text-[hsl(var(--th-cream)/0.7)]">
            No personal numbers or emails needed. You're always in control of the pace — text first, voice or video only when your heart says yes.
          </div>
        </div>
      </div>
    </div>
  );
}
