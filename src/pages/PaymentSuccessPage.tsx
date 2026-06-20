import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { launchConfetti, floatingScore, playSoundEffect } from '@/utils/confetti';

type BasketStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bestowalId = useMemo(() => searchParams.get('orderId'), [searchParams]);
  const basketOrderId = useMemo(() => searchParams.get('basket'), [searchParams]);
  const { clearBasket } = useProductBasket();

  const [basketStatus, setBasketStatus] = useState<BasketStatus | null>(null);
  const [basketTotal, setBasketTotal] = useState<number | null>(null);
  const celebratedRef = useRef(false);

  // Poll basket_orders.status until completed/failed/expired
  useEffect(() => {
    if (!basketOrderId) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60; // ~3 minutes at 3s

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      const { data, error } = await supabase
        .from('basket_orders')
        .select('status, buyer_total')
        .eq('id', basketOrderId)
        .maybeSingle();

      if (!cancelled && data) {
        setBasketStatus(data.status as BasketStatus);
        if (data.buyer_total != null) setBasketTotal(Number(data.buyer_total));
        if (data.status === 'completed' && !celebratedRef.current) {
          celebratedRef.current = true;
          try { clearBasket(); } catch { /* ignore */ }
          try { playSoundEffect('bestow', 0.7); } catch { /* ignore */ }
          try { floatingScore(Number(data.buyer_total ?? 0)); } catch { /* ignore */ }
          try { launchConfetti(); } catch { /* ignore */ }
          return; // stop polling
        }
        if (data.status === 'failed' || data.status === 'expired') {
          return; // stop polling
        }
      }
      if (!cancelled && error) console.warn('basket status poll error', error);
      if (!cancelled && attempts < maxAttempts) {
        setTimeout(tick, 3000);
      }
    };
    tick();

    return () => { cancelled = true; };
  }, [basketOrderId, clearBasket]);

  const isBasket = !!basketOrderId;
  const showProcessing = isBasket && basketStatus !== 'completed' && basketStatus !== 'failed' && basketStatus !== 'expired';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            {showProcessing ? (
              <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
            ) : (
              <CheckCircle className="h-10 w-10 text-green-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isBasket
              ? basketStatus === 'completed'
                ? 'Bestowal Complete!'
                : basketStatus === 'failed' || basketStatus === 'expired'
                ? 'Payment Not Completed'
                : 'Confirming Your Payment...'
              : 'Payment Initiated!'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          {isBasket ? (
            <>
              <p className="text-muted-foreground">
                {basketStatus === 'completed'
                  ? `Thank you! Your bestowals${basketTotal ? ` totalling $${basketTotal.toFixed(2)}` : ''} have been recorded and creators will be paid out automatically.`
                  : basketStatus === 'failed' || basketStatus === 'expired'
                  ? 'We did not receive a confirmed payment from your provider. No bestowals were recorded. You can try again from your basket.'
                  : 'We are waiting for the payment processor to confirm your transaction. This page will update automatically — no need to refresh.'}
              </p>

              <div className="bg-muted/50 p-4 rounded-lg text-sm text-left space-y-1">
                <p className="font-semibold">Reference</p>
                <p className="text-muted-foreground break-words">
                  Basket order: <span className="font-mono text-xs">{basketOrderId}</span>
                </p>
                {basketStatus && (
                  <p className="text-muted-foreground">Status: <span className="font-mono text-xs">{basketStatus}</span></p>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                Thank you for supporting this orchard. The processor is confirming your transaction and we&apos;ll distribute your bestowal automatically according to the bestowal map.
              </p>

              {bestowalId && (
                <div className="bg-muted/50 p-4 rounded-lg text-sm text-left space-y-1">
                  <p className="font-semibold">Reference</p>
                  <p className="text-muted-foreground break-words">
                    Bestowal ID: <span className="font-mono text-xs">{bestowalId}</span>
                  </p>
                </div>
              )}
            </>
          )}

          <div className="bg-muted/50 p-4 rounded-lg text-sm text-left space-y-2">
            <p className="font-semibold">Distribution Overview</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>✓ 15% → Platform Fee (s2gbestow)</li>
              <li>✓ 70% → Sower (orchard owner)</li>
              <li>✓ 15% → Product Whispers / Growers</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <ArrowRight className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
            <Button onClick={() => navigate('/wandering-directory')} variant="outline" className="w-full">
              Browse More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
