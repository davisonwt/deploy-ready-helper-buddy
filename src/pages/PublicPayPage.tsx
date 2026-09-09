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

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  line_total: number;
}

interface PublicInvoice {
  id: string;
  number: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
  subtotal: number;
  tax_total: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  paid_at: string | null;
  customer_name: string | null;
  line_items: LineItem[];
  pending_payment: { id: string; status: string; rail: string; amount: number } | null;
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

const S2G_FEE_RATE = 0.15;

export default function PublicPayPage() {
  const { publicToken } = useParams<{ publicToken: string }>();
  const [invoice, setInvoice] = useState<PublicInvoice | null | undefined>(undefined); // undefined = loading
  const [starting, setStarting] = useState(false);
  const [payment, setPayment] = useState<SolanaPayment | null>(null);
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

  const startPayment = async () => {
    if (!invoice || !publicToken) return;
    setStarting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-invoice-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ invoiceId: invoice.id, publicToken, rail: 'solana' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || body?.error || 'Could not start the payment');
      setPayment(body.solanaPayment);
    } catch (e: any) {
      alert(e?.message || 'Could not start the payment. Please try again.');
    } finally {
      setStarting(false);
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
          <CardTitle className="text-base">Invoice {invoice.number}</CardTitle>
          <p className="text-sm text-muted-foreground">{invoice.customer_name ?? 'Customer'}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {invoice.line_items.map((l) => (
              <div key={l.id} className="flex justify-between text-sm">
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

          {invoice.status === 'sent' && !payment && (
            <Button onClick={startPayment} disabled={starting} className="w-full">
              {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
              Pay with USDC
            </Button>
          )}

          {invoice.status === 'sent' && payment && (
            <div className="space-y-3 text-center">
              {qrDataUrl && <img src={qrDataUrl} alt="Solana Pay QR code" className="mx-auto rounded-lg border border-border/50" />}
              <p className="text-xs text-muted-foreground break-all">{payment.solanaPayUrl}</p>
              <p className="text-xs text-muted-foreground">Scan with any Solana wallet, or open the link on your phone. This page updates on its own once payment is confirmed.</p>
            </div>
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
