import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBooksBusiness } from '@/hooks/useBooksBusiness';
import { useJobInvoicing } from '@/hooks/useJobInvoicing';

const jobStatusStyles: Record<string, string> = {
  planning: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  quoted: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  approved: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  in_progress: 'bg-violet-500/15 text-violet-300 border-violet-400/30',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  cancelled: 'bg-red-500/15 text-red-300 border-red-400/30',
};
const estimateStatusStyles: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  sent: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  rejected: 'bg-red-500/15 text-red-300 border-red-400/30',
};
const invoiceStatusStyles: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  sent: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  void: 'bg-red-500/15 text-red-300 border-red-400/30',
};

export default function JobInvoicingDashboardPage() {
  const navigate = useNavigate();
  const { current, loading: bizLoading } = useBooksBusiness();
  const { loading, jobs, estimates, invoices } = useJobInvoicing(current?.id ?? null);

  if (bizLoading || loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Loading…</div>;
  }
  if (!current) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Set up a business in your profile first.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/books')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Books
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Job invoicing</h1>
        <Link to="/books/jobs/new">
          <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New job</Button>
        </Link>
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">My Jobs</TabsTrigger>
          <TabsTrigger value="estimates">My Estimates</TabsTrigger>
          <TabsTrigger value="invoices">My Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <Card className="border-border/60 bg-card/50 backdrop-blur">
            <CardHeader><CardTitle className="text-base">Jobs</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {jobs.length === 0 && <p className="text-sm text-muted-foreground">No jobs yet.</p>}
              {jobs.map((j) => (
                <Link
                  key={j.id}
                  to={`/books/jobs/${j.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{j.title}</p>
                    {j.location && <p className="text-xs text-muted-foreground">{j.location}</p>}
                  </div>
                  <Badge variant="outline" className={`uppercase ${jobStatusStyles[j.status]}`}>{j.status.replace('_', ' ')}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estimates">
          <Card className="border-border/60 bg-card/50 backdrop-blur">
            <CardHeader><CardTitle className="text-base">Estimates</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {estimates.length === 0 && <p className="text-sm text-muted-foreground">No estimates yet.</p>}
              {estimates.map((e) => (
                <Link
                  key={e.id}
                  to={`/books/jobs/${e.job_notes_id}`}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm hover:bg-accent/40"
                >
                  <span>{e.number} · {e.customer_name ?? 'Customer'} · ${e.total.toFixed(2)}</span>
                  <Badge variant="outline" className={`uppercase ${estimateStatusStyles[e.status]}`}>{e.status}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="border-border/60 bg-card/50 backdrop-blur">
            <CardHeader><CardTitle className="text-base">Invoices</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
              {invoices.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/books/invoices/${inv.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm hover:bg-accent/40"
                >
                  <span>{inv.number} · {inv.customer_name ?? 'Customer'} · ${inv.total.toFixed(2)}</span>
                  <Badge variant="outline" className={`uppercase ${invoiceStatusStyles[inv.status]}`}>{inv.status}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
