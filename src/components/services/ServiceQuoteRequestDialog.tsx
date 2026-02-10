import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zodResolver';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  service_needed: z.string().min(1, 'Please select a service'),
  location: z.string().min(2, 'Please enter your location'),
  job_description: z.string().min(10, 'Please describe the job in more detail'),
  preferred_date: z.string().optional(),
  preferred_time: z.string().optional(),
  urgency: z.string().default('normal'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ServiceProvider {
  id: string;
  full_name: string;
  services_offered: string[];
  custom_services?: string[];
}

interface ServiceQuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: ServiceProvider;
}

const ServiceQuoteRequestDialog: React.FC<ServiceQuoteRequestDialogProps> = ({
  open,
  onOpenChange,
  provider
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allServices = [...provider.services_offered, ...(provider.custom_services || [])];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service_needed: '',
      location: '',
      job_description: '',
      preferred_date: '',
      preferred_time: '',
      urgency: 'normal',
      notes: '',
    }
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error('Please log in to request a quote');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('service_quote_requests')
        .insert({
          provider_id: provider.id,
          requester_id: user.id,
          service_needed: data.service_needed,
          location: data.location,
          job_description: data.job_description,
          preferred_date: data.preferred_date || null,
          preferred_time: data.preferred_time || null,
          urgency: data.urgency,
          notes: data.notes || null,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Quote request sent! The provider will respond soon.');
      onOpenChange(false);
      form.reset();

      // Optionally trigger notification to provider
      try {
        await supabase.functions.invoke('notify-service-quote-request', {
          body: {
            providerId: provider.id,
            requesterName: user.email,
            service: data.service_needed
          }
        });
      } catch (notifyError) {
        // Silent fail for notification - request was still created
        console.log('Notification skipped:', notifyError);
      }

    } catch (error: any) {
      console.error('Error sending quote request:', error);
      toast.error(error.message || 'Failed to send quote request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Quote from {provider.full_name}</DialogTitle>
          <DialogDescription>
            Describe what you need and the provider will send you a quote.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="service_needed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Needed *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allServices.map(service => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Location *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 123 Main St, Sandton" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="job_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what you need done, any specific requirements, materials needed, etc."
                      className="min-h-[100px]"
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
                name="preferred_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Time</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="morning">Morning (6am-12pm)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12pm-5pm)</SelectItem>
                        <SelectItem value="evening">Evening (5pm-9pm)</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="urgency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urgency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low - Within a month</SelectItem>
                      <SelectItem value="normal">Normal - Within a week</SelectItem>
                      <SelectItem value="high">High - Within 2-3 days</SelectItem>
                      <SelectItem value="urgent">Urgent - ASAP</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any other details the provider should know..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Request'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceQuoteRequestDialog;
