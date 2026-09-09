import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { getPublicEstimate, approveEstimate, rejectEstimate, type PublicEstimate } from '@/hooks/useJobInvoicing';

export default function PublicEstimateApprovalPage() {
  const { publicToken } = useParams<{ publicToken: string }>();
  const { user } = useAuth();
  const [estimate, setEstimate] = useState<PublicEstimate | null | undefined>(undefined);
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!publicToken) return;
    try {
      const data = await getPublicEstimate(publicToken);
      setEstimate(data);
    } catch {
      setEstimate(null);
    }
  }, [publicToken]);

  useEffect(() => { load(); }, [load]);

  const approve = async () => {
    if (!publicToken || !estimate) return;
    setActing('approve');
    try {
      await approveEstimate(estimate.id);
      toast.success('Estimate approved — your first invoice is on its way in chat');
      load();
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setActing(null);
    }
  };

  const reject = async () => {
    if (!estimate) return;
    setActing('reject');
    try {
      await rejectEstimate(estimate.id, reason.trim() || 'No reason given');
      toast.success('Sent — the request for changes was posted in chat');
      setRejecting(false);
      load();
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setActing(null);
    }
  };

  if (estimate === undefined) {
    return <Centered><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></Centered>;
  }
  if (estimate === null) {
    return <Centered><p className="text-muted-foreground">This estimate link isn't valid.</p></Centered>;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-6">
      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Estimate {estimate.number}{estimate.job_title ? ` — ${estimate.job_title}` : ''}</CardTitle>
          <p className="text-sm text-muted-foreground">{estimate.customer_name ?? 'Customer'}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {estimate.line_items.map((l, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{l.description}{l.quantity !== 1 ? ` × ${l.quantity}` : ''}</span>
                <span>${l.line_total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border/50 bg-background/40 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${estimate.subtotal.toFixed(2)}</span></div>
            {estimate.tax_total > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${estimate.tax_total.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between text-base font-bold pt-1 border-t border-border/40"><span>Total</span><span>${estimate.total.toFixed(2)}</span></div>
          </div>

          {estimate.payment_schedule.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment schedule</p>
              {estimate.payment_schedule.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{p.label}</span>
                  <span>${p.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {estimate.status === 'approved' && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm">Approved. Check the job chat for your invoice.</p>
            </div>
          )}
          {estimate.status === 'rejected' && (
            <p className="text-sm text-muted-foreground">You requested changes to this estimate. The business will follow up in chat.</p>
          )}
          {estimate.status === 'draft' && <p className="text-sm text-muted-foreground">This estimate hasn't been sent yet.</p>}

          {estimate.status === 'sent' && !user && (
            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <p>Log in with the account from your invite to approve or request changes.</p>
              <Link to="/login"><Button variant="outline" size="sm">Log in</Button></Link>
            </div>
          )}

          {estimate.status === 'sent' && user && !rejecting && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 text-red-400" onClick={() => setRejecting(true)} disabled={acting !== null}>
                <XCircle className="mr-2 h-4 w-4" /> Request changes
              </Button>
              <Button className="flex-1" onClick={approve} disabled={acting !== null}>
                {acting === 'approve' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Approve
              </Button>
            </div>
          )}

          {estimate.status === 'sent' && user && rejecting && (
            <div className="space-y-2">
              <Textarea placeholder="What would you like changed?" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setRejecting(false)}>Cancel</Button>
                <Button variant="outline" className="flex-1 text-red-400" onClick={reject} disabled={acting !== null}>
                  {acting === 'reject' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send request
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="text-center">
        <Link to="/" className="text-xs text-muted-foreground underline">sow2growapp.com</Link>
      </div>
    </div>
  );
}

function friendlyError(e: any): string {
  const msg = e?.message || '';
  if (msg.includes('forbidden')) return "This estimate belongs to a different account — use the invite link sent to you in chat.";
  return msg || 'Something went wrong. Please try again.';
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[50vh] items-center justify-center px-4">{children}</div>;
}
