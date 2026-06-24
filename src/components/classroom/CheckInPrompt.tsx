import { useEffect, useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Props {
  open: boolean;
  deadline: number | null; // epoch ms when window expires
  onRespond: () => void;
}

const TOTAL_MS = 30_000;

export function CheckInPrompt({ open, deadline, onRespond }: Props) {
  const [remaining, setRemaining] = useState(TOTAL_MS);

  useEffect(() => {
    if (!open || !deadline) return;
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [open, deadline]);

  const pct = (remaining / TOTAL_MS) * 100;
  const secs = Math.ceil(remaining / 1000);

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-sm bg-[#1a1430] border-[#F0B23F]/50 text-[#E8D9B5]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-spectral text-xl">
            <Clock className="h-5 w-5 text-[#F0B23F]" /> Are you still here?
          </DialogTitle>
          <DialogDescription className="text-[#E8D9B5]/70">
            Confirm you're following along. The instructor sees a presence dot for everyone in the room.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#E8D9B5]/60">
            <span>Time to respond</span>
            <span className="tabular-nums font-bold text-[#F0B23F]">{secs}s</span>
          </div>
          <Progress value={pct} className="h-2 bg-[#14101F] [&>div]:bg-[#F0B23F]" />

          <Button
            onClick={onRespond}
            className="w-full h-12 bg-gradient-to-r from-[#8B5CF6] to-[#F0B23F] text-white font-bold"
            disabled={secs === 0}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" /> I'm here
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
