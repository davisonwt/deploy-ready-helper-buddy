import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Sentinel -- hourly monitoring agent. Lists open conditions (severity,
 * first/last seen, an acknowledge button) and shows when it last ran.
 * Detects and reports only -- nothing here fixes anything itself; this
 * panel is a read/acknowledge surface over sentinel_events, same table
 * the hourly sentinel edge function writes to. See supabase/functions/
 * sentinel/ for the checks themselves.
 */
interface SentinelEvent {
  id: string;
  check_name: string;
  subject: string | null;
  severity: 'info' | 'warn' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  message: string;
  first_seen: string;
  last_seen: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

const SEVERITY_RANK: Record<string, number> = { critical: 3, warn: 2, info: 1 };
const SEVERITY_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  critical: 'destructive', warn: 'secondary', info: 'outline',
};

export default function SentinelPanel() {
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [openEvents, setOpenEvents] = useState<SentinelEvent[]>([]);
  const [lastHeartbeat, setLastHeartbeat] = useState<{ created_at: string; message: string } | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: open }, { data: heartbeat }] = await Promise.all([
      supabase.from('sentinel_events').select('*').eq('status', 'open').order('created_at', { ascending: false }),
      supabase.from('sentinel_events').select('created_at, message').eq('check_name', 'daily_heartbeat')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    const sorted = ((open ?? []) as SentinelEvent[]).slice()
      .sort((a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0));
    setOpenEvents(sorted);
    setLastHeartbeat((heartbeat as any) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const acknowledge = async (row: SentinelEvent) => {
    if (!user?.id) return;
    setActing(row.id);
    try {
      const { error } = await supabase.from('sentinel_events')
        .update({ status: 'acknowledged', acknowledged_by: user.id, acknowledged_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
      toast.success('Acknowledged');
      setOpenEvents((prev) => prev.filter((x) => x.id !== row.id));
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not acknowledge');
    } finally {
      setActing(null);
    }
  };

  const criticalCount = openEvents.filter((e) => e.severity === 'critical').length;
  const warnCount = openEvents.filter((e) => e.severity === 'warn').length;
  const heartbeatAgeHours = lastHeartbeat
    ? (Date.now() - new Date(lastHeartbeat.created_at).getTime()) / (60 * 60 * 1000)
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Sentinel
          </CardTitle>
          <CardDescription>
            Hourly checks across payouts, escrow, the hot wallet, moderation queues, and config drift.
            Detects and reports only -- it never fixes anything itself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {heartbeatAgeHours === null ? (
            <div className="text-xs text-muted-foreground">
              No heartbeat yet -- sentinel hasn't run since this table was created.
            </div>
          ) : heartbeatAgeHours > 3 ? (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              Last heartbeat was {Math.round(heartbeatAgeHours)}h ago (expected hourly) -- sentinel itself may not
              be running. This is the one failure mode sentinel can't detect about itself; if this persists, check
              the cron job directly and consider external uptime monitoring.
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Last ran {new Date(lastHeartbeat!.created_at).toLocaleString()} -- {lastHeartbeat!.message}
            </div>
          )}
          <div className="flex gap-2">
            {criticalCount > 0 && <Badge variant="destructive">{criticalCount} critical</Badge>}
            {warnCount > 0 && <Badge variant="secondary">{warnCount} warn</Badge>}
            {criticalCount === 0 && warnCount === 0 && <Badge variant="outline">All clear</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Open conditions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : openEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing open right now.</p>
          ) : (
            <div className="space-y-3">
              {openEvents.map((row) => (
                <div key={row.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={SEVERITY_VARIANT[row.severity] ?? 'outline'}>{row.severity}</Badge>
                        <span className="text-xs font-mono text-muted-foreground">{row.check_name}</span>
                        {row.subject && <span className="text-xs font-mono text-muted-foreground truncate">{row.subject}</span>}
                      </div>
                      <p className="text-sm">{row.message}</p>
                      <p className="text-xs text-muted-foreground">
                        First seen {new Date(row.first_seen).toLocaleString()} · Last seen {new Date(row.last_seen).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={acting === row.id}
                      onClick={() => acknowledge(row)}
                    >
                      {acting === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Acknowledge'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
