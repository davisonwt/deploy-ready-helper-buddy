import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { monthLabel } from '@/lib/books/format';
import { useBooksCurrency } from '@/lib/books/currency';
import type { MoneyRow } from '@/lib/currency/rates';
import type { ExpenseRow } from '@/hooks/useBooksData';
import type { InvoiceRow } from '@/hooks/useInvoicing';

interface Props {
  invoices: InvoiceRow[];
  expenses: ExpenseRow[];
}

const PIE_COLORS = [
  'hsl(190 90% 55%)',
  'hsl(152 70% 50%)',
  'hsl(20 90% 62%)',
  'hsl(45 93% 58%)',
  'hsl(280 70% 65%)',
  'hsl(340 75% 62%)',
  'hsl(215 20% 60%)',
];

export default function ReportsTab({ invoices, expenses }: Props) {
  const { symbol, sum, format, loading: ratesLoading } = useBooksCurrency();

  const monthsRaw = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; incomeRows: MoneyRow[]; expenseRows: MoneyRow[] }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthLabel(d), incomeRows: [], expenseRows: [] });
    }
    const index = new Map(buckets.map((b) => [b.key, b]));
    const keyOf = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${d.getMonth()}`;
    };

    invoices
      .filter((i) => i.status === 'paid')
      .forEach((i) => {
        const b = index.get(keyOf(i.paid_at ?? i.created_at));
        if (b) b.incomeRows.push({ amount: i.total, currency: 'USD' });
      });
    expenses.forEach((e) => {
      const b = index.get(keyOf(e.spent_on ?? e.created_at));
      if (b) b.expenseRows.push({ amount: e.amount, currency: e.currency });
    });

    return buckets;
  }, [invoices, expenses]);

  const months = useMemo(
    () => monthsRaw.map((b) => ({ key: b.key, label: b.label, income: sum(b.incomeRows), expenses: sum(b.expenseRows) })),
    [monthsRaw, sum]
  );
  const monthsUnavailable = months.some((b) => b.income === null || b.expenses === null);

  const byCategoryRaw = useMemo(() => {
    const map = new Map<string, MoneyRow[]>();
    expenses.forEach((e) => {
      const rows = map.get(e.category) ?? [];
      rows.push({ amount: e.amount, currency: e.currency });
      map.set(e.category, rows);
    });
    return map;
  }, [expenses]);

  const byCategory = useMemo(
    () =>
      Array.from(byCategoryRaw, ([name, rows]) => ({ name, value: sum(rows) }))
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    [byCategoryRaw, sum]
  );
  const byCategoryUnavailable = byCategory.some((c) => c.value === null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Income vs expenses — last 6 months</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          {monthsUnavailable ? (
            <p className="pt-10 text-center text-sm text-muted-foreground">
              {ratesLoading ? 'Loading exchange rates…' : 'Rates unavailable — figures can’t be shown accurately.'}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months.map((m) => ({ label: m.label, income: m.income ?? 0, expenses: m.expenses ?? 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={70}
                  tickFormatter={(v) => `${symbol}${Math.round(Number(v) / 1000)}k`} />
                <Tooltip
                  formatter={(v: any) => format(Number(v))}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Income" fill="hsl(152 70% 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="hsl(20 90% 62%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Spending by category</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          {byCategory.length === 0 ? (
            <p className="pt-10 text-center text-sm text-muted-foreground">No expenses to report yet.</p>
          ) : byCategoryUnavailable ? (
            <p className="pt-10 text-center text-sm text-muted-foreground">
              {ratesLoading ? 'Loading exchange rates…' : 'Rates unavailable — figures can’t be shown accurately.'}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={2}>
                  {byCategory.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => format(Number(v))}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
