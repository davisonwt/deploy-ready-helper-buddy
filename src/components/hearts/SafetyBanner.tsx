import { Shield, Sparkles } from 'lucide-react';

export function SafetyBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 p-4 shadow-md backdrop-blur-md"
         style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(330 70% 65% / 0.10))' }}>
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/15 blur-2xl" />
      <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-start gap-3 text-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            All chats, voice & video stay safely inside Sow2Grow
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            No personal numbers or emails needed. You're always in control of the pace — text first, voice or video only when your heart says yes.
          </div>
        </div>
      </div>
    </div>
  );
}
