import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Wallet, ArrowLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecipientPreview {
  recipient_type: 'sower' | 'whisperer';
  recipient_user_id: string;
  amount_usd: number;
  eligible: boolean;
  reason?: string;
}

interface PreviewResponse {
  dry_run: true;
  totalFloatUsd: number;
  recipients: RecipientPreview[];
}

const REASON_LABEL: Record<string, string> = {
  below_minimum: 'Below $20 minimum',
  no_verified_paypal_email: 'No verified PayPal email',
};

function fmtUsd(n: number) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

/** Next Friday 02:00 UTC from "now" — matches the payout-earnings-weekly cron schedule. */
function nextFridayUtc(): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 0, 0));
  const currentDay = d.getUTCDay(); // 0=Sun..6=Sat, Friday=5
  let daysUntilFriday = (5 - currentDay + 7) % 7;
  if (daysUntilFriday === 0 && now.getTime() >= d.getTime()) daysUntilFriday = 7;
  d.setUTCDate(d.getUTCDate() + daysUntilFriday);
  return d;
}

export default function AdminPayoutsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('payout-earnings', { body: { dry_run: true } });
      if (error) throw error;
      setData(data as PreviewResponse);
    } catch (err: any) {
      console.error('payout-earnings preview failed', err);
      setError(err?.message ?? 'Failed to load payout preview.');
      toast.error('Failed to load payout preview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const eligible = data?.recipients.filter((r) => r.eligible) ?? [];
  const skipped = data?.recipients.filter((r) => !r.eligible) ?? [];
  const nextRunEligibleTotal = eligible.reduce((s, r) => s + r.amount_usd, 0);

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/treasury')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Treasury
        </Button>
      </div>

      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Wallet className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Payouts</h1>
            <p className="text-sm text-muted-foreground">
              Weekly PayPal Payouts run (Fridays 02:00 UTC) — sower and whisperer balances, $20 minimum.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal">Current float (all unpaid balances)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{fmtUsd(data.totalFloatUsd)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.recipients.length} recipient{data.recipients.length === 1 ? '' : 's'} with an owed balance
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal">Next run preview — {nextFridayUtc().toISOString().slice(0, 16).replace('T', ' ')} UTC</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{fmtUsd(nextRunEligibleTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {eligible.length} eligible · {skipped.length} skipped
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Would be paid</CardTitle>
              <CardDescription>≥ $20 and a verified PayPal email on file.</CardDescription>
            </CardHeader>
            <CardContent>
              {eligible.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">No recipient currently qualifies.</p>
              ) : (
                <ul className="space-y-2">
                  {eligible.map((r) => (
                    <li key={`${r.recipient_type}-${r.recipient_user_id}`} className="flex items-center justify-between gap-3 p-3 rounded-md border bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="secondary" className="text-xs capitalize">{r.recipient_type}</Badge>
                        <span className="font-mono text-xs truncate">{r.recipient_user_id}</span>
                      </div>
                      <span className="font-semibold">{fmtUsd(r.amount_usd)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skipped</CardTitle>
              <CardDescription>Stays owed, retried automatically every run.</CardDescription>
            </CardHeader>
            <CardContent>
              {skipped.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">Nothing skipped right now.</p>
              ) : (
                <ul className="space-y-2">
                  {skipped.map((r) => (
                    <li key={`${r.recipient_type}-${r.recipient_user_id}`} className="flex items-center justify-between gap-3 p-3 rounded-md border bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="secondary" className="text-xs capitalize">{r.recipient_type}</Badge>
                        <span className="font-mono text-xs truncate">{r.recipient_user_id}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-muted-foreground">{fmtUsd(r.amount_usd)}</span>
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                          {REASON_LABEL[r.reason ?? ''] ?? r.reason}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
