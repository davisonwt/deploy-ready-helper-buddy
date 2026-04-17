import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { useVideoCredits } from "@/hooks/useVideoJob";

interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function AutoVideoToggle({ enabled, onChange }: Props) {
  const credits = useVideoCredits();
  const noCredits = credits !== null && credits <= 0;

  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-md border bg-card">
      <div className="flex items-start gap-2 min-w-0">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="min-w-0">
          <Label htmlFor="auto-video" className="text-sm font-medium cursor-pointer">
            Auto-generate marketing video
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {noCredits
              ? "No video credits left. Add more to enable auto-generation."
              : `Uses 1 credit · ${credits ?? "—"} remaining`}
          </p>
        </div>
      </div>
      <Switch
        id="auto-video"
        checked={enabled && !noCredits}
        onCheckedChange={onChange}
        disabled={noCredits}
      />
    </div>
  );
}
