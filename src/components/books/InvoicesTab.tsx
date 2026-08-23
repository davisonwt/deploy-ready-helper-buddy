import { useState } from 'react';
import { toast } from 'sonner';
import { Send, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useBooksCurrency } from '@/lib/books/currency';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { BooksItemRow, InvoiceRow } from '@/hooks/useBooksData';

interface Props {
  businessId: string;
  invoices: InvoiceRow[];
  items: BooksItemRow[];
  onChanged: () => void;
}

const statusStyles: Record<InvoiceRow['status'], string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  sent: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
};

export default function InvoicesTab({ businessId, invoices, items, onChanged }: Props) {
  const { fmt, currency, symbol } = useBooksCurrency();
  const [client, setClient] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [itemId, setItemId] = useState('__none');
  const [saving, setSaving] = useState(false);


  const create = async (status: 'draft' | 'sent') => {
    const value = Number(amount);
    if (!client.trim()) return toast.error('Client name is required');
    if (!Number.isFinite(value) || value <= 0) return toast.error('Enter a valid amount');
    setSaving(true);
    const { error } = await supabase.from('invoices' as any).insert({
      business_id: businessId,
      client_name: client.trim(),
      amount: value,
      currency: currency,
      status,
      due_date: dueDate || null,
      notes: notes.trim() || null,
      item_id: itemId === '__none' ? null : itemId,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(status === 'sent' ? 'Invoice created and marked sent' : 'Draft invoice saved');
    setClient('');
    setAmount('');
    setDueDate('');
    setNotes('');
    setItemId('__none');
    onChanged();
  };

  const markPaid = async (inv: InvoiceRow) => {
    const { error } = await supabase
      .from('invoices' as any)
      .update({ status: 'paid', paid_at: new Date().toISOString() } as any)
      .eq('id', inv.id);
    if (error) return toast.error(error.message);
    toast.success(`${inv.client_name} marked paid`);
    onChanged();
  };

  const markSent = async (inv: InvoiceRow) => {
    const { error } = await supabase.from('invoices' as any).update({ status: 'sent' } as any).eq('id', inv.id);
    if (error) return toast.error(error.message);
    onChanged();
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Create &amp; send an invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Catalog item (optional)</Label>
            <Select
              value={itemId}
              onValueChange={(v) => {
                setItemId(v);
                const it = items.find((i) => i.id === v);
                if (it) {
                  if (!amount) setAmount(String(it.unit_price));
                  if (!notes) setNotes(it.name);
                }
              }}
            >
              <SelectTrigger><SelectValue placeholder="No item — free-form invoice" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__none">No item</SelectItem>
                {items.map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    {it.name} · {fmt(it.unit_price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-client">Client</Label>
              <Input id="inv-client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client or company" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-amount">Amount ({currency})</Label>
              <Input id="inv-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-due">Due date</Label>
              <Input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-notes">Notes</Label>
            <Textarea id="inv-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What is this invoice for?" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => create('sent')} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Create &amp; send
            </Button>
            <Button variant="outline" onClick={() => create('draft')} disabled={saving}>
              Save as draft
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
          {invoices.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{inv.client_name}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(inv.amount)}
                  {inv.due_date ? ` · due ${new Date(inv.due_date).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`uppercase ${statusStyles[inv.status]}`}>{inv.status}</Badge>
                {inv.status === 'draft' && (
                  <Button size="sm" variant="outline" onClick={() => markSent(inv)}>Mark sent</Button>
                )}
                {inv.status !== 'paid' && (
                  <Button size="sm" onClick={() => markPaid(inv)}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark paid
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
