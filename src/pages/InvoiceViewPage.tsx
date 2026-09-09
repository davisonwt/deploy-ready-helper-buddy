import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Ban, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import type { InvoiceRow } from '@/hooks/useInvoicing';
import { voidInvoice, fetchEstimateLines, type DraftLine } from '@/hooks/useJobInvoicing';

interface DisplayLine extends DraftLine {
  line_total: number;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  sent: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  void: 'bg-red-500/15 text-red-300 border-red-400/30',
};

interface PaymentRow {
  id: string;
  amount: number;
  rail: string;
  status: string;
  payment_reference: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function InvoiceViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<(InvoiceRow & { customers?: { name: string } }) | null>(null);
  const [lines, setLines] = useState<DisplayLine[]>([]);
  const [scheduleLabel, setScheduleLabel] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [voidReason, setVoidReason] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: inv } = await supabase.from('invoices' as any).select('*, customers(name)').eq('id', id).maybeSingle();
      const invoiceRow = inv as any;
      const [ls, sched, { data: pays }] = await Promise.all([
        invoiceRow ? fetchEstimateLines(invoiceRow.estimate_id) : Promise.resolve([]),
        invoiceRow?.linked_schedule_item_id
          ? supabase.from('payment_schedule_items' as any).select('label').eq('id', invoiceRow.linked_schedule_item_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('invoice_payments' as any).select('*').eq('invoice_id', id).order('created_at', { ascending: false }),
      ]);
      setInvoice(invoiceRow);
      setLines(ls.map((l) => ({ ...l, line_total: Math.round(l.quantity * l.unit_price * 100) / 100 })));
      setScheduleLabel((sched as any)?.data?.label ?? null);
      setPayments(((pays as any[]) ?? []) as PaymentRow[]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`invoice-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_payments', filter: `invoice_id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, load]);

  const copyLink = () => {
    if (!invoice) return;
    const url = `${window.location.origin}/pay/${invoice.public_token}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Pay link copied'),
      () => toast.error('Could not copy the link'),
    );
  };

  const doVoid = async () => {
    if (!invoice) return;
    try {
      await voidInvoice(invoice.id, voidReason.trim() || 'No reason given');
      toast.success('Invoice voided');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not void this invoice');
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (!invoice) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Invoice not found.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/books')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Books
      </Button>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">{invoice.number}{scheduleLabel ? ` · ${scheduleLabel}` : ''}</CardTitle>
            <p className="text-sm text-muted-foreground">{(invoice as any).customers?.name ?? 'Customer'}</p>
          </div>
          <Badge variant="outline" className={`uppercase ${statusStyles[invoice.status]}`}>{invoice.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{l.description} {l.quantity !== 1 && <span className="text-muted-foreground">× {l.quantity}</span>}</span>
                <span>${l.line_total.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border/50 bg-background/40 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${invoice.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${invoice.tax_total.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>${invoice.total.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>${invoice.amount_paid.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold"><span>Due</span><span>${invoice.amount_due.toFixed(2)}</span></div>
          </div>

          {payments.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Payments</p>
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between text-xs text-muted-foreground">
                  <span>{p.rail} · {p.status}{p.payment_reference ? ` · ${p.payment_reference.slice(0, 12)}…` : ''}</span>
                  <span>${p.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {invoice.status === 'sent' && (
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="mr-2 h-4 w-4" /> Copy pay link
              </Button>
            )}
            {(invoice.status === 'draft' || invoice.status === 'sent') && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-red-400">
                    <Ban className="mr-2 h-4 w-4" /> Void
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Only unpaid invoices can be voided. This keeps the invoice number reserved — it's marked void, never deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea placeholder="Reason (optional)" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} rows={2} />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={doVoid}>Void invoice</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
