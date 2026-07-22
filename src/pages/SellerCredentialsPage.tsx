import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMyCredentials, type CredentialType } from '@/hooks/useMarketplaceTaxonomy';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, Upload, Clock, XCircle } from 'lucide-react';

const CRED_TYPES: { type: CredentialType; label: string; desc: string }[] = [
  { type: 'identity', label: 'Verified Identity', desc: 'Government-issued photo ID (driver license, passport).' },
  { type: 'license', label: 'Licensed / Bonded', desc: 'Trade license or professional certification.' },
  { type: 'insurance', label: 'Insured', desc: 'Liability or professional insurance certificate.' },
  { type: 'background_check', label: 'Background Checked', desc: 'Recent background check report.' },
  { type: 'pharmacist_license' as CredentialType, label: 'Pharmacist License', desc: 'Registered pharmacist license (required to accept prescriptions).' },
  { type: 'vet_license' as CredentialType, label: 'Veterinarian License', desc: 'Registered veterinarian license.' },
  { type: 'herbalist_cert' as CredentialType, label: 'Herbalist Certification', desc: 'Recognised herbalist certification.' },
  { type: 'optometrist_license' as CredentialType, label: 'Optometrist License', desc: 'Registered optometrist license.' },
  { type: 'clinic_license' as CredentialType, label: 'Clinic License', desc: 'Registered clinic/facility license.' },
];

const STATUS_BADGE: Record<string, { label: string; cls: string; Icon: any }> = {
  verified: { label: 'Verified', cls: 'bg-green-500/15 text-green-700 border-green-500/30', Icon: ShieldCheck },
  pending: { label: 'Pending Review', cls: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30', Icon: Clock },
  rejected: { label: 'Rejected', cls: 'bg-red-500/15 text-red-700 border-red-500/30', Icon: XCircle },
  expired: { label: 'Expired', cls: 'bg-muted text-muted-foreground border', Icon: Clock },
};

export default function SellerCredentialsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: creds = [], isLoading } = useMyCredentials(user?.id);
  const [uploading, setUploading] = useState<CredentialType | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleUpload = async (type: CredentialType, file: File) => {
    if (!user?.id) return;
    setUploading(type);
    try {
      const path = `${user.id}/${type}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('seller-credentials')
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase
        .from('seller_credentials' as any)
        .insert({
          user_id: user.id,
          credential_type: type,
          file_url: path,
          notes: notes[type] || null,
          status: 'pending',
        });
      if (insErr) throw insErr;

      toast.success('Submitted for review');
      qc.invalidateQueries({ queryKey: ['my-credentials', user.id] });
      qc.invalidateQueries({ queryKey: ['my-verified-credentials', user.id] });
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Seller Credentials</h1>
          <p className="text-muted-foreground">
            Upload proof to unlock Trust tags (Verified Identity, Licensed, Insured, Background Checked) on your listings.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/seller/business-settings">Business Settings</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {CRED_TYPES.map(({ type, label, desc }) => {
          const mine = creds.filter((c) => c.credential_type === type);
          const latest = mine[0];
          const badge = latest ? STATUS_BADGE[latest.status] : null;
          return (
            <Card key={type}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      {label}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                  </div>
                  {badge && (
                    <Badge variant="outline" className={badge.cls}>
                      <badge.Icon className="w-3 h-3 mr-1" />
                      {badge.label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {latest?.status === 'rejected' && latest.rejection_reason && (
                  <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded p-2">
                    Reason: {latest.rejection_reason}
                  </div>
                )}
                {(!latest || latest.status === 'rejected' || latest.status === 'expired') && (
                  <>
                    <div>
                      <Label className="text-xs">Notes (optional)</Label>
                      <Textarea
                        rows={2}
                        value={notes[type] || ''}
                        onChange={(e) => setNotes({ ...notes, [type]: e.target.value })}
                        placeholder="License number, issuing authority, etc."
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Upload proof (PDF or image)</Label>
                      <Input
                        type="file"
                        accept="application/pdf,image/*"
                        disabled={uploading === type}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(type, f);
                        }}
                      />
                    </div>
                  </>
                )}
                {latest?.status === 'pending' && (
                  <p className="text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Submitted {new Date(latest.submitted_at).toLocaleDateString()}. An admin will review shortly.
                  </p>
                )}
                {latest?.status === 'verified' && (
                  <p className="text-sm text-green-700">
                    ✓ Verified on {latest.reviewed_at ? new Date(latest.reviewed_at).toLocaleDateString() : '—'}
                    {latest.expires_at && ` — expires ${new Date(latest.expires_at).toLocaleDateString()}`}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
