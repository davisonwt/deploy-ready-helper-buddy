import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import ExplainerPlayer from './ExplainerPlayer';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ExplainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExplainerDialog({ open, onOpenChange }: ExplainerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl border-0 p-6"
        style={{ background: '#0B1420' }}
      >
        <VisuallyHidden>
          <DialogTitle>1-on-1 Live walkthrough</DialogTitle>
        </VisuallyHidden>
        <ExplainerPlayer />
      </DialogContent>
    </Dialog>
  );
}
