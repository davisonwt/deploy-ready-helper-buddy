import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { paypalConnectRedirectUri } from '@/components/payouts/ConnectPaypalButton';

const STATE_KEY = 'paypal_connect_state';

type Status = 'working' | 'success' | 'error';

export default function PaypalConnectedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('working');
  const [message, setMessage] = useState('Connecting your PayPal account…');
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const paypalError = searchParams.get('error');
      const expectedState = sessionStorage.getItem(STATE_KEY);
      sessionStorage.removeItem(STATE_KEY);

      if (paypalError) {
        setStatus('error');
        setMessage('PayPal declined the connection request. You can try again from Payout Settings.');
        return;
      }
      if (!code) {
        setStatus('error');
        setMessage('No authorization code came back from PayPal.');
        return;
      }
      if (!expectedState || state !== expectedState) {
        setStatus('error');
        setMessage('This connection link looks like it wasn\'t started from this browser. Please try again.');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('paypal-connect', {
          body: { action: 'callback', code, redirect_uri: paypalConnectRedirectUri() },
        });
        if (error) throw error;
        setStatus('success');
        setMessage(`Connected! Payouts will go to ${data?.email ?? 'your PayPal account'}.`);
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message ?? 'Could not finish connecting PayPal. Please try again.');
      }
    })();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center bg-muted">
            {status === 'working' && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle className="h-10 w-10 text-green-600" />}
            {status === 'error' && <XCircle className="h-10 w-10 text-destructive" />}
          </div>
          <CardTitle className="text-2xl">
            {status === 'working' ? 'Connecting PayPal…' : status === 'success' ? 'PayPal Connected' : 'Connection Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">{message}</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/settings/payouts')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Payout Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
