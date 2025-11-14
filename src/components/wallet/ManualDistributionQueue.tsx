import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRoles } from '@/hooks/useRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Play, RefreshCw } from 'lucide-react';

interface PendingDistribution {
  id: string;
  amount: number;
  currency: string;
  created_at: string;
  hold_reason?: string | null;
  orchard_title?: string | null;
  orchard_type?: string | null;
}

export function ManualDistributionQueue() {
  const { roles, loading: rolesLoading } = useRoles();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<PendingDistribution[]>([]);
  const [triggering, setTriggering] = useState<Record<string, boolean>>({});

  const isAdminOrGosat = useMemo(
    () => roles.includes('admin') || roles.includes('gosat'),
    [roles],
  );

  const fetchPending = useCallback(async () => {
    if (!isAdminOrGosat) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('bestowals')
        .select(`
          id,
          amount,
          currency,
          created_at,
          distribution_data,
          orchards (
            title,
            orchard_type
          )
        `)
        .eq('payment_status', 'completed')
        .eq('distribution_data->>mode', 'manual')
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      const mapped: PendingDistribution[] = (data ?? []).map((item: any) => ({
        id: item.id,
        amount: Number(item.amount ?? 0),
        currency: item.currency ?? 'USDC',
        created_at: item.created_at,
        hold_reason: item.distribution_data?.hold_reason ?? null,
        orchard_title: item.orchards?.title ?? null,
        orchard_type: item.orchards?.orchard_type ?? null,
      }));

      setEntries(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to load pending distributions:', err);
      setError(message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [isAdminOrGosat]);

  useEffect(() => {
    if (rolesLoading) return;
    void fetchPending();
  }, [fetchPending, rolesLoading]);

  const handleDistribute = useCallback(async (bestowalId: string) => {
    setTriggering((prev) => ({ ...prev, [bestowalId]: true }));

    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        error?: string;
      }>('distribute-bestowal', {
        body: { bestowId: bestowalId },
      });

      if (error || !data?.success) {
        throw new Error(error?.message ?? data?.error ?? 'Distribution failed');
      }

      toast.success('Distribution triggered successfully');
      await fetchPending();
    } catch (err) {
      console.error('Manual distribution error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to distribute bestowal');
    } finally {
      setTriggering((prev) => ({ ...prev, [bestowalId]: false }));
    }
  }, [fetchPending]);

  if (rolesLoading || !isAdminOrGosat) {
    return null;
  }

  return (
    <Card className="border-amber-200/60 bg-amber-50/60">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Pending Manual Distributions
            <Badge variant="outline" className="bg-white">
              {entries.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Bestowals marked for manual routing remain in the holding wallet until you release them.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => { void fetchPending(); }}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Refreshing…
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Refresh
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading pending bestowals...
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            All caught up! No manual distributions are waiting.
          </div>
        ) : (
          entries.map((entry, index) => (
            <div key={entry.id} className="rounded-lg border border-amber-200 bg-white/90 p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-amber-900">
                    {entry.orchard_title ?? 'Untitled orchard'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Bestowal ID: <span className="font-mono">{entry.id}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(entry.created_at).toLocaleString()}
                  </div>
                  {entry.orchard_type && (
                    <div className="text-xs text-muted-foreground">
                      Orchard type: {entry.orchard_type}
                    </div>
                  )}
                  {entry.hold_reason && (
                    <div className="text-xs text-muted-foreground">
                      Hold reason: {entry.hold_reason}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start md:items-end gap-2">
                  <div className="text-lg font-semibold text-slate-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: entry.currency ?? 'USD',
                    }).format(entry.amount)}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleDistribute(entry.id)}
                    disabled={triggering[entry.id]}
                  >
                    {triggering[entry.id] ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Distributing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-3.5 w-3.5" />
                        Release Funds
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {index !== entries.length - 1 && <Separator className="mt-4" />}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
