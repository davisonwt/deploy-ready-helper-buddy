import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Sower {
  id: string;
  display_name: string | null;
  logo_url: string | null;
  seller_template: string | null;
  user_id: string;
}

export default function PrescriptionSubmitPage() {
  const { sowerId } = useParams<{ sowerId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sower, setSower] = useState<Sower | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [clientNotes, setClientNotes] = useState('');
  const [fulfillmentMode, setFulfillmentMode] = useState<string>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    if (!sowerId) return;
    (async () => {
      const { data } = await supabase
        .from('sowers')
        .select('id, display_name, logo_url, seller_template, user_id')
        .eq('id', sowerId)
        .maybeSingle();
      setSower((data as Sower) ?? null);
      setLoading(false);
    })();
  }, [sowerId]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in first');
      navigate('/login');
      return;
    }
    if (!sower) return;
    if (!file) {
      toast.error('Please attach your prescription image');
      return;
    }
    if (fulfillmentMode !== 'pickup' && !deliveryAddress.trim()) {
      toast.error('Delivery address required for delivery options');
      return;
    }
    setSubmitting(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const objectPath = `${sower.id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('prescriptions')
        .upload(objectPath, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { data, error } = await supabase.functions.invoke('submit-prescription', {
        body: {
          sower_id: sower.id,
          prescription_file_path: objectPath,
          prescription_file_name: file.name,
          client_notes: clientNotes || null,
          fulfillment_mode: fulfillmentMode,
          delivery_address: deliveryAddress || null,
          contact_phone: contactPhone || null,
        },
      });
      if (error) throw error;
      toast.success('Prescription submitted');
      const roomId = (data as any)?.chat_room_id;
      if (roomId) navigate(`/chatapp?room=${roomId}`);
      else navigate('/dashboard');
    } catch (e: any) {
      toast.error(e?.message ?? 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );

  if (!sower || sower.seller_template !== 'regulated_business') {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            This seller does not accept prescriptions.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">← Back</Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            Submit prescription to {sower.display_name ?? 'this pharmacist'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Your prescription is stored privately. Only the pharmacist can view it.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Prescription image or PDF *</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          <div>
            <Label>Symptoms / notes for the pharmacist</Label>
            <Textarea
              placeholder="e.g. persistent cough, need alternatives to X, allergic to Y…"
              value={clientNotes}
              maxLength={4000}
              rows={4}
              onChange={(e) => setClientNotes(e.target.value)}
            />
          </div>

          <div>
            <Label>Fulfillment</Label>
            <Select value={fulfillmentMode} onValueChange={setFulfillmentMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">In-store pickup</SelectItem>
                <SelectItem value="self_deliver">Pharmacy delivers</SelectItem>
                <SelectItem value="community_driver">Community driver</SelectItem>
                <SelectItem value="courier_quote">Courier quote</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {fulfillmentMode !== 'pickup' && (
            <div>
              <Label>Delivery address *</Label>
              <Textarea
                value={deliveryAddress}
                rows={2}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label>Contact phone (optional)</Label>
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting || !file} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Submit prescription
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
