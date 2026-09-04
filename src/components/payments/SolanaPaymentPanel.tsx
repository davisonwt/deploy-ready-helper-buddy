import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Loader2, Copy, Check, ExternalLink, AlertTriangle, Wallet, ChevronDown, Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import type { SolanaPaymentResponse, SolanaPaymentResolution } from '@/lib/payments/solanaPaymentGate';
import { useSolanaWalletPay, type WalletPayError } from '@/hooks/useSolanaWalletPay';
import { PHANTOM_INSTALL_URL, isMobileDevice } from '@/lib/payments/solanaWallet';
import { cn } from '@/lib/utils';

interface CheckResponse {
  status: 'pending' | 'paid' | 'underpaid' | 'expired' | 'failed';
  signature: string | null;
  receivedAmountUsdc: number | null;
  amountUsdc: number;
  expiresAt: string;
}

interface SolanaPaymentPanelProps {
  payment: SolanaPaymentResponse;
  onResolved: (resolution: SolanaPaymentResolution) => void;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            toast.error('Could not copy — select and copy manually.');
          }
        }}
        className="w-full flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-left text-sm hover:bg-muted/50"
      >
        <code className="truncate">{value}</code>
        {copied ? <Check className="h-4 w-4 shrink-0 text-emerald-500" /> : <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
    </div>
  );
}

function WalletErrorPanel({
  error, onRetry, onInstall,
}: {
  error: WalletPayError;
  onRetry: () => void;
  onInstall: () => void;
}) {
  // Desktop-only in practice: on mobile the primary action is always the
  // solana: link (see the render below), which never calls pay() and so
  // never produces a 'not-installed' error in the first place.
  if (error.kind === 'not-installed') {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-center">
        <p className="text-sm">Phantom isn't installed in this browser — install it, or use the QR code below.</p>
        <Button onClick={onInstall} className="w-full gap-2">
          <ExternalLink className="h-4 w-4" />
          Install Phantom
        </Button>
      </div>
    );
  }

  // insufficient-funds now carries its full copy in error.message (it
  // names the wallet actually checked and the network -- see
  // useSolanaWalletPay), so every kind renders its own message verbatim.
  const copy: Record<Exclude<WalletPayError['kind'], 'not-installed'>, string> = {
    rejected: 'You declined the request in Phantom.',
    'insufficient-funds': error.message,
    'wrong-network': error.message,
    'simulation-failed': error.message,
    unknown: error.message,
  };

  return (
    <div className="space-y-3 rounded-lg border border-orange-500/40 bg-orange-500/10 p-4 text-center">
      <AlertTriangle className="mx-auto h-6 w-6 text-orange-500" />
      <p className="text-sm text-orange-700 dark:text-orange-300">{copy[error.kind]}</p>
      {error.detail && (
        <details className="text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Technical details
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-left text-xs text-muted-foreground">
            {error.detail}
          </pre>
        </details>
      )}
      <Button variant="outline" onClick={onRetry} className="w-full">Try again</Button>
    </div>
  );
}

