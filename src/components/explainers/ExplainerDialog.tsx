import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import ExplainerPlayer from './ExplainerPlayer';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { getExplainerConfig } from './configs';
import type { ExplainerVariant } from './types';

interface ExplainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Defaults to one_on_one for backwards compatibility with the original pilot. */
  variant?: ExplainerVariant;
}

export default function ExplainerDialog({ open, onOpenChange, variant = 'one_on_one' }: ExplainerDialogProps) {
  const config = getExplainerConfig(variant);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl border-0 p-6"
        style={{ background: config.theme.bg }}
      >
        <VisuallyHidden>
          <DialogTitle>{config.title} walkthrough</DialogTitle>
        </VisuallyHidden>
        <ExplainerPlayer config={config} />
      </DialogContent>
    </Dialog>
  );
}
