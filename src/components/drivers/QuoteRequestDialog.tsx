import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zodResolver';
import { z } from 'zod';
import { CalendarIcon, Loader2, MapPin, Package, Clock } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Driver {
  id: string;
  full_name: string;
  vehicle_type: string;
  city?: string;
  country?: string;
}

interface QuoteRequestDialogProps {
  driver: Driver;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  pickupLocation: z.string().min(5, 'Please provide a pickup location').max(200),
  dropoffLocation: z.string().min(5, 'Please provide a dropoff location').max(200),
  itemDescription: z.string().min(10, 'Please describe what needs to be transported').max(500),
  preferredDate: z.date().optional(),
  preferredTime: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

const timeSlots = ['Morning', 'Afternoon', 'Evening', 'Flexible'] as const;

const QuoteRequestDialog: React.FC<QuoteRequestDialogProps> = ({
  driver,
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pickupLocation: '',
      dropoffLocation: '',
      itemDescription: '',
      preferredTime: 'Flexible',
      notes: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error('You must be logged in to request a quote');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('driver_quote_requests').insert({
        driver_id: driver.id,
        requester_id: user.id,
        pickup_location: data.pickupLocation.trim(),
        dropoff_location: data.dropoffLocation.trim(),
        item_description: data.itemDescription.trim(),
        preferred_date: data.preferredDate ? format(data.preferredDate, 'yyyy-MM-dd') : null,
        preferred_time: data.preferredTime || 'Flexible',
        notes: data.notes?.trim() || null,
        status: 'pending',
      });

      if (error) throw error;

      // Try to notify driver via edge function
      try {
        await supabase.functions.invoke('notify-quote-request', {
          body: {
            driverName: driver.full_name,
            requesterEmail: user.email,
            pickupLocation: data.pickupLocation,
            dropoffLocation: data.dropoffLocation,
          },
        });
      } catch (emailError) {
        console.warn('Email notification failed:', emailError);
      }

      toast.success('Quote request sent! The driver will respond soon.');
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Quote request error:', error);
      toast.error(error.message || 'Failed to send quote request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request a Quote from {driver.full_name}</DialogTitle>
          <DialogDescription>
            {driver.vehicle_type} driver{driver.city && ` in ${driver.city}`}
            {driver.country && `, ${driver.country}`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pickupLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Pickup Location *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Full address or area for pickup" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dropoffLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Dropoff Location *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Full address or area for delivery" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    What needs to be transported? *
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the items, size, weight, and any special handling requirements..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="preferredDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Preferred Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Preferred Time
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any other information the driver should know..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Special instructions, access codes, contact preferences, etc.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Quote Request'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteRequestDialog;
