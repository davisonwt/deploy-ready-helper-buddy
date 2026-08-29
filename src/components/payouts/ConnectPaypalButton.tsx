import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATE_KEY = 'paypal_connect_state';

export function paypalConnectRedirectUri(): string {
  return `${window.location.origin}/settings/payouts/paypal-connected`;
}

/**
 * "Connect with PayPal" — starts the Log in with PayPal OAuth flow.
 * Replaces manual email entry: PayPal itself supplies the verified email,
 * so there's nothing for the user to type here.
 *
 * A random `state` is generated and stashed in sessionStorage before the
 * redirect, then checked on return (PaypalConnectedPage) — standard OAuth
 * CSRF protection for a flow that binds an external identity to an
 * already-authenticated session.
 */
export default function ConnectPaypalButton() {
  const [loading, setLoading] = useState(false);

  const connect = async () => {
    setLoading(true);
    try {
      const state = crypto.randomUUID();
      sessionStorage.setItem(STATE_KEY, state);
      const { data, error } = await supabase.functions.invoke('paypal-connect', {
        body: { action: 'authorize_url', redirect_uri: paypalConnectRedirectUri(), state },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No authorization URL returned');
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not start PayPal connect');
      setLoading(false);
    }
  };

  return (
    <Button onClick={connect} disabled={loading} className="w-full bg-[#003087] hover:bg-[#00256b] text-white">
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
      Connect with PayPal
    </Button>
  );
}
