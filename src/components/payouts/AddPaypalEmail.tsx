import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Add a PayPal payout email.
 *
 * v1 stores the email unverified. The OTP delivery + verification flow is
 * planned for a later part once the corresponding edge function and storage
 * are in place. For now the user sees the email listed as "Unverified" on
 * the payout settings page.
 */

interface Props {
  onSaved?: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddPaypalEmail({ onSaved }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const looksValid = EMAIL_RE.test(email.trim());
  const canSubmit = !!user && looksValid && !saving;

  const handleSave = async () => {
    if (!user || !canSubmit) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('user_wallets').insert({
        user_id: user.id,
        wallet_type: 'paypal_email',
        wallet_address: email.trim().toLowerCase(),
        payout_currency: 'USD',
        network: null,
        is_active: true,
        is_primary: false,
        verification_method: 'none',
        verified_at: null,
      } as any);
      if (error) throw error;
      toast.success('PayPal email saved', {
        description: 'Email verification (OTP) is coming soon. The address is stored as unverified for now.',
      });
      setEmail('');
      onSaved?.();
    } catch (e: any) {
      console.error('AddPaypalEmail save error', e);
      toast.error(e?.message ?? 'Failed to save PayPal email');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add a PayPal payout email</CardTitle>
        <CardDescription>
          PayPal payouts arrive in USD and incur a PayPal-side fee on withdrawal that you bear yourself.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pp-email">PayPal email</Label>
          <Input
            id="pp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {email && !looksValid && (
            <p className="text-xs text-destructive">That doesn&apos;t look like a valid email.</p>
          )}
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Make sure this email matches your PayPal account exactly. We&apos;ll add email-OTP verification in a later release; until then the address is saved as unverified.
          </AlertDescription>
        </Alert>

        <Button onClick={handleSave} disabled={!canSubmit} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Save PayPal email
        </Button>
      </CardContent>
    </Card>
  );
}
