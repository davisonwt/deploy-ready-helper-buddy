import { Shield } from 'lucide-react';

export function SafetyBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
      <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <div className="font-semibold">All chats, voice & video stay safely inside Sow2Grow 😊</div>
        <div className="text-xs text-muted-foreground">No personal numbers or emails needed. You're always in control of the pace.</div>
      </div>
    </div>
  );
}
