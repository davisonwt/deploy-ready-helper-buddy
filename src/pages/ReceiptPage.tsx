import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2, Download, Printer, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SeedLine {
  title: string;
  amount: number;
}

interface ReceiptMetadata {
  order_ref?: string;
  date?: string;
  provider?: string;
  seed_lines?: SeedLine[];
  sower_name?: string | null;
  sower_amount?: number | null;
  s2g_fee?: number | null;
  whisperer_amount?: number | null;
  whisperer_name?: string | null;
  subtotal?: number;
  processor_fee?: number;
  buyer_total?: number;
  topup_amount?: number;
}

interface Receipt {
  id: string;
  created_at: string;
  metadata: ReceiptMetadata;
}

const usd = (n: number | null | undefined) => (typeof n === 'number' ? `$${n.toFixed(2)}` : '—');

/**
 * Print-ready receipt page. orderId is the receipt's own chat_messages.id
 * (see 20260910240000_receipt_page.sql) -- the RPC enforces "payer, the
 * sower on it, or GoSat" server-side, so an unauthorized/nonexistent id
 * reads identically as "not found."
 */
export default function ReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined); // undefined = loading
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!orderId) { setReceipt(null); return; }
    let alive = true;
    supabase.rpc('get_receipt' as any, { _message_id: orderId }).then(({ data, error }) => {
      if (!alive) return;
      if (error || !data) { setReceipt(null); return; }
      setReceipt(data as unknown as Receipt);
    });
    return () => { alive = false; };
  }, [orderId]);

  const handleDownloadPdf = async () => {
    if (!receipt) return;
    setDownloading(true);
    try {
      const { buildReceiptPdf } = await import('@/lib/receipts/buildReceiptPdf');
      const doc = await buildReceiptPdf(receipt.metadata, receipt.id);
      const blobUrl = doc.output('bloburl') as unknown as string;
      // iOS Safari: opening the blob URL puts it straight into the native
      // PDF viewer, which has its own Share -> Save to Files action --
      // more reliable there than an <a download> click, which Safari
      // often just opens anyway. Desktop browsers open it in a new tab
      // too, with their own built-in "Download"/"Save as" in the viewer.
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        // Popup blocked -- fall back to jsPDF's own save (triggers a
        // normal file download on desktop; still openable via long-press
        // on iOS if Safari intercepts it as a same-tab navigation).
        doc.save(`sow2grow-receipt-${receipt.id.slice(0, 8)}.pdf`);
      }
    } catch (err) {
      console.error('receipt PDF generation failed', err);
      toast.error('Could not generate the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (receipt === undefined) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!receipt) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <UserX className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">This receipt isn't available.</p>
        <Link to="/" className="text-sm underline text-muted-foreground">Back to Sow2Grow</Link>
      </div>
    );
  }

  const m = receipt.metadata;
  const isTopup = !m.seed_lines || m.seed_lines.length === 0;
  const dateLabel = m.date ? format(new Date(m.date), 'PPP') : '';
  const providerLabel = m.provider ? m.provider.charAt(0).toUpperCase() + m.provider.slice(1) : 'processor';

  return (
    <div className="min-h-screen bg-white text-black">
      <style>{`
        @media print {
          .receipt-no-print { display: none !important; }
          body { background: #fff !important; }
          .receipt-page { box-shadow: none !important; margin: 0 !important; max-width: none !important; }
        }
      `}</style>

      <div className="receipt-no-print sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-white/95 backdrop-blur px-4 py-3">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-900">← Back</Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button onClick={handleDownloadPdf} disabled={downloading} className="gap-1.5">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </Button>
        </div>
      </div>

      <div className="receipt-page max-w-xl mx-auto bg-white px-8 py-10">
        <div className="flex items-center justify-between border-b border-gray-200 pb-6 mb-6">
          <img src="/logo.jpeg" alt="Sow2Grow" className="h-12 w-auto rounded" />
          <div className="text-right">
            <h1 className="text-lg font-bold text-gray-900">Receipt</h1>
            <p className="text-xs text-gray-500">Sow2Grow</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm mb-6">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Order</p>
            <p className="font-mono text-gray-900 break-all">{m.order_ref}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Date</p>
            <p className="text-gray-900">{dateLabel}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Provider</p>
            <p className="text-gray-900 capitalize">{providerLabel}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mb-4 flex justify-between text-base font-bold text-gray-900">
          <span>Total paid</span>
          <span>{usd(m.buyer_total)}</span>
        </div>
        {!!m.processor_fee && (
          <div className="flex justify-between text-sm text-gray-500 mb-4">
            <span>{providerLabel} processor fee</span>
            <span>{usd(m.processor_fee)}</span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          {isTopup ? (
            <div className="flex justify-between text-sm text-gray-900">
              <span>Amount credited to wallet</span>
              <span className="font-medium">{usd(m.topup_amount)}</span>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                Seed{(m.seed_lines?.length ?? 0) > 1 ? 's' : ''} — from {m.sower_name}
              </p>
              {m.seed_lines?.map((line, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-900 mb-1">
                  <span>{line.title}</span>
                  <span className="font-medium">{usd(line.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Sower receives</span>
                <span>{usd(m.sower_amount)}</span>
              </div>
              {!!m.whisperer_amount && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Whisperer share{m.whisperer_name ? ` (${m.whisperer_name})` : ''}</span>
                  <span>{usd(m.whisperer_amount)}</span>
                </div>
              )}

              <div className="border-t border-gray-200 mt-4 pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Platform fee — Sow2Grow</p>
                <div className="flex justify-between text-sm text-gray-900">
                  <span>Sow2Grow platform fee (15%)</span>
                  <span className="font-medium">{usd(m.s2g_fee)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 mt-8 pt-4 text-center text-xs text-gray-400">
          Sow2Grow · sow2growapp.com
        </div>
      </div>
    </div>
  );
}
