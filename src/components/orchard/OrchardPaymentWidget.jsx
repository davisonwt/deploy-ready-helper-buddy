import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import QuickBestowModal from '@/components/bestow/QuickBestowModal';

// Orchard page "Support This Orchard" card. Until P0-5 Phase A this ended in
// a dead notice ("Payments are now handled via PayPal") and never opened a
// checkout; it now opens the shared QuickBestowModal with the pocket total
// locked, which is the one path that writes an orchard bestowal (and, once
// paid, a held orchard_holdings row).
const OrchardPaymentWidget = ({
  orchardId,
  orchardTitle,
  pocketPrice,
  availablePockets,
  productType,
  funded = false,
  released = false,
  cancelled = false,
  // P0-5 Phase D: 'launch' (sower is paid at release) or 'uplift' (S2G pays the named parties directly).
  orchardKind = 'launch',
  onBestowed,
}) => {
  const [pocketsCount, setPocketsCount] = useState(1);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const maxPockets = Math.max(0, Number(availablePockets) || 0);
  const totalAmount = pocketsCount * pocketPrice;

  const handlePocketsChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    setPocketsCount(Math.min(Math.max(1, value), Math.max(1, maxPockets)));
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-orange-600" />
            Support This Orchard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please log in to support this orchard
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="orchard-payment-widget">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-orange-600" />
          Support This Orchard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cancelled ? (
          <Alert data-testid="orchard-cancelled-alert">
            <Info className="h-4 w-4" />
            <AlertDescription>
              This orchard was cancelled. Nothing can be bestowed into it; everyone who bestowed is refunded in full.
            </AlertDescription>
          </Alert>
        ) : funded || maxPockets === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {released
                ? (orchardKind === 'uplift'
                  ? 'This Uplift orchard is fully funded and released. Sow2Grow pays the parties directly; the list above shows where the gifts went. Nothing more can be bestowed into it.'
                  : 'This orchard is fully funded and has been released to the sower. Nothing more can be bestowed into it.')
                : (orchardKind === 'uplift'
                  ? 'This Uplift orchard is fully funded. Sow2Grow will pay the parties directly. Nothing more can be bestowed into it.'
                  : 'This orchard is fully funded. Nothing more can be bestowed into it.')}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="orchard-pockets">
                Number of Pockets ({pocketPrice} USDC each)
              </label>
              <Input
                id="orchard-pockets"
                type="number"
                min="1"
                max={maxPockets}
                value={pocketsCount}
                onChange={handlePocketsChange}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Available: {maxPockets} pocket{maxPockets === 1 ? '' : 's'}
              </p>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Amount:</span>
                <span className="text-2xl font-bold">{totalAmount.toFixed(2)} USDC</span>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {orchardKind === 'uplift'
                  ? 'Your money is held for this Uplift orchard and only released once every pocket is filled; Sow2Grow then pays the parties directly and lists where the gifts went. There is no deadline. If the orchard is ever cancelled, you are refunded in full.'
                  : 'Your money is held for this orchard and only released once every pocket is filled. There is no deadline. If the orchard is ever cancelled, you are refunded in full.'}
              </AlertDescription>
            </Alert>

            <Button className="w-full" onClick={() => setOpen(true)} data-testid="orchard-bestow-button">
              <Heart className="h-4 w-4 mr-2" />
              Bestow {pocketsCount} pocket{pocketsCount === 1 ? '' : 's'}
            </Button>
          </>
        )}
      </CardContent>

      <QuickBestowModal
        open={open}
        onClose={() => setOpen(false)}
        orchardId={orchardId}
        seedTitle={orchardTitle}
        defaultAmount={totalAmount}
        pocketsCount={pocketsCount}
        lockAmount
        orchardProductType={productType}
        onSuccess={() => onBestowed?.()}
      />
    </Card>
  );
};

export default OrchardPaymentWidget;
