import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

type VerifyState = 'checking' | 'success' | 'pending' | 'failed' | 'error';

/**
 * Landing page for Paystack's checkout callback_url
 * (initializePaystackTransaction always sends the buyer back here).
 * paystack-webhook is the authoritative finalizer -- this page's call to
 * paystack-verify is only a recovery/confirmation step for the small window
 * where the webhook hasn't landed yet by the time the buyer's browser
 * returns, same role capture-paypal-order plays for the PayPal rail.
 *
 * No session assumed (guest invoice payers have none) -- public, no
 * ProtectedRoute, same as PublicPayPage.
 */
export default function PaystackReturnPage() {
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref');
  const [state, setState] = useState<VerifyState>('checking');

  useEffect(() => {
    if (!reference) {
      setState('error');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack-verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ reference }),
        });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState('error');
          return;
        }
        if (body.status === 'success') {
          setState('success');
        } else if (body.status === 'failed' || body.status === 'abandoned') {
          setState('failed');
        } else {
          setState('pending');
        }
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [reference]);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-6">
      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Card / EFT payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {state === 'checking' && (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Confirming your payment…</p>
            </>
          )}
          {state === 'success' && (
            <>
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="text-sm">Payment confirmed. Thank you!</p>
            </>
          )}
          {state === 'pending' && (
            <>
              <HelpCircle className="mx-auto h-8 w-8 text-amber-500" />
              <p className="text-sm text-muted-foreground">
                Still processing — this usually confirms within a minute. You can safely close this page; it will update on its own.
              </p>
            </>
          )}
          {(state === 'failed' || state === 'error') && (
            <>
              <XCircle className="mx-auto h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">
                {state === 'failed' ? 'This payment did not go through.' : "We couldn't confirm this payment — if you were charged, it will still be picked up automatically."}
              </p>
            </>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link to="/">Back to Sow2Grow</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
