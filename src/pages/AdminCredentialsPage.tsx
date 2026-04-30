import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ShieldCheck, XCircle, ExternalLink, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface PendingCred {
  id: string;
  user_id: string;
  credential_type: string;
  file_url: string | null;
  notes: string | null;
  status: string;
  submitted_at: string;
  rejection_reason: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  identity: 'Verified Identity',
  license: 'Licensed / Bonded',
  insurance: 'Insured',
  background_check: 'Background Checked',
};

export default function AdminCredentialsPage() {
  const { user } = useAuth();
  const { isAdminOrGosat } = useRoles();
  const qc = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-pending-credentials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_pending_credentials_v' as any)
        .select('*')
        .in('status', ['pending', 'rejected']);
      if (error) throw error;
      return (data || []) as unknown as PendingCred[];
    },
    enabled: !!isAdminOrGosat,
  });

  const signedUrlFor = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('seller-credentials')
      .createSignedUrl(path, 60 * 5);
    if (error) throw error;
    return data.signedUrl;
  };

  const openProof = async (path: string) => {
    try {
      const url = await signedUrlFor(path);
      window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      toast.error(e.message || 'Could not open proof');
    }
  };

  const decide = async (cred: PendingCred, decision: 'verified' | 'rejected') => {
    if (!user) return;
    if (decision === 'rejected' && !reasons[cred.id]?.trim()) {
      toast.error('Add a reason before rejecting');
      return;
    }
    setBusy(cred.id);
    try {
      const { error } = await supabase
        .from('seller_credentials' as any)
        .update({
          status: decision,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: decision === 'rejected' ? reasons[cred.id] : null,
        })
        .eq('id', cred.id);
      if (error) throw error;
      toast.success(decision === 'verified' ? 'Credential verified' : 'Credential rejected');
      qc.invalidateQueries({ queryKey: ['admin-pending-credentials'] });
    } catch (e: any) {
      toast.error(e.message || 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  if (!isAdminOrGosat) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Restricted</h1>
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary" /> Credential Review Queue
        </h1>
        <p className="text-muted-foreground">
          Approve or reject seller credentials. Approving unlocks the matching Trust tag for that seller across the marketplace.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : data.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          🎉 No credentials waiting for review.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {data.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg">
                        {(c.display_name || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{c.display_name || 'Unnamed sower'}</CardTitle>
                      <div className="text-xs text-muted-foreground">{c.user_id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{TYPE_LABELS[c.credential_type] || c.credential_type}</Badge>
                    <Badge variant={c.status === 'pending' ? 'secondary' : 'destructive'}>
                      {c.status === 'pending' ? <Clock className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {c.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {c.notes && (
                  <div className="text-sm bg-muted/40 rounded p-3">
                    <span className="font-medium">Submitter notes: </span>{c.notes}
                  </div>
                )}
                {c.file_url && (
                  <Button variant="outline" size="sm" onClick={() => openProof(c.file_url!)}>
                    <ExternalLink className="w-4 h-4 mr-2" /> Open uploaded proof
                  </Button>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">Rejection reason (required to reject)</label>
                  <Textarea
                    rows={2}
                    value={reasons[c.id] || ''}
                    onChange={(e) => setReasons({ ...reasons, [c.id]: e.target.value })}
                    placeholder="e.g. License expired in 2024"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => decide(c, 'rejected')}
                    disabled={busy === c.id}
                  >
                    {busy === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Reject
                  </Button>
                  <Button
                    onClick={() => decide(c, 'verified')}
                    disabled={busy === c.id}
                  >
                    {busy === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
