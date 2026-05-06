import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import type { CompanionEntitlement } from "@/hooks/useCompanions";

interface Props {
  c: CompanionEntitlement;
  onOpen: () => void;
}

export default function CompanionCard({ c, onOpen }: Props) {
  const locked = c.mode === "none";
  const unlimited = c.monthly_quota == null && !locked;
  return (
    <Card className="bg-card/60 backdrop-blur border-border/60 hover:border-primary/40 transition">
      <CardContent className="p-4 flex flex-col gap-3 h-full">
        <div className="flex items-start gap-3">
          <div className="text-3xl leading-none">{c.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">{c.name}</div>
            <div className="text-xs text-muted-foreground truncate">{c.title}</div>
          </div>
          {locked ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Badge variant="secondary" className="text-[10px] uppercase">
              {c.mode.replace("_", "+")}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{c.summary}</p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-xs text-muted-foreground">
            {locked
              ? "Not in your tier"
              : unlimited
              ? "Unlimited this month"
              : `${c.remaining ?? 0} of ${c.monthly_quota} left`}
          </span>
          <Button size="sm" onClick={onOpen} disabled={locked} variant={locked ? "outline" : "default"}>
            {locked ? "Upgrade" : "Open"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
