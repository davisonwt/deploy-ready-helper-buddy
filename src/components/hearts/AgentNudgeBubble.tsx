import { Bot } from 'lucide-react';

interface Props {
  agent: 'gentoo' | 'debian';
  message: string;
}

/**
 * AgentNudgeBubble — used across the app. Inside the .tribal-hearts-sanctuary
 * scope it auto-skins to warm walnut + golden glow (see tribal-hearts.css).
 */
export function AgentNudgeBubble({ agent, message }: Props) {
  const label = agent === 'gentoo' ? '🐧 Gentoo' : '💬 Debian';
  return (
    <div className="th-agent-bubble flex items-start gap-3 rounded-2xl border border-border/40 bg-card/80 p-3 backdrop-blur-sm">
      <div className="th-agent-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Bot className="th-agent-bot h-4 w-4 text-primary" />
      </div>
      <div className="text-sm leading-snug">
        <div className="th-agent-label text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="th-agent-msg text-foreground">{message}</div>
      </div>
    </div>
  );
}
