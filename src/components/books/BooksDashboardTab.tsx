import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MoneyRiver from './MoneyRiver';
import { useBooksCurrency, moneyOrUnavailable } from '@/lib/books/currency';
import type { MoneyRow } from '@/lib/currency/rates';
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
  const { sum, convert, format, loading: ratesLoading } = useBooksCurrency();

  const stats = useMemo(() => {
    // Two separate income sources: books_income (auto-synced from real
    // platform orders, always USD) and invoices (manually created/sent,
    // tracked in their own table, stored in the business's own currency)
    // -- a paid invoice is real income exactly like a synced order and
    // must count here too. Every row carries its own `currency`, so each
    // is converted to the business's currency (via the live FX table)
    // before being summed -- summing raw amounts across currencies would
    // silently add unrelated units together.
    const incomeRows: MoneyRow[] = income.map((i) => ({ amount: i.amount, currency: i.currency }));
    const paidInvoiceRows: MoneyRow[] = invoices
      .filter((i) => i.status === 'paid')
      .map((i) => ({ amount: i.amount, currency: i.currency }));
    const outstandingRows: MoneyRow[] = invoices
      .filter((i) => i.status !== 'paid')
      .map((i) => ({ amount: i.amount, currency: i.currency }));
    const expenseRows: MoneyRow[] = expenses.map((e) => ({ amount: e.amount, currency: e.currency }));

    const totalIncome = sum([...incomeRows, ...paidInvoiceRows]);
    const outstanding = sum(outstandingRows);
    const spend = sum(expenseRows);
    const net = totalIncome !== null && spend !== null ? totalIncome - spend : null;
    return { income: totalIncome, outstanding, spend, net };
  }, [income, invoices, expenses, sum]);

  const inflows = useMemo(() => {
    const map = new Map<string, MoneyRow[]>();
    invoices
      .filter((i) => i.status === 'paid')
      .forEach((i) => {
        const rows = map.get(i.client_name) ?? [];
        rows.push({ amount: i.amount, currency: i.currency });
        map.set(i.client_name, rows);
      });
    return Array.from(map, ([label, rows]) => ({ label, amount: sum(rows) }));
  }, [invoices, sum]);

  const outflows = useMemo(() => {
    const map = new Map<string, MoneyRow[]>();
    expenses.forEach((e) => {
      const rows = map.get(e.category) ?? [];
      rows.push({ amount: e.amount, currency: e.currency });
      map.set(e.category, rows);
    });
    return Array.from(map, ([label, rows]) => ({ label, amount: sum(rows) }));
  }, [expenses, sum]);

  const activity = useMemo(() => {
    const items = [
      ...invoices.map((i) => ({
        id: `inv-${i.id}`,
        when: i.paid_at ?? i.created_at,
        title: `${i.status === 'paid' ? 'Paid' : 'Invoice'} · ${i.client_name}`,
        amount: convert(i.amount, i.currency),
        positive: true,
        tag: i.status,
      })),
      ...expenses.map((e) => ({
        id: `exp-${e.id}`,
        when: e.created_at,
        title: `${e.description}`,
        amount: convert(e.amount, e.currency),
        positive: false,
        tag: e.category,
      })),
    ];
    return items.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime()).slice(0, 8);
  }, [invoices, expenses, convert]);

  const moneyText = (value: number | null) => moneyOrUnavailable(value === null ? null : format(value), ratesLoading);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Balance" value={moneyText(stats.net)} icon={Wallet} tone={stats.net === null || stats.net >= 0 ? 'primary' : 'negative'} />
        <StatCard label="Income (paid)" value={moneyText(stats.income)} icon={ArrowUpRight} tone="positive" />
        <StatCard label="Expenses" value={moneyText(stats.spend)} icon={ArrowDownRight} tone="negative" />
        <StatCard label="Outstanding" value={moneyText(stats.outstanding)} icon={Clock} tone="muted" />
      </div>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Money river</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.net === null ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-sm text-muted-foreground">
              {ratesLoading ? 'Loading exchange rates…' : 'Rates unavailable — the money river needs a live rate for every currency in play.'}
            </div>
          ) : (
            <MoneyRiver inflows={inflows} outflows={outflows} net={stats.net} />
          )}
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
                  {a.amount === null ? moneyText(null) : `${a.positive ? '+' : '−'}${format(a.amount)}`}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
