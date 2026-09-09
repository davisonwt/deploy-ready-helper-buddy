import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, MessageCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchJobById, fetchSupplierQuotes, fetchEstimatesForJob, fetchJobInvoices, fetchJobEvents, markJobProgress,
  type JobNoteRow, type SupplierQuoteRow, type EstimateRow, type InvoiceRow, type JobEventRow,
} from '@/hooks/useJobInvoicing';
import SupplierQuoteDialog from '@/components/books/invoicing/SupplierQuoteDialog';

const jobStatusStyles: Record<string, string> = {
  planning: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  quoted: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  approved: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  in_progress: 'bg-violet-500/15 text-violet-300 border-violet-400/30',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  cancelled: 'bg-red-500/15 text-red-300 border-red-400/30',
};
const invoiceStatusStyles: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  sent: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  void: 'bg-red-500/15 text-red-300 border-red-400/30',
};
const estimateStatusStyles: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  sent: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  rejected: 'bg-red-500/15 text-red-300 border-red-400/30',
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobNoteRow | null>(null);
  const [quotes, setQuotes] = useState<SupplierQuoteRow[]>([]);
  const [estimates, setEstimates] = useState<EstimateRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [events, setEvents] = useState<JobEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<'job_50pct' | 'job_completion' | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [j, q, e, inv, ev] = await Promise.all([
        fetchJobById(id), fetchSupplierQuotes(id), fetchEstimatesForJob(id), fetchJobInvoices(id), fetchJobEvents(id),
      ]);
      setJob(j); setQuotes(q); setEstimates(e); setInvoices(inv); setEvents(ev);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const mark = async (milestone: 'job_50pct' | 'job_completion') => {
    if (!id) return;
    setMarking(milestone);
    try {
      await markJobProgress(id, milestone);
      toast.success('Progress recorded — any due invoices were sent in chat');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not update job progress');
    } finally {
      setMarking(null);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (!job) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Job not found.</div>;
  }

  const activeEstimate = estimates.find((e) => e.status === 'sent' || e.status === 'approved') ?? estimates[0] ?? null;
  const canBuildEstimate = estimates.every((e) => e.status === 'rejected');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/books/invoicing')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoicing
      </Button>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">{job.title}</CardTitle>
            {job.location && <p className="text-sm text-muted-foreground">{job.location}</p>}
          </div>
          <Badge variant="outline" className={`uppercase ${jobStatusStyles[job.status]}`}>{job.status.replace('_', ' ')}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {job.description && <p className="text-sm text-muted-foreground">{job.description}</p>}
          {job.chat_channel_id && (
            <Link to={`/chatapp?room=${job.chat_channel_id}`}>
              <Button variant="outline" size="sm"><MessageCircle className="mr-2 h-4 w-4" /> Open job chat</Button>
            </Link>
          )}

          {(job.status === 'approved' || job.status === 'in_progress') && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={marking !== null} onClick={() => mark('job_50pct')}>
                {marking === 'job_50pct' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Mark 50% complete
              </Button>
              <Button size="sm" variant="outline" disabled={marking !== null} onClick={() => mark('job_completion')}>
                {marking === 'job_completion' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Mark job complete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Supplier quotes</CardTitle>
          <SupplierQuoteDialog jobNotesId={job.id} onAdded={load} />
        </CardHeader>
        <CardContent className="space-y-2">
          {quotes.length === 0 && <p className="text-sm text-muted-foreground">No supplier quotes yet.</p>}
          {quotes.map((q) => (
            <div key={q.id} className="flex justify-between text-sm rounded-lg border border-border/50 bg-background/40 px-3 py-2">
              <span>{q.supplier_name}{q.notes ? ` · ${q.notes}` : ''}</span>
              <span>${q.amount.toFixed(2)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Estimate</CardTitle>
          {canBuildEstimate && (
            <Link to={`/books/estimates/new?jobId=${job.id}`}>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Build estimate</Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {estimates.length === 0 && <p className="text-sm text-muted-foreground">No estimate yet — build one for supplier quotes/pricing before sending it to the customer.</p>}
          {estimates.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm">
              <span>{e.number} · ${e.total.toFixed(2)}{e.rejected_reason ? ` — "${e.rejected_reason}"` : ''}</span>
              <Badge variant="outline" className={`uppercase ${estimateStatusStyles[e.status]}`}>{e.status}</Badge>
            </div>
          ))}
          {activeEstimate?.status === 'draft' && (
            <p className="text-xs text-muted-foreground">This estimate is saved but hasn't been sent yet.</p>
          )}
        </CardContent>
      </Card>

      {invoices.length > 0 && (
        <Card className="border-border/60 bg-card/50 backdrop-blur">
          <CardHeader><CardTitle className="text-base">Invoices</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                to={`/books/invoices/${inv.id}`}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm hover:bg-accent/40"
              >
                <span>{inv.number} · {inv.kind} · ${inv.total.toFixed(2)}</span>
                <Badge variant="outline" className={`uppercase ${invoiceStatusStyles[inv.status]}`}>{inv.status}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {events.length > 0 && (
        <Card className="border-border/60 bg-card/50 backdrop-blur">
          <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {events.map((ev) => (
              <div key={ev.id} className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {ev.event_type.replace('_', ' ')}
                  {ev.to_state ? ` → ${ev.to_state}` : ''}
                  {ev.notes ? ` · ${ev.notes}` : ''}
                  {' '}({ev.actor})
                </span>
                <span>{new Date(ev.created_at).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
