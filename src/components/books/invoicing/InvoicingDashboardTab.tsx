import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { InvoiceRow } from '@/hooks/useInvoicing';

interface Props {
  invoices: InvoiceRow[];
}

const statusStyles: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  sent: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  void: 'bg-red-500/15 text-red-300 border-red-400/30',
};

export default function InvoicingDashboardTab({ invoices }: Props) {
  const counts = useMemo(() => {
    const now = new Date();
    const outstanding = invoices.filter((i) => i.status === 'sent');
    const overdue = outstanding.filter((i) => i.due_at && new Date(i.due_at) < now);
    const paidThisMonth = invoices.filter(
      (i) => i.status === 'paid' && i.paid_at && new Date(i.paid_at).getMonth() === now.getMonth() && new Date(i.paid_at).getFullYear() === now.getFullYear()
    );
    return {
      outstandingCount: outstanding.length,
      outstandingTotal: outstanding.reduce((s, i) => s + i.amount_due, 0),
      overdueCount: overdue.length,
      paidThisMonthTotal: paidThisMonth.reduce((s, i) => s + i.total, 0),
    };
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid flex-1 grid-cols-3 gap-3">
          <Stat label="Outstanding" value={`$${counts.outstandingTotal.toFixed(2)}`} sub={`${counts.outstandingCount} invoice(s)`} />
          <Stat label="Overdue" value={String(counts.overdueCount)} sub="past due date" tone={counts.overdueCount > 0 ? 'text-orange-400' : undefined} />
          <Stat label="Paid this month" value={`$${counts.paidThisMonthTotal.toFixed(2)}`} sub="" tone="text-emerald-400" />
        </div>
      </div>

      <div className="flex justify-end">
        <Link to="/books/invoices/new">
          <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New invoice</Button>
        </Link>
      </div>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="text-base">Invoices</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              to={`/books/invoices/${inv.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2 hover:bg-accent/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{inv.number} · {inv.customer_name ?? 'Customer'}</p>
                <p className="text-xs text-muted-foreground">
                  ${inv.total.toFixed(2)}
                  {inv.due_at ? ` · due ${new Date(inv.due_at).toLocaleDateString()}` : ''}
                </p>
              </div>
              <Badge variant="outline" className={`uppercase ${statusStyles[inv.status]}`}>{inv.status}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold ${tone ?? ''}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
