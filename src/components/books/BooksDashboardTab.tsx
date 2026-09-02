import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MoneyRiver from './MoneyRiver';
import { useBooksCurrency } from '@/lib/books/currency';
import type { BooksIncomeRow, ExpenseRow, InvoiceRow } from '@/hooks/useBooksData';

interface Props {
  invoices: InvoiceRow[];
  expenses: ExpenseRow[];
  income: BooksIncomeRow[];
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: 'primary' | 'positive' | 'negative' | 'muted';
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-400'
      : tone === 'negative'
        ? 'text-orange-400'
        : tone === 'muted'
          ? 'text-muted-foreground'
          : 'text-primary';
  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={`rounded-lg bg-background/60 p-2 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`truncate text-lg font-semibold ${toneClass}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BooksDashboardTab({ invoices, expenses, income }: Props) {
  const { fmt, currency, symbol } = useBooksCurrency();
  const stats = useMemo(() => {
    // Two separate income sources: books_income (auto-synced from real
    // platform orders) and invoices (manually created/sent, tracked in
    // their own table) -- a paid invoice is real income exactly like a
    // synced order and must count here too. This card previously only
    // summed books_income, silently excluding every paid invoice from
    // both Income and Balance (net) even though the money-river chart's
    // `inflows` below already correctly included them.
    const syncedIncome = income.reduce((s, i) => s + i.amount, 0);
    const paidInvoiceIncome = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
    const totalIncome = syncedIncome + paidInvoiceIncome;
    const outstanding = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
    const spend = expenses.reduce((s, e) => s + e.amount, 0);
    return { income: totalIncome, outstanding, spend, net: totalIncome - spend };
  }, [income, invoices, expenses]);

  const inflows = useMemo(() => {
    const map = new Map<string, number>();
    invoices
      .filter((i) => i.status === 'paid')
      .forEach((i) => map.set(i.client_name, (map.get(i.client_name) ?? 0) + i.amount));
    return Array.from(map, ([label, amount]) => ({ label, amount }));
  }, [invoices]);

  const outflows = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return Array.from(map, ([label, amount]) => ({ label, amount }));
  }, [expenses]);

  const activity = useMemo(() => {
    const items = [
      ...invoices.map((i) => ({
        id: `inv-${i.id}`,
        when: i.paid_at ?? i.created_at,
        title: `${i.status === 'paid' ? 'Paid' : 'Invoice'} · ${i.client_name}`,
        amount: i.amount,
        positive: true,
        tag: i.status,
      })),
      ...expenses.map((e) => ({
        id: `exp-${e.id}`,
        when: e.created_at,
        title: `${e.description}`,
        amount: e.amount,
        positive: false,
        tag: e.category,
      })),
    ];
    return items.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime()).slice(0, 8);
  }, [invoices, expenses]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Balance" value={fmt(stats.net)} icon={Wallet} tone={stats.net >= 0 ? 'primary' : 'negative'} />
        <StatCard label="Income (paid)" value={fmt(stats.income)} icon={ArrowUpRight} tone="positive" />
        <StatCard label="Expenses" value={fmt(stats.spend)} icon={ArrowDownRight} tone="negative" />
        <StatCard label="Outstanding" value={fmt(stats.outstanding)} icon={Clock} tone="muted" />
      </div>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Money river</CardTitle>
        </CardHeader>
        <CardContent>
          <MoneyRiver inflows={inflows} outflows={outflows} net={stats.net} />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activity.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
          )}
          {activity.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(a.when).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase">{a.tag}</Badge>
                <span className={a.positive ? 'text-sm text-emerald-400' : 'text-sm text-orange-400'}>
                  {a.positive ? '+' : '−'}{fmt(a.amount)}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
