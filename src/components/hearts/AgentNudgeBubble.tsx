import { Bot } from 'lucide-react';

interface Props {
  agent: 'gentoo' | 'debian';
  message: string;
}

export function AgentNudgeBubble({ agent, message }: Props) {
  const label = agent === 'gentoo' ? '🐧 Gentoo' : '💬 Debian';
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/40 bg-card/80 p-3 backdrop-blur-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="text-sm leading-snug">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-foreground">{message}</div>
      </div>
    </div>
  );
}
