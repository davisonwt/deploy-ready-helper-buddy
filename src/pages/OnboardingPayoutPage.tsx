import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PayoutSettingsPage from '@/pages/PayoutSettingsPage';
import { readPendingReturn, clearPendingReturn } from '@/lib/returnTo';

/**
 * Onboarding step shown right after security questions.
 *
 * Wraps the existing PayoutSettingsPage with intro copy and a Continue /
 * Skip footer. Skipping is allowed — the existing-user banner will keep
 * nudging until they finish. Deliberately does NOT render its own
 * provider-list preview any more (it used to loop over PAYOUT_PROVIDERS
 * directly, which still includes the feature-flagged-off 'balance' entry
 * — "S2G Balance — one tap" showing up here was that loop, not a second
 * copy of the settings page) -- PayoutSettingsPage below is the one and
 * only place that explains the two active rails.
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

  // If this signup started from a shared video link (or anywhere else that
  // asked to return somewhere specific), land there instead of /dashboard —
  // this is the last stop in the mandatory onboarding chain.
  const goDashboard = () => {
    const pending = readPendingReturn();
    clearPendingReturn();
    navigate(pending || '/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="container max-w-3xl space-y-6">
        <Button variant="ghost" onClick={goDashboard} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Wallet className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">How do you want to be paid?</CardTitle>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
              A Solana wallet (USDC) or PayPal — pick whichever suits you below. You can change
              it any time.
            </p>
          </CardHeader>
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
