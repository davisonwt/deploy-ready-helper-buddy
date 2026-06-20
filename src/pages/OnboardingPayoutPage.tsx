import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PAYOUT_PROVIDERS } from '@/lib/payments/providerFees';
import PayoutSettingsPage from '@/pages/PayoutSettingsPage';

/**
 * Onboarding step shown right after security questions.
 *
 * Wraps the existing PayoutSettingsPage with intro copy explaining the
 * per-transaction cost ranges (paid by the user, not by Sow2Grow), and
 * a Continue / Skip footer. Skipping is allowed — the existing-user
 * banner will keep nudging until they finish.
 */
export default function OnboardingPayoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth() as any;
  const [checking, setChecking] = useState(true);
  const [alreadyComplete, setAlreadyComplete] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user?.id) {
      navigate('/login', { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('payout_setup_complete')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.payout_setup_complete) {
        setAlreadyComplete(true);
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, navigate, user?.id]);

  if (loading || checking) return null;

  const goDashboard = () => navigate('/dashboard', { replace: true });

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="container max-w-3xl space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Wallet className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">How do you want to be paid?</CardTitle>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
              When someone bestows on your seeds, the money is routed through one of two
              processors. <strong>You pay the processor fee, not Sow2Grow.</strong> Pick whichever
              suits you — you can change it any time.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {PAYOUT_PROVIDERS.map((p) => (
                <div
                  key={p.id}
                  className="rounded-md border p-3 bg-muted/30 text-sm"
                >
                  <div className="font-semibold mb-1">{p.label}</div>
                  <div className="text-xs text-muted-foreground mb-2">{p.note}</div>
                  <div className="text-xs text-muted-foreground">{p.explainer}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reuse the full settings page so the actual add-wallet UX is identical. */}
        <PayoutSettingsPage />

        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button variant="ghost" onClick={goDashboard}>
            {alreadyComplete ? 'Done' : 'Skip for now'}
          </Button>
          <Button onClick={goDashboard}>
            Continue to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
