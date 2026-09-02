import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * targetType/targetId are freeform (content_reports has no FK -- targets
 * span many unrelated tables). Keep targetType values stable strings other
 * code can match on: 'profile' | 'wandering_hearts_profile' |
 * 'wandering_hearts_message' | 'wandering_hearts_room' | 'chat_message' |
 * 'product' | 'seed' | 'orchard' | 'music_track' | 'book' |
 * 'library_item' | 'community_video'. Every value used here must be handled by
 * TrustSafetyQueue's suspendTargetUploader (src/components/admin/
 * TrustSafetyQueue.tsx) -- that's the only place a target_type resolves to
 * an actual uploader to suspend.
 *
 * The 'minor_sexual_content' reason value is load-bearing: it's the exact
 * string content_hidden_pending_minor_report() checks for (see
 * 20260902110000_media_moderation_core.sql) -- reported content with this
 * reason hides immediately, pending gosat review, unlike every other
 * reason which stays visible until a gosat acts.
 */
const REASONS = [
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'minor_sexual_content', label: 'Sexual content involving a minor' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'other', label: 'Something else' },
] as const;

interface ReportButtonProps {
  targetType: string;
  targetId: string;
  /** Icon-only trigger by default; pass a label for a labeled button. */
  label?: string;
  variant?: 'ghost' | 'outline';
  size?: 'icon' | 'sm' | 'default';
  className?: string;
}

export default function ReportButton({ targetType, targetId, label, variant = 'ghost', size = 'icon', className }: ReportButtonProps) {
  const { user } = useAuth() as any;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user?.id) {
      toast.error('Please sign in to report content.');
      return;
    }
    if (!reason) {
      toast.error('Please choose a reason.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('content_reports').insert({
        reporter_user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim() || null,
      });
      if (error) throw error;
      toast.success('Report submitted. A gosat will review it.');
      setOpen(false);
      setReason('');
      setDetails('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not submit the report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        aria-label="Report"
        title="Report"
      >
        <Flag className="h-4 w-4" />
        {label && <span className="ml-1.5">{label}</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Report content</DialogTitle>
            <DialogDescription>
              A gosat reviews every report. Reports involving a minor hide the content immediately, pending review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Details (optional)</Label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                placeholder="Anything that will help a gosat review this"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={submit} disabled={submitting || !reason} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
