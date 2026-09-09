import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { createCustomer, type CustomerRow } from '@/hooks/useJobInvoicing';

interface Props {
  businessId: string;
  onCreated: (customer: CustomerRow) => void;
  trigger?: React.ReactNode;
}

/**
 * Job-flow customer creation. Distinct from the older
 * CreateCustomerDialog (Books > Invoices tab) because this one checks
 * find_member_by_email so an existing S2G member is linked immediately
 * instead of waiting for the invite-token round trip on first estimate send.
 */
export default function CreateJobCustomerDialog({ businessId, onCreated, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(''); setEmail(''); setPhone(''); setAddress(''); };

  const save = async () => {
    if (!name.trim()) return toast.error('A name is required');
    if (!email.trim()) return toast.error('An email is required to send the estimate and invite');
    setSaving(true);
    try {
      const { customer, isMember } = await createCustomer(businessId, {
        name: name.trim(), email: email.trim(), phone: phone.trim() || null, address: address.trim() || null,
      });
      toast.success(isMember ? 'Customer added — already a Sow2Grow member, no invite needed' : 'Customer added — they’ll get an invite link when you send the estimate');
      onCreated(customer);
      reset();
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Could not add that customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" /> New customer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a customer</DialogTitle>
          <DialogDescription>They'll be invited to Sow2Grow chat to see and approve the estimate — no email needed on our side, they just click the link posted in chat.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="jcust-name">Name</Label>
            <Input id="jcust-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane's Cafe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jcust-email">Email</Label>
            <Input id="jcust-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jcust-phone">Phone (optional)</Label>
            <Input id="jcust-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jcust-address">Address (optional)</Label>
            <Input id="jcust-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