function StatusRow({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm font-medium">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}

/**
 * The Solana USDC payment screen. Primary path splits by device: desktop
 * signs and sends directly from the Phantom extension (or another
 * Wallet-Standard extension) with one click; mobile hands off to a plain
 * `solana:` link instead -- the OS/Phantom handles that URI scheme
 * natively as a payment request, amount/recipient/reference pre-filled,
 * no in-page wallet connection needed (and no "browse" deep-link, which
 * opens the site fresh inside Phantom's in-app browser with no session).
 * Fallback, collapsed by default: the QR/manual-copy path for paying from
 * a different device. All paths embed the same Solana Pay reference, so
 * check-solana-payment's polling below (unchanged) finds any of them
 * identically.
 */
export default function SolanaPaymentPanel({ payment, onResolved }: SolanaPaymentPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<CheckResponse['status']>('pending');
  const [receivedAmountUsdc, setReceivedAmountUsdc] = useState<number | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    Math.max(0, Math.floor((new Date(payment.expiresAt).getTime() - Date.now()) / 1000)),
  );
  const resolvedRef = useRef(false);

  const poll = useCallback(async () => {
    if (resolvedRef.current) return;
    try {
      const data = await invokePaymentFunction<CheckResponse>('check-solana-payment', {
        intentId: payment.intentId,
      });
      setStatus(data.status);
      setReceivedAmountUsdc(data.receivedAmountUsdc);
      if (data.status === 'paid') {
        resolvedRef.current = true;
        toast.success('Payment received!');
        onResolved('paid');
      } else if (data.status === 'expired') {
        resolvedRef.current = true;
        onResolved('expired');
      }
    } catch (err) {
      // A transient check failure (RPC hiccup, etc.) — stay pending and
      // let the next 5s poll try again. The cron sweep is the backstop
      // if the buyer closes the tab entirely.
      console.warn('check-solana-payment poll failed', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.intentId]);

  const handleSubmitted = useCallback(() => {
    // Phantom confirmed submission -- check right away instead of waiting
    // up to 5s for the next scheduled poll. "Paid" still only comes from
    // this same server-verified poll, never from the wallet call alone.
    poll();
  }, [poll]);

  const { phase, error, pay, reset, hasPhantom } = useSolanaWalletPay(payment, handleSubmitted);

  useEffect(() => {
    if (error?.kind === 'not-installed') setQrOpen(true);
  }, [error]);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payment.solanaPayUrl, { width: 220, margin: 1 })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch((err) => console.error('QR render failed', err));
    return () => { cancelled = true; };
  }, [payment.solanaPayUrl]);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((new Date(payment.expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(tick);
  }, [payment.expiresAt]);

  useEffect(() => {
    let cancelled = false;
    const loop = async () => {
      if (cancelled) return;
      await poll();
    };
    loop();
    const interval = setInterval(loop, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [poll]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  if (status === 'paid') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="h-7 w-7 text-emerald-500" />
        </div>
        <p className="text-lg font-semibold">Payment confirmed</p>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <AlertTriangle className="h-10 w-10 text-orange-500" />
        <p className="font-semibold">This payment window expired</p>
        <p className="text-sm text-muted-foreground">No USDC was received in time. Please try again.</p>
        <Button variant="outline" onClick={() => onResolved('expired')}>Close</Button>
      </div>
    );
  }

  // Desktop-only (see WalletErrorPanel) -- opens Phantom's own install page.
  const handleInstallOrOpen = () => {
    window.open(PHANTOM_INSTALL_URL, '_blank', 'noopener,noreferrer');
  };

  const mobile = isMobileDevice();
  const walletBusy = phase === 'connecting' || phase === 'building' || phase === 'awaiting-approval' || phase === 'submitted';

  return (
    <div className="space-y-4">
      {status === 'underpaid' && (
        <div className="rounded-md border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-600 dark:text-orange-400">
          Received ${receivedAmountUsdc?.toFixed(2)} of ${payment.amountUsdc.toFixed(2)} expected — this is
          below the requested amount and hasn't been credited yet. Contact support with your wallet's
          transaction to resolve this, or send the remaining ${(payment.amountUsdc - (receivedAmountUsdc ?? 0)).toFixed(2)}.
        </div>
      )}

      <div className="rounded-xl border border-border bg-gradient-to-b from-muted/40 to-transparent p-5 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">${payment.amountUsdc.toFixed(2)} <span className="text-lg font-semibold text-muted-foreground">USDC</span></p>
      </div>

      {/* --- Primary: mobile gets a direct solana: link (the OS/Phantom
          handles it as a payment request, amount/recipient/reference
          pre-filled); desktop gets the extension connect-and-sign flow. --- */}
      {mobile ? (
        <a href={payment.solanaPayUrl}>
          <Button size="lg" className="w-full gap-2 text-base">
            <Wallet className="h-5 w-5" />
            Pay ${payment.amountUsdc.toFixed(2)} USDC in Phantom
          </Button>
        </a>
      ) : phase === 'error' && error ? (
        <WalletErrorPanel error={error} onRetry={reset} onInstall={handleInstallOrOpen} />
      ) : !hasPhantom ? (
        <WalletErrorPanel
          error={{ kind: 'not-installed', message: '' }}
          onRetry={reset}
          onInstall={handleInstallOrOpen}
        />
      ) : phase === 'connecting' ? (
        <StatusRow text="Connecting to Phantom…" />
      ) : phase === 'building' ? (
        <StatusRow text="Preparing transaction…" />
      ) : phase === 'awaiting-approval' ? (
        <StatusRow text="Approve in Phantom…" />
      ) : phase === 'submitted' ? (
        <StatusRow text="Confirming on Solana…" />
      ) : (
        <Button size="lg" onClick={pay} disabled={walletBusy} className="w-full gap-2 text-base">
          <Wallet className="h-5 w-5" />
          Pay ${payment.amountUsdc.toFixed(2)} USDC with Phantom
        </Button>
      )}

      {/* --- Secondary: QR / manual copy for paying from another device --- */}
      <Collapsible open={qrOpen} onOpenChange={setQrOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-1.5"><Smartphone className="h-4 w-4" /> Paying from another device?</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', qrOpen && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="flex flex-col items-center gap-2">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Scan to pay with your Solana wallet" className="rounded-md border border-border" width={220} height={220} />
            ) : (
              <div className="flex h-[220px] w-[220px] items-center justify-center rounded-md border border-border bg-muted/30">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <p className="text-sm text-muted-foreground">Scan with Phantom or any Solana Pay wallet</p>
          </div>

          <div className="space-y-3">
            <CopyField label="Amount (USDC)" value={payment.amountUsdc.toFixed(2)} />
            <CopyField label="Send to this address" value={payment.hotWalletAddress} />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Send exactly this amount of USDC on Solana — the reference embedded in the QR code is how we
            find your payment.
          </p>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Watching for your payment…
        </span>
        <span>{secondsLeft > 0 ? `Expires in ${minutes}:${seconds.toString().padStart(2, '0')}` : 'Expiring…'}</span>
      </div>

      <Button variant="ghost" className="w-full" onClick={() => onResolved('cancelled')} disabled={walletBusy}>
        Cancel
      </Button>
    </div>
  );
}
