import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBooksBusiness } from '@/hooks/useBooksBusiness';
import { useInvoicing, createDraftInvoice, sendInvoice, computeInvoiceTotalsFromLines, type DraftLine } from '@/hooks/useInvoicing';
import { supabase } from '@/integrations/supabase/client';
import CreateCustomerDialog from '@/components/books/invoicing/CreateCustomerDialog';

interface SavedItem {
  id: string;
  name: string;
  unit_price: number;
  unit: string | null;
}

export default function InvoiceBuilderPage() {
  const navigate = useNavigate();
  const { current, loading: bizLoading } = useBooksBusiness();
  const { customers, createCustomer, reload } = useInvoicing(current?.id ?? null);

  const [customerId, setCustomerId] = useState<string>('');
  const [lines, setLines] = useState<DraftLine[]>([
    { description: '', quantity: 1, unit: null, unit_price: 0, taxable: false, tax_rate_percent: 0, books_item_id: null },
  ]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    if (!current?.id) return;
    supabase
      .from('books_items' as any)
      .select('id, name, unit_price, unit')
      .eq('business_id', current.id)
      .eq('active', true)
      .in('kind', ['service', 'material'])
      .then(({ data }) => setSavedItems(((data as any[]) ?? []) as SavedItem[]));
  }, [current?.id]);

  const totals = useMemo(() => computeInvoiceTotalsFromLines(lines), [lines]);

  const updateLine = (i: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };
  const addLine = () => setLines((prev) => [...prev, { description: '', quantity: 1, unit: null, unit_price: 0, taxable: false, tax_rate_percent: 0, books_item_id: null }]);
  const removeLine = (i: number) => setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  const addSavedItem = (item: SavedItem) => {
    setLines((prev) => [...prev, { description: item.name, quantity: 1, unit: item.unit, unit_price: item.unit_price, taxable: false, tax_rate_percent: 0, books_item_id: item.id }]);
  };

  const send = async () => {
    if (!current?.id) return;
    if (!customerId) return toast.error('Choose a customer');
    const cleanLines = lines.filter((l) => l.description.trim() && l.quantity > 0);
    if (cleanLines.length === 0) return toast.error('Add at least one line');
    setSaving(true);
    try {
      const { invoiceId } = await createDraftInvoice(current.id, customerId, cleanLines, notes.trim() || null);
      await sendInvoice(invoiceId);
      toast.success('Invoice sent');
      navigate(`/books/invoices/${invoiceId}`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not send the invoice');
    } finally {
      setSaving(false);
    }
  };

  if (bizLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Loading…</div>;
  }
  if (!current) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-muted-foreground">Set up a business in your profile first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/books')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Books
      </Button>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="text-base">New invoice</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <div className="flex gap-2">
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Choose a customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CreateCustomerDialog
                onCreate={createCustomer}
                onCreated={(c) => { setCustomerId(c.id); reload(); }}
              />
            </div>
          </div>

          {savedItems.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Add a saved item</Label>
              <div className="flex flex-wrap gap-2">
                {savedItems.map((item) => (
                  <Button key={item.id} type="button" variant="outline" size="sm" onClick={() => addSavedItem(item)}>
                    {item.name} · ${item.unit_price.toFixed(2)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Lines</Label>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_90px_auto] items-end gap-2">
                <div className="space-y-1">
                  {i === 0 && <Label className="text-[11px] text-muted-foreground">Description</Label>}
                  <Input value={line.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="What was done" />
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-[11px] text-muted-foreground">Qty</Label>}
                  <Input inputMode="decimal" value={line.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-[11px] text-muted-foreground">Rate</Label>}
                  <Input inputMode="decimal" value={line.unit_price} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) || 0 })} />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-2 h-4 w-4" /> Add line
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-notes">Notes to customer (optional)</Label>
            <Textarea id="inv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="rounded-lg border border-border/50 bg-background/40 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${totals.taxTotal.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>${totals.total.toFixed(2)}</span></div>
            <p className="text-xs text-muted-foreground pt-1">The customer pays this total plus Sow2Grow's 15% fee, shown separately on their pay page.</p>
          </div>

          <Button onClick={send} disabled={saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send invoice
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
