import { Film, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVideoCredits } from "@/hooks/useVideoJob";
import { toast } from "@/hooks/use-toast";

export function VideoCreditsDisplay({ compact = false }: { compact?: boolean }) {
  const credits = useVideoCredits();

  if (credits === null) return null;

  const handleBuy = () => {
    toast({
      title: "Coming soon",
      description: "Video credit top-ups will be available shortly.",
    });
  };

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Film className="h-3.5 w-3.5" />
        {credits} video credit{credits === 1 ? "" : "s"}
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-md border bg-card">
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-primary" />
        <div>
          <div className="text-sm font-medium">{credits} video credits</div>
          <div className="text-xs text-muted-foreground">Auto-generate product videos</div>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={handleBuy} className="gap-1">
        <Plus className="h-3 w-3" /> Get more
      </Button>
    </div>
  );
}
