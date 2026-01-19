import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Book, Truck, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BookCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: {
    id: string;
    title: string;
    bestowal_value: number;
    sower_id: string;
    cover_image_url?: string | null;
    image_urls?: string[];
  };
}

interface ShippingFormData {
  full_name: string;
  email: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  delivery_notes: string;
}

const emptyShippingForm: ShippingFormData = {
  full_name: '',
  email: '',
  phone: '',
  street_address: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  delivery_notes: '',
};

export default function BookCheckoutModal({ isOpen, onClose, book }: BookCheckoutModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<ShippingFormData>(emptyShippingForm);
  const [isProcessing, setIsProcessing] = useState(false);

  const basePrice = book.bestowal_value || 0;
  const tithingAmount = basePrice * 0.10;
  const adminFee = basePrice * 0.05;
  const totalAmount = basePrice * 1.15;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const required = ['full_name', 'email', 'street_address', 'city', 'state', 'postal_code', 'country'] as const;
    for (const field of required) {
      if (!formData[field].trim()) {
        toast({
          title: 'Missing information',
          description: `Please fill in ${field.replace('_', ' ')}`,
          variant: 'destructive',
        });
        return false;
      }
    }
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Please log in to continue', variant: 'destructive' });
      return;
    }
    if (!validateForm()) return;

    setIsProcessing(true);
    try {
      // Create book order record
      const { data: bookOrder, error: orderError } = await supabase
        .from('book_orders')
        .insert({
          book_id: book.id,
          bestower_id: user.id,
          sower_id: book.sower_id,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          street_address: formData.street_address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
          delivery_notes: formData.delivery_notes || null,
          bestowal_amount: basePrice,
          tithing_amount: tithingAmount,
          admin_fee: adminFee,
          total_amount: totalAmount,
          payment_status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create payment via NOWPayments
      const idempotencyKey = `book_${bookOrder.id}_${Date.now()}`;
      const response = await supabase.functions.invoke('create-nowpayments-order', {
        body: {
          amount: totalAmount,
          paymentType: 'product',
          currency: 'USD',
          message: `Book order: ${book.title}`,
          productItems: [{
            id: book.id,
            title: book.title,
            price: totalAmount,
            sower_id: book.sower_id,
          }],
        },
        headers: {
          'x-idempotency-key': idempotencyKey,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create payment');
      }

      const paymentData = response.data;
      if (!paymentData.success || !paymentData.invoiceUrl) {
        throw new Error('Failed to create payment invoice');
      }

      // Update book order with payment reference
      await supabase
        .from('book_orders')
        .update({ payment_reference: paymentData.invoiceId })
        .eq('id', bookOrder.id);

      toast({
        title: 'Redirecting to payment...',
        description: 'Complete your payment to finalize the order',
      });

      // Redirect to payment page
      window.location.href = paymentData.invoiceUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const coverImage = book.image_urls?.[0] || book.cover_image_url;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Book className='w-5 h-5' />
            Bestow for "{book.title}"
          </DialogTitle>
        </DialogHeader>

        <div className='grid md:grid-cols-2 gap-6'>
          {/* Book Summary */}
          <div className='space-y-4'>
            {coverImage && (
              <img
                src={coverImage}
                alt={book.title}
                className='w-full max-w-[200px] mx-auto rounded-lg shadow-lg'
              />
            )}
            <div className='p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg'>
              <h3 className='font-semibold mb-2 flex items-center gap-2'>
                <CreditCard className='w-4 h-4' />
                Order Summary
              </h3>
              <div className='space-y-1 text-sm'>
                <div className='flex justify-between'>
                  <span>Base price:</span>
                  <span>${basePrice.toFixed(2)}</span>
                </div>
                <div className='flex justify-between text-muted-foreground'>
                  <span>Tithing (10%):</span>
                  <span>${tithingAmount.toFixed(2)}</span>
                </div>
                <div className='flex justify-between text-muted-foreground'>
                  <span>Admin fee (5%):</span>
                  <span>${adminFee.toFixed(2)}</span>
                </div>
                <hr className='my-2 border-border' />
                <div className='flex justify-between font-bold text-lg'>
                  <span>Total:</span>
                  <span className='text-primary'>${totalAmount.toFixed(2)} USDC</span>
                </div>
              </div>
            </div>
            <div className='p-3 bg-muted/50 rounded-lg flex items-start gap-2'>
              <Truck className='w-5 h-5 text-muted-foreground mt-0.5' />
              <div>
                <p className='text-sm font-medium'>Physical Delivery</p>
                <p className='text-xs text-muted-foreground'>
                  Book will be shipped to your address after payment confirmation
                </p>
              </div>
            </div>
          </div>

          {/* Shipping Form */}
          <form onSubmit={handleSubmit} className='space-y-4'>
            <h3 className='font-semibold flex items-center gap-2'>
              <Truck className='w-4 h-4' />
              Shipping Details
            </h3>

            <div>
              <Label htmlFor='full_name'>Full Name *</Label>
              <Input
                id='full_name'
                name='full_name'
                value={formData.full_name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <Label htmlFor='email'>Email *</Label>
              <Input
                id='email'
                name='email'
                type='email'
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <Label htmlFor='phone'>Phone</Label>
              <Input
                id='phone'
                name='phone'
                type='tel'
                value={formData.phone}
                onChange={handleInputChange}
                placeholder='+1 234 567 8900'
              />
            </div>

            <div>
              <Label htmlFor='street_address'>Street Address *</Label>
              <Input
                id='street_address'
                name='street_address'
                value={formData.street_address}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <Label htmlFor='city'>City *</Label>
                <Input
                  id='city'
                  name='city'
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor='state'>State/Province *</Label>
                <Input
                  id='state'
                  name='state'
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <Label htmlFor='postal_code'>Postal Code *</Label>
                <Input
                  id='postal_code'
                  name='postal_code'
                  value={formData.postal_code}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor='country'>Country *</Label>
                <Input
                  id='country'
                  name='country'
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor='delivery_notes'>Delivery Notes</Label>
              <Textarea
                id='delivery_notes'
                name='delivery_notes'
                value={formData.delivery_notes}
                onChange={handleInputChange}
                placeholder='Gate code, special instructions, etc.'
                rows={2}
              />
            </div>

            <div className='flex gap-3 pt-4'>
              <Button type='button' variant='outline' onClick={onClose} className='flex-1'>
                Cancel
              </Button>
              <Button type='submit' disabled={isProcessing || !user} className='flex-1'>
                {isProcessing ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Processing...
                  </>
                ) : (
                  <>Pay ${totalAmount.toFixed(2)} USDC</>
                )}
              </Button>
            </div>

            {!user && (
              <p className='text-sm text-destructive text-center'>
                Please log in to complete your order
              </p>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
