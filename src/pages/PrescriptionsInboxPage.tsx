import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldCheck, MessageSquare, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PrescriptionRow {
  id: string;
  user_id: string;
  chat_room_id: string | null;
  prescription_file_path: string | null;
  prescription_file_name: string | null;
  client_notes: string | null;
  pharmacist_notes: string | null;
  quoted_amount_usdc: number | null;
  fulfillment_mode: string | null;
  status: string;
  delivery_address: string | null;
  contact_phone: string | null;
  created_at: string;
}

const STATUS_STEPS = ['submitted', 'reviewed', 'quoted', 'paid', 'ready', 'fulfilled'] as const;
const STATUS_BADGE: Record<string, string> = {
  submitted: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  reviewed: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  quoted: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  paid: 'bg-teal-500/15 text-teal-700 border-teal-500/30',
  ready: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  fulfilled: 'bg-green-500/15 text-green-700 border-green-500/30',
  cancelled: 'bg-muted text-muted-foreground border',
};

export default function PrescriptionsInboxPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, Partial<PrescriptionRow>>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    // Get sower(s) owned by this user
    const { data: sowers } = await supabase
      .from('sowers')
      .select('id')
      .eq('user_id', user.id);
    const sowerIds = (sowers ?? []).map((s) => s.id);
    if (sowerIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('prescription_requests' as any)
      .select('*')
      .in('sower_id', sowerIds)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setRows(((data as unknown) as PrescriptionRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]); // eslint-disable-line

  const viewPrescription = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('prescription-signed-url', {
        body: { prescription_request_id: id },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (url) {
        setSignedUrls((prev) => ({ ...prev, [id]: url }));
        window.open(url, '_blank');
      } else {
        toast.info('No file attached');
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not open prescription');
    }
  };

  const saveDraft = async (row: PrescriptionRow) => {
    const patch = drafts[row.id] ?? {};
    if (Object.keys(patch).length === 0) return;
    const { error } = await supabase
      .from('prescription_requests' as any)
      .update(patch)
      .eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    setDrafts((p) => { const n = { ...p }; delete n[row.id]; return n; });
    load();
  };

  const advanceStatus = async (row: PrescriptionRow, next: string) => {
    const { error } = await supabase
      .from('prescription_requests' as any)
      .update({ status: next })
      .eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${next}`);
    load();
  };

  if (!user) return null;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-green-600" />
            Prescriptions Inbox
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review client prescriptions, quote a price, and mark ready for pickup or delivery.
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          No prescriptions yet. Clients can submit through your public sower page.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => {
            const draft = drafts[row.id] ?? {};
            const nextIdx = STATUS_STEPS.indexOf(row.status as typeof STATUS_STEPS[number]);
            const nextStatus = nextIdx >= 0 && nextIdx < STATUS_STEPS.length - 1 ? STATUS_STEPS[nextIdx + 1] : null;
            return (
              <Card key={row.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">
                        Request {row.id.slice(0, 8)}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                        {row.fulfillment_mode && ` · ${row.fulfillment_mode.replace('_', ' ')}`}
                      </p>
                    </div>
                    <Badge variant="outline" className={STATUS_BADGE[row.status] ?? ''}>
                      {row.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {row.client_notes && (
                    <div className="text-sm bg-muted/50 rounded p-2">
                      <strong>Symptoms:</strong> {row.client_notes}
                    </div>
                  )}
                  {row.delivery_address && (
                    <div className="text-sm">
                      <strong>Delivery:</strong> {row.delivery_address}
                      {row.contact_phone && ` · ${row.contact_phone}`}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => viewPrescription(row.id)}>
                      <FileText className="w-4 h-4 mr-1" /> View prescription
                    </Button>
                    {row.chat_room_id && (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/chatapp?room=${row.chat_room_id}`)}>
                        <MessageSquare className="w-4 h-4 mr-1" /> Open chat
                      </Button>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Quote (USDC)</label>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={row.quoted_amount_usdc ?? ''}
                        onChange={(e) => setDrafts((p) => ({
                          ...p,
                          [row.id]: { ...p[row.id], quoted_amount_usdc: e.target.value ? Number(e.target.value) : null },
                        }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Fulfillment</label>
                      <Select
                        defaultValue={row.fulfillment_mode ?? undefined}
                        onValueChange={(v) => setDrafts((p) => ({
                          ...p,
                          [row.id]: { ...p[row.id], fulfillment_mode: v },
                        }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pickup">In-store pickup</SelectItem>
                          <SelectItem value="self_deliver">Pharmacy delivers</SelectItem>
                          <SelectItem value="community_driver">Community driver</SelectItem>
                          <SelectItem value="courier_quote">Courier quote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Pharmacist notes (internal / private)</label>
                    <Textarea
                      rows={2}
                      defaultValue={row.pharmacist_notes ?? ''}
                      onChange={(e) => setDrafts((p) => ({
                        ...p,
                        [row.id]: { ...p[row.id], pharmacist_notes: e.target.value },
                      }))}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {Object.keys(draft).length > 0 && (
                      <Button size="sm" onClick={() => saveDraft(row)}>Save</Button>
                    )}
                    {nextStatus && row.status !== 'cancelled' && (
                      <Button size="sm" variant="secondary" onClick={() => advanceStatus(row, nextStatus)}>
                        Mark {nextStatus}
                      </Button>
                    )}
                    {row.status !== 'fulfilled' && row.status !== 'cancelled' && (
                      <Button size="sm" variant="ghost" onClick={() => advanceStatus(row, 'cancelled')}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
