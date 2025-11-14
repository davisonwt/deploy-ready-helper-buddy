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
            {entries.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {entries.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Bestowals awaiting distribution after courier confirms product delivery
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchPending()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading pending distributions...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="font-medium">No pending distributions</p>
            <p className="text-sm mt-1">All bestowals have been distributed or are set to auto-distribute</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border bg-background"
              >
                <div className="flex-1 space-y-2">
                  {entry.orchard_title && (
                    <p className="font-medium text-sm">{entry.orchard_title}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="font-mono">
                      {entry.id.substring(0, 8)}...
                    </Badge>
                    <span>•</span>
                    <span>{new Date(entry.created_at).toLocaleString()}</span>
                    {entry.orchard_type && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary">{entry.orchard_type}</Badge>
                      </>
                    )}
                  </div>
                  {entry.hold_reason && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                      Hold Reason: {entry.hold_reason}
                    </p>
                  )}
                  <p className="text-sm font-bold text-primary">
                    {entry.amount} {entry.currency}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => void handleDistribute(entry.id)}
                  disabled={triggering[entry.id]}
                  className="whitespace-nowrap"
                >
                  {triggering[entry.id] ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Distributing...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-2" />
                      Release Funds
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <Separator className="my-4" />
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Distribution Process:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Orchard fully funded (all pockets filled)</li>
            <li>Courier picks up product from sower</li>
            <li>Courier confirms delivery to bestower</li>
            <li>Gosat clicks "Release Funds" to distribute</li>
            <li>Funds split: 85% to sower, remainder to whispers (if applicable)</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

