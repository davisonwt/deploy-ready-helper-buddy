import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBooksBusiness } from '@/hooks/useBooksBusiness';
import {
  useJobInvoicing, computeEstimateTotals, computeScheduleAmount, createDraftEstimate, sendEstimate,
  fetchJobById, type DraftLine, type DraftScheduleItem, type JobNoteRow,
} from '@/hooks/useJobInvoicing';
import CreateJobCustomerDialog from '@/components/books/invoicing/CreateJobCustomerDialog';

interface ScheduleDraft {
  label: string;
  splitType: 'percent' | 'fixed';
  value: number; // percentage points, or a flat dollar amount
  triggerType: 'date' | 'job_status';
  dueOffsetDays: number;
  triggerJobStatus: 'job_50pct' | 'job_completion';
}

const emptyLine = (): DraftLine => ({ description: '', quantity: 1, unit: null, unit_price: 0, taxable: false, tax_rate_percent: 0 });
const defaultSchedule = (): ScheduleDraft[] => [
  { label: 'Deposit', splitType: 'percent', value: 50, triggerType: 'date', dueOffsetDays: 0, triggerJobStatus: 'job_50pct' },
  { label: 'Final balance', splitType: 'percent', value: 50, triggerType: 'job_status', dueOffsetDays: 0, triggerJobStatus: 'job_completion' },
];

