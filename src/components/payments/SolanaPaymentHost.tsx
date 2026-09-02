import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SolanaPaymentPanel from './SolanaPaymentPanel';
import { registerSolanaPaymentGate, type SolanaPaymentRequest } from '@/lib/payments/solanaPaymentGate';

/**
 * Mounted once, at the app root (see App.tsx). Listens for
 * presentSolanaPayment() calls from anywhere in the app and renders the
 * QR/deep-link/poll screen in a dialog on top of whatever the buyer was
 * already doing.
 */
export default function SolanaPaymentHost() {
  const [request, setRequest] = useState<SolanaPaymentRequest | null>(null);

  useEffect(() => registerSolanaPaymentGate(setRequest), []);

  return (
    <Dialog open={!!request} onOpenChange={(open) => { if (!open) request?.resolve('cancelled'); }}>
      <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Pay with USDC (Solana)</DialogTitle>
        </DialogHeader>
        {request && <SolanaPaymentPanel payment={request.payment} onResolved={request.resolve} />}
      </DialogContent>
    </Dialog>
  );
}
