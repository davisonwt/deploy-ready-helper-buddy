import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { CheckCircle2, Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

interface EstimateLine {
  description: string;
  quantity: number;
  unit: string | null;
  line_total: number;
}

interface PublicInvoice {
  id: string;
  number: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
  kind: 'standard' | 'deposit' | 'milestone' | 'balance';
  schedule_label: string | null;
  business_name: string | null;
  job_title: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  paid_at: string | null;
  customer_name: string | null;
  estimate_lines: EstimateLine[];
}

interface SolanaPayment {
  intentId: string;
  referencePubkey: string;
  hotWalletAddress: string;
  amountUsdc: number;
  cluster: string;
  expiresAt: string;
  solanaPayUrl: string;
}

interface PaypalPayment {
  orderId: string;
  approveUrl: string | null;
}

interface PaystackPayment {
  reference: string;
  authorization_url: string | null;
}

const S2G_FEE_RATE = 0.15;

export default function PublicPayPage() {
  const { publicToken } = useParams<{ publicToken: string }>();
  const [invoice, setInvoice] = useState<PublicInvoice | null | undefined>(undefined); // undefined = loading
  const [starting, setStarting] = useState<'solana' | 'paypal' | 'paystack' | null>(null);
  const [payment, setPayment] = useState<SolanaPayment | null>(null);
  const [paypalPayment, setPaypalPayment] = useState<PaypalPayment | null>(null);
  const [paystackPayment, setPaystackPayment] = useState<PaystackPayment | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!publicToken) return;
    const { data, error } = await supabase.rpc('get_public_invoice' as any, { _token: publicToken } as any);
    if (error || !data) {
      setInvoice(null);
      return;
    }
    setInvoice(data as unknown as PublicInvoice);
  }, [publicToken]);

  useEffect(() => { load(); }, [load]);

  // Poll while a payment attempt is live -- no Realtime for a guest (the
  // table has no anon grant, on purpose; see the migration). Stops once
  // the invoice reaches a terminal state.
  useEffect(() => {
    if (!invoice || invoice.status === 'paid' || invoice.status === 'void') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(load, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [invoice, load]);

  useEffect(() => {
    if (!payment) { setQrDataUrl(null); return; }
    QRCode.toDataURL(payment.solanaPayUrl, { width: 240, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [payment]);

  const startPayment = async (rail: 'solana' | 'paypal' | 'paystack') => {
    if (!invoice || !publicToken) return;
    setStarting(rail);
    try {
      // Paystack has its own dedicated edge function (different settlement
      // currency + local HMAC webhook verification vs PayPal's verify-API
      // round trip) -- solana/paypal stay on create-invoice-payment's
      // existing rail switch.
      const functionName = rail === 'paystack' ? 'paystack-initialize' : 'create-invoice-payment';
      const body = rail === 'paystack'
        ? { invoiceId: invoice.id, publicToken, redirectBaseUrl: window.location.origin }
        : { invoiceId: invoice.id, publicToken, rail, redirectBaseUrl: window.location.origin };
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify(body),
      });
      const resBody = await res.json();
      if (!res.ok) throw new Error(resBody?.message || resBody?.error || 'Could not start the payment');
      if (rail === 'solana') {
        setPayment(resBody.solanaPayment);
      } else if (rail === 'paystack') {
        // Paystack's hosted checkout does the rest -- the buyer comes back
        // to /pay/paystack/return, which verifies and then this page's
        // polling picks up the webhook's finalize.
        if (resBody.paystackPayment?.authorization_url) {
          window.location.href = resBody.paystackPayment.authorization_url;
        } else {
          setPaystackPayment(resBody.paystackPayment);
        }
      } else {
        // PayPal's own hosted checkout does the rest -- the buyer comes
        // straight back to this same page (return_url = /pay/:publicToken)
        // once approved, and this page's polling picks up the webhook's
        // finalize.
        if (resBody.paypalPayment?.approveUrl) {
          window.location.href = resBody.paypalPayment.approveUrl;
        } else {
          setPaypalPayment(resBody.paypalPayment);
        }
      }
    } catch (e: any) {
      alert(e?.message || 'Could not start the payment. Please try again.');
    } finally {
      setStarting(null);
    }
  };

  if (invoice === undefined) {
    return <Centered><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></Centered>;
  }
  if (invoice === null) {
    return <Centered><p className="text-muted-foreground">This invoice link isn't valid.</p></Centered>;
  }

  const feeAmount = round2(invoice.total * S2G_FEE_RATE);
  const buyerTotal = round2(invoice.total + feeAmount);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-6">
      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">
            Invoice {invoice.number}{invoice.schedule_label ? ` — ${invoice.schedule_label}` : ''}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {[invoice.business_name, invoice.job_title].filter(Boolean).join(' · ') || (invoice.customer_name ?? 'Customer')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {invoice.estimate_lines.map((l, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{l.description}{l.quantity !== 1 ? ` × ${l.quantity}` : ''}</span>
                <span>${l.line_total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border/50 bg-background/40 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${invoice.subtotal.toFixed(2)}</span></div>
            {invoice.tax_total > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${invoice.tax_total.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between font-semibold"><span>Invoice total</span><span>${invoice.total.toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Sow2Grow platform fee (15%)</span><span>${feeAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-base font-bold pt-1 border-t border-border/40"><span>You pay</span><span>${buyerTotal.toFixed(2)}</span></div>
          </div>

          {invoice.status === 'paid' && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm">Paid{invoice.paid_at ? ` on ${new Date(invoice.paid_at).toLocaleDateString()}` : ''}. Thank you!</p>
            </div>
          )}

          {invoice.status === 'void' && (
            <p className="text-sm text-muted-foreground">This invoice has been withdrawn by the sender.</p>
          )}

          {invoice.status === 'draft' && (
            <p className="text-sm text-muted-foreground">This invoice hasn't been sent yet.</p>
          )}

          {invoice.status === 'sent' && !payment && !paypalPayment && !paystackPayment && (
            <div className="space-y-2">
              <Button onClick={() => startPayment('solana')} disabled={starting !== null} className="w-full">
                {starting === 'solana' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                Pay with USDC
              </Button>
              <Button onClick={() => startPayment('paypal')} disabled={starting !== null} variant="outline" className="w-full">
                {starting === 'paypal' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Pay with PayPal
              </Button>
              <Button onClick={() => startPayment('paystack')} disabled={starting !== null} variant="outline" className="w-full">
                {starting === 'paystack' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Pay by Card / EFT
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Card and EFT payments are charged in ZAR at the live exchange rate; the processor's fee is added to your total.
              </p>
            </div>
          )}

          {invoice.status === 'sent' && payment && (
            <div className="space-y-3 text-center">
              {qrDataUrl && <img src={qrDataUrl} alt="Solana Pay QR code" className="mx-auto rounded-lg border border-border/50" />}
              <p className="text-xs text-muted-foreground break-all">{payment.solanaPayUrl}</p>
              <p className="text-xs text-muted-foreground">Scan with any Solana wallet, or open the link on your phone. This page updates on its own once payment is confirmed.</p>
            </div>
          )}

          {invoice.status === 'sent' && paypalPayment && !paypalPayment.approveUrl && (
            <p className="text-sm text-muted-foreground text-center">
              Could not open PayPal's checkout. Please try again.
            </p>
          )}

          {invoice.status === 'sent' && paystackPayment && !paystackPayment.authorization_url && (
            <p className="text-sm text-muted-foreground text-center">
              Could not open the card/EFT checkout. Please try again.
            </p>
          )}
        </CardContent>
      </Card>
      <div className="text-center">
        <Link to="/" className="text-xs text-muted-foreground underline">sow2growapp.com</Link>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[50vh] items-center justify-center px-4">{children}</div>;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
