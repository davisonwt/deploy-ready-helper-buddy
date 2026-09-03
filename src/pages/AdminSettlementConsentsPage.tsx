// Gosat-only: who has accepted the settlement-consent checkbox
// (non-custodial model, legal 2026-09-03), and at what version. RLS
// (gosats_read_all_settlement_consents) is what actually grants this --
// the page just renders it.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ConsentRow {
  id: string;
  user_id: string;
  version: number;
  accepted_at: string;
  ip: string | null;
}
interface ProfileRow {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  email: string | null;
}

export default function AdminSettlementConsentsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: versionData }, { data: consentRows, error }] = await Promise.all([
          supabase.rpc('get_settlement_consent_version' as any),
          supabase
            .from('settlement_consents' as any)
            .select('id, user_id, version, accepted_at, ip')
            .order('accepted_at', { ascending: false }),
        ]);
        if (error) throw error;
        setCurrentVersion(Number(versionData) || 1);
        const rows = (consentRows ?? []) as unknown as ConsentRow[];
        setConsents(rows);

        const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, first_name, email')
            .in('user_id', userIds);
          const map: Record<string, ProfileRow> = {};
          for (const p of (profiles ?? []) as any[]) map[p.user_id] = p;
          setProfilesById(map);
        }
      } catch (err) {
        console.error('AdminSettlementConsentsPage load failed', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Latest acceptance per user (a version bump leaves older rows in place).
  const latestByUser = new Map<string, ConsentRow>();
  for (const row of consents) {
    const existing = latestByUser.get(row.user_id);
    if (!existing || row.accepted_at > existing.accepted_at) latestByUser.set(row.user_id, row);
  }
  const rows = Array.from(latestByUser.values()).sort((a, b) => (a.accepted_at < b.accepted_at ? 1 : -1));

  const filtered = search.trim()
    ? rows.filter((r) => {
        const p = profilesById[r.user_id];
        const label = `${p?.display_name ?? ''} ${p?.first_name ?? ''} ${p?.email ?? ''} ${r.user_id}`.toLowerCase();
        return label.includes(search.trim().toLowerCase());
      })
    : rows;

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/dashboard')}>
          <LayoutDashboard className="w-4 h-4 mr-2" /> Admin Dashboard
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Settlement Consents</h1>
        <p className="text-sm text-muted-foreground">
          Who has accepted the required "sale proceeds held until $20" checkbox, and at what version.
          Current required version: <strong>{currentVersion ?? '…'}</strong>.
        </p>
      </div>

      <Input
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{filtered.length} member{filtered.length === 1 ? '' : 's'} with a recorded acceptance</CardTitle>
          <CardDescription>Only shows members who have accepted at least once — someone never listed anything has no row here.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No matches.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((r) => {
                const p = profilesById[r.user_id];
                const current = currentVersion !== null && r.version === currentVersion;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-md border bg-muted/30">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {p?.display_name || p?.first_name || p?.email || r.user_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Accepted {new Date(r.accepted_at).toLocaleString()} · v{r.version}
                        {r.ip ? ` · ${r.ip}` : ''}
                      </div>
                    </div>
                    <Badge className={current ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'}>
                      {current ? 'Current' : `Outdated (v${r.version})`}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
