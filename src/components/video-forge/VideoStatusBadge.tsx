import { useState } from "react";
import { Loader2, Play, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVideoJob } from "@/hooks/useVideoJob";
import { VideoPlayerModal } from "./VideoPlayerModal";

interface Props {
  sourceTable: "seeds" | "orchards";
  sourceId: string;
  title?: string;
}

export function VideoStatusBadge({ sourceTable, sourceId, title }: Props) {
  const { job, loading, retry } = useVideoJob(sourceTable, sourceId);
  const [open, setOpen] = useState(false);

  if (loading || !job) return null;

  if (job.status === "generating" || job.status === "pending") {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        Generating video...
      </Badge>
    );
  }

  if (job.status === "complete" && job.video_url) {
    return (
      <>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5 h-7"
          onClick={() => setOpen(true)}
        >
          <Play className="h-3 w-3 fill-current" />
          Video ready
        </Button>
        <VideoPlayerModal
          open={open}
          onOpenChange={setOpen}
          videoUrl={job.video_url}
          title={title}
        />
      </>
    );
  }

  if (job.status === "failed") {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="gap-1.5">
          <AlertCircle className="h-3 w-3" />
          Video failed
        </Badge>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => retry()}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return null;
}
