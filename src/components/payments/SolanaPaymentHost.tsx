import { lazy, Suspense, useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Loader2, X } from 'lucide-react';
import { DialogPortal, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import { registerSolanaPaymentGate, type SolanaPaymentRequest } from '@/lib/payments/solanaPaymentGate';

// @solana/web3.js + @solana/spl-token (pulled in by SolanaPaymentPanel via
// useSolanaWalletPay/solanaWallet.ts) add ~300KB to whatever bundle they
// land in -- this Host is mounted unconditionally at the app root (App.tsx)
// so every page load would otherwise pay that cost even for visitors who
// never make a Solana payment. Lazy-loading only the Panel (not this Host)
// keeps presentSolanaPayment()'s listener registration cheap and always
// present at app root -- no race with the gate's "no listener yet ->
// resolve('cancelled')" fallback -- while the heavy libraries only
// download the first time a payment screen actually opens.
const SolanaPaymentPanel = lazy(() => import('./SolanaPaymentPanel'));

/**
 * Mounted once, at the app root (see App.tsx). Listens for
 * presentSolanaPayment() calls from anywhere in the app and renders the
 * payment screen on top of whatever the buyer was already doing.
 *
 * Rolls its own DialogPrimitive.Content instead of the shared
 * DialogContent -- this screen needs materially different sizing (a real
 * full-screen sheet below `sm`, a height-capped-with-internal-scroll card
 * above it) that the shared component's fixed centered-modal classes
 * aren't built for, and fighting those with extra override classes at the
 * same breakpoint is unreliable (same-specificity Tailwind utilities, no
 * guaranteed cascade order).
 */
export default function SolanaPaymentHost() {
  const [request, setRequest] = useState<SolanaPaymentRequest | null>(null);

  useEffect(() => registerSolanaPaymentGate(setRequest), []);

  return (
    <DialogPrimitive.Root
      open={!!request}
      onOpenChange={(open) => { if (!open) request?.resolve('cancelled'); }}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed inset-0 z-50 flex flex-col bg-background
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
            sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-sm
            sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85vh]
            sm:rounded-xl sm:border sm:border-border sm:shadow-2xl
            sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95
            sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]
            sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]"
        >
          <div className="safe-top flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <DialogTitle className="text-base font-semibold">Pay with USDC (Solana)</DialogTitle>
            <DialogPrimitive.Close className="rounded-full p-1.5 text-muted-foreground opacity-70 transition-opacity hover:bg-muted hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          <div className="safe-bottom min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {request && (
              <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <SolanaPaymentPanel payment={request.payment} onResolved={request.resolve} />
              </Suspense>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
