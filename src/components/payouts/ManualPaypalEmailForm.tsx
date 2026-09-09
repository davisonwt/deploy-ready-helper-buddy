import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fallback for when "Connect with PayPal" (Log in with PayPal) itself isn't
 * available to the member — lets them type their PayPal email directly.
 * Saved with verification_method: 'manual_entry' rather than 'paypal_oauth'
 * (see paypal-connect's save_manual_email action) — PayPal itself never
 * confirms this address, unlike the OAuth path.
 */
export default function ManualPaypalEmailForm({ onSaved }: { onSaved?: () => void }) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('paypal-connect', {
        body: { action: 'save_manual_email', email: trimmed },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('PayPal email saved');
      setEmail('');
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save that email');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">or enter your PayPal email manually</p>
      <div className="flex gap-2">
        <Input
          type="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={saving}
          className="flex-1"
        />
        <Button onClick={save} disabled={saving || !email.trim()} variant="outline">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </div>
  );
}
