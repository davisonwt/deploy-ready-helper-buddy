import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

interface AwaitingRow {
  id: string;
  amount: number | null;
  currency: string | null;
  payout_provider: string | null;
  payout_destination: string | null;
  payout_currency: string | null;
  payout_reference: string | null;
  payout_attempted_at: string | null;
  payout_error: string | null;
  created_at: string;
}

export default function AdminPayoutConfirmationsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<AwaitingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bestowals')
      .select(
        'id, amount, currency, payout_provider, payout_destination, payout_currency, payout_reference, payout_attempted_at, payout_error, created_at',
      )
      .eq('payout_status', 'awaiting_2fa')
      .order('payout_attempted_at', { ascending: false, nullsFirst: false })
      .limit(100);

    if (error) {
      toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    } else {
      setRows((data ?? []) as AwaitingRow[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-payout-confirmations')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bestowals' },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const submit = async (bestowalId: string) => {
    const code = (codes[bestowalId] ?? '').trim();
    if (!code) {
      toast({ title: 'Code required', description: 'Enter the 2FA code first.', variant: 'destructive' });
      return;
    }
    setSubmitting((s) => ({ ...s, [bestowalId]: true }));
    const { data, error } = await supabase.functions.invoke('nowpayments-verify-payout', {
      body: { bestowalId, code },
    });
    setSubmitting((s) => ({ ...s, [bestowalId]: false }));

    if (error) {
      toast({ title: 'Verify failed', description: error.message, variant: 'destructive' });
      return;
    }
    if ((data as { ok?: boolean })?.ok) {
      toast({ title: 'Payout verified', description: `Bestowal ${bestowalId.slice(0, 8)} marked sent.` });
      setCodes((c) => ({ ...c, [bestowalId]: '' }));
      load();
    } else {
      const err = (data as { error?: string; detail?: unknown })?.error ?? 'unknown_error';
      toast({
        title: 'Verify rejected',
        description: `${err}${(data as { detail?: unknown })?.detail ? ' — ' + JSON.stringify((data as { detail?: unknown }).detail) : ''}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            Payout 2FA Confirmations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            NOWPayments mass-payout batches awaiting a verification code. Get the code from the email
            (or authenticator) NOWPayments sent for each batch, then submit it here to release funds.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {rows.length === 0 && !loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No payouts awaiting 2FA verification.
          </CardContent>
        </Card>
      )}

      {rows.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="font-mono text-sm">{r.id}</span>
              <Badge variant="secondary">{r.payout_provider ?? 'nowpayments'}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Field label="Amount" value={`${r.amount ?? '?'} ${r.payout_currency ?? r.currency ?? ''}`} />
              <Field label="Destination" value={r.payout_destination ?? '—'} mono />
              <Field label="Batch ID" value={r.payout_reference ?? '—'} mono />
              <Field
                label="Attempted"
                value={r.payout_attempted_at ? new Date(r.payout_attempted_at).toLocaleString() : '—'}
              />
              <Field label="Created" value={new Date(r.created_at).toLocaleString()} />
              {r.payout_error && <Field label="Last error" value={r.payout_error} />}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
              <div className="flex-1">
                <Label htmlFor={`code-${r.id}`}>2FA verification code</Label>
                <Input
                  id={`code-${r.id}`}
                  value={codes[r.id] ?? ''}
                  onChange={(e) => setCodes((c) => ({ ...c, [r.id]: e.target.value }))}
                  placeholder="e.g. 482913"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </div>
              <Button onClick={() => submit(r.id)} disabled={submitting[r.id]}>
                {submitting[r.id] ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Verify & release'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</div>
    </div>
  );
}