export default function EstimateBuilderPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const jobId = params.get('jobId');
  const { current, loading: bizLoading } = useBooksBusiness();
  const { customers, reload } = useJobInvoicing(current?.id ?? null);

  const [job, setJob] = useState<JobNoteRow | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [schedule, setSchedule] = useState<ScheduleDraft[]>(defaultSchedule());
  const [saving, setSaving] = useState<'draft' | 'send' | null>(null);

  useEffect(() => {
    if (jobId) fetchJobById(jobId).then(setJob).catch(() => setJob(null));
  }, [jobId]);

  const totals = useMemo(() => computeEstimateTotals(lines), [lines]);

  const scheduleAmounts = useMemo(
    () => schedule.map((s) =>
      computeScheduleAmount(
        { percentageOfTotal: s.splitType === 'percent' ? s.value : null, fixedAmount: s.splitType === 'fixed' ? s.value : null },
        totals.total
      )
    ),
    [schedule, totals.total]
  );
  const schedulePercentTotal = useMemo(
    () => schedule.filter((s) => s.splitType === 'percent').reduce((sum, s) => sum + s.value, 0),
    [schedule]
  );

  const updateLine = (i: number, patch: Partial<DraftLine>) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (i: number) => setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const updateSchedule = (i: number, patch: Partial<ScheduleDraft>) => setSchedule((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSchedule = () => setSchedule((prev) => [...prev, { label: '', splitType: 'percent', value: 0, triggerType: 'job_status', dueOffsetDays: 0, triggerJobStatus: 'job_completion' }]);
  const removeSchedule = (i: number) => setSchedule((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const buildScheduleForSave = (): DraftScheduleItem[] =>
    schedule.map((s, i) => ({
      label: s.label.trim() || `Payment ${i + 1}`,
      percentageOfTotal: s.splitType === 'percent' ? s.value : null,
      fixedAmount: s.splitType === 'fixed' ? round2(s.value) : null,
      amount: scheduleAmounts[i],
      triggerType: s.triggerType,
      dueOffsetDays: s.triggerType === 'date' ? s.dueOffsetDays : null,
      triggerJobStatus: s.triggerType === 'job_status' ? s.triggerJobStatus : null,
    }));

  const save = async (thenSend: boolean) => {
    if (!current?.id || !jobId) return;
    if (!customerId) return toast.error('Choose a customer');
    const cleanLines = lines.filter((l) => l.description.trim() && l.quantity > 0);
    if (cleanLines.length === 0) return toast.error('Add at least one line');
    if (schedule.some((s) => !s.label.trim())) return toast.error('Every payment schedule item needs a label');

    setSaving(thenSend ? 'send' : 'draft');
    try {
      const { estimateId } = await createDraftEstimate(current.id, jobId, customerId, cleanLines, buildScheduleForSave());
      if (thenSend) {
        await sendEstimate(estimateId);
        toast.success('Estimate sent — the customer was notified in chat');
      } else {
        toast.success('Estimate saved as a draft');
      }
      navigate(`/books/jobs/${jobId}`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the estimate');
    } finally {
      setSaving(null);
    }
  };

  if (bizLoading) return <div className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Loading…</div>;
  if (!current) return <div className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Set up a business in your profile first.</div>;
  if (!jobId) return <div className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">No job selected. Go back to a job and choose "Build estimate".</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/books/jobs/${jobId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to job
      </Button>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="text-base">New estimate{job ? ` — ${job.title}` : ''}</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <div className="flex gap-2">
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Choose a customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <CreateJobCustomerDialog businessId={current.id} onCreated={(c) => { setCustomerId(c.id); reload(); }} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Line items</Label>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_90px_auto] items-end gap-2">
                <div className="space-y-1">
                  {i === 0 && <Label className="text-[11px] text-muted-foreground">Description</Label>}
                  <Input value={line.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="What's being done" />
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-[11px] text-muted-foreground">Qty</Label>}
                  <Input inputMode="decimal" value={line.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-[11px] text-muted-foreground">Rate</Label>}
                  <Input inputMode="decimal" value={line.unit_price} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) || 0 })} />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="mr-2 h-4 w-4" /> Add line</Button>
          </div>

          <div className="rounded-lg border border-border/50 bg-background/40 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${totals.taxTotal.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>${totals.total.toFixed(2)}</span></div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Payment schedule</Label>
              {schedulePercentTotal > 0 && schedulePercentTotal !== 100 && (
                <span className="text-xs text-orange-400">Percentages add up to {schedulePercentTotal}%, not 100%</span>
              )}
            </div>
            {schedule.map((s, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="flex items-center gap-2">
                  <Input value={s.label} onChange={(e) => updateSchedule(i, { label: e.target.value })} placeholder={i === 0 ? 'Deposit' : 'Milestone'} className="flex-1" />
                  <Select value={s.splitType} onValueChange={(v) => updateSchedule(i, { splitType: v as any })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="percent">%</SelectItem><SelectItem value="fixed">$</SelectItem></SelectContent>
                  </Select>
                  <Input inputMode="decimal" className="w-24" value={s.value} onChange={(e) => updateSchedule(i, { value: Number(e.target.value) || 0 })} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSchedule(i)} disabled={schedule.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>≈ ${scheduleAmounts[i].toFixed(2)} ·</span>
                  {i === 0 ? (
                    <span>sent immediately once the customer approves</span>
                  ) : (
                    <>
                      <span>send when</span>
                      <Select value={s.triggerType} onValueChange={(v) => updateSchedule(i, { triggerType: v as any })}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="job_status">job reaches</SelectItem>
                          <SelectItem value="date">days after approval</SelectItem>
                        </SelectContent>
                      </Select>
                      {s.triggerType === 'job_status' ? (
                        <Select value={s.triggerJobStatus} onValueChange={(v) => updateSchedule(i, { triggerJobStatus: v as any })}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="job_50pct">50% complete</SelectItem>
                            <SelectItem value="job_completion">completion</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input type="number" className="h-7 w-16 text-xs" value={s.dueOffsetDays} onChange={(e) => updateSchedule(i, { dueOffsetDays: Number(e.target.value) || 0 })} />
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addSchedule}><Plus className="mr-2 h-4 w-4" /> Add payment</Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => save(false)} disabled={saving !== null} className="flex-1">
              {saving === 'draft' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save draft
            </Button>
            <Button onClick={() => save(true)} disabled={saving !== null} className="flex-1">
              {saving === 'send' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send to customer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
