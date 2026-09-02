import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2, Copy, Check, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import type { SolanaPaymentResponse, SolanaPaymentResolution } from '@/lib/payments/solanaPaymentGate';

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

/**
 * The QR/deep-link/poll screen for a direct Solana USDC payment. Renders
 * inside SolanaPaymentHost's dialog (imperative flow via
 * presentSolanaPayment) but takes plain props so it could also be embedded
 * directly by a future call site that wants it inline instead.
 */
export default function SolanaPaymentPanel({ payment, onResolved }: SolanaPaymentPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<CheckResponse['status']>('pending');
  const [receivedAmountUsdc, setReceivedAmountUsdc] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    Math.max(0, Math.floor((new Date(payment.expiresAt).getTime() - Date.now()) / 1000)),
  );
  const resolvedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payment.solanaPayUrl, { width: 240, margin: 1 })
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
    const poll = async () => {
      if (cancelled || resolvedRef.current) return;
      try {
        const data = await invokePaymentFunction<CheckResponse>('check-solana-payment', {
          intentId: payment.intentId,
        });
        if (cancelled) return;
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
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.intentId]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  if (status === 'paid') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Check className="h-10 w-10 text-emerald-500" />
        <p className="font-semibold">Payment confirmed</p>
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

  return (
    <div className="space-y-4">
      {status === 'underpaid' && (
        <div className="rounded-md border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-600 dark:text-orange-400">
          Received ${receivedAmountUsdc?.toFixed(2)} of ${payment.amountUsdc.toFixed(2)} expected — this is
          below the requested amount and hasn't been credited yet. Contact support with your wallet's
          transaction to resolve this, or send the remaining ${(payment.amountUsdc - (receivedAmountUsdc ?? 0)).toFixed(2)}.
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="Scan to pay with your Solana wallet" className="rounded-md border border-border" width={240} height={240} />
        ) : (
          <div className="flex h-[240px] w-[240px] items-center justify-center rounded-md border border-border bg-muted/30">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <p className="text-sm text-muted-foreground">Scan with Phantom or any Solana Pay wallet</p>
      </div>

      <a href={payment.solanaPayUrl} className="block sm:hidden">
        <Button className="w-full gap-2">
          <ExternalLink className="h-4 w-4" /> Open in Phantom
        </Button>
      </a>

      <div className="space-y-3">
        <CopyField label="Amount (USDC)" value={payment.amountUsdc.toFixed(2)} />
        <CopyField label="Send to this address" value={payment.hotWalletAddress} />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Send exactly this amount of USDC on Solana — the reference embedded in the QR code is how we
        find your payment. This screen updates automatically once it arrives.
      </p>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Watching for your payment…
        </span>
        <span>{secondsLeft > 0 ? `Expires in ${minutes}:${seconds.toString().padStart(2, '0')}` : 'Expiring…'}</span>
      </div>

      <Button variant="ghost" className="w-full" onClick={() => onResolved('cancelled')}>
        Cancel
      </Button>
    </div>
  );
}
