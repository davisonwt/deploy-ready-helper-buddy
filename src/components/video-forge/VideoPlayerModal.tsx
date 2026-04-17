import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  title?: string;
}

export function VideoPlayerModal({ open, onOpenChange, videoUrl, title }: Props) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${title || "s2g-video"}.mp4`;
    a.target = "_blank";
    a.click();
  };

  const handleShare = () => {
    toast({
      title: "Wandering Whisper coming soon",
      description: "Social sharing will be powered by our Wandering Whisper agent.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title || "Product video"}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video bg-black rounded-md overflow-hidden">
          <video src={videoUrl} controls autoPlay className="w-full h-full" />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" /> Download
          </Button>
          <Button onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" /> Share to Social
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
