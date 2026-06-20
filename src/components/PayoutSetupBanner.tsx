import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Visible nudge for existing users who signed up before payout setup existed.
 * Shows when the signed-in user's profile has `payout_setup_complete = false`.
 * Dismissal is persisted in localStorage (per browser).
 *
 * Mirrors the layout/behavior of NotificationBanner so the two stack nicely.
 */
export const PayoutSetupBanner = () => {
  const { user } = useAuth() as any;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('payout-setup-banner-dismissed');
    setDismissed(wasDismissed === 'true');
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('payout-setup-banner-dismissed', 'true');
  };

  // Only show for signed-in users whose profile says payout setup is incomplete.
  // We read straight from the user object (profile fields are merged in useAuth).
  if (!user || user.payout_setup_complete === true || dismissed) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 max-w-md shadow-lg border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              Set up your payout method
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Bestowals you receive have nowhere to go until you pick how you want to be paid.
              Choose NOWPayments (≈ 0.4–1% fee) or PayPal (≈ 5.7–8% fee). You pay the fee, not Sow2Grow.
            </p>
            <div className="flex gap-2">
              <Button
                asChild
                size="sm"
                className="flex-1"
                onClick={handleDismiss}
              >
                <Link to="/onboarding/payout">Set it up</Link>
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayoutSetupBanner;
