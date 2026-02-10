import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zodResolver';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Megaphone, Link as LinkIcon, Wallet, X, Plus, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const SPECIALTY_OPTIONS = [
  'Social Media Marketing',
  'Content Creation',
  'SEO & Analytics',
  'Video Production',
  'Copywriting',
  'Influencer Outreach',
  'Email Marketing',
  'Paid Advertising',
  'Community Building',
  'Graphic Design',
];

const whispererSchema = z.object({
  display_name: z.string().min(2, 'Display name must be at least 2 characters'),
  bio: z.string().min(20, 'Bio must be at least 20 characters').max(500, 'Bio must be under 500 characters'),
  specialties: z.array(z.string()).min(1, 'Select at least one specialty'),
  portfolio_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  social_links: z.object({
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    youtube: z.string().optional(),
    website: z.string().optional(),
  }),
  wallet_address: z.string().min(10, 'Wallet address is required for receiving payments'),
});

type WhispererFormValues = z.infer<typeof whispererSchema>;

interface WhispererProfileFormProps {
  existingProfile?: {
    id: string;
    display_name: string;
    bio: string | null;
    specialties: string[] | null;
    portfolio_url: string | null;
    social_links: Record<string, string> | null;
    wallet_address: string | null;
    is_verified: boolean;
  } | null;
  onSuccess?: () => void;
}

export function WhispererProfileForm({ existingProfile, onSuccess }: WhispererProfileFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<{ avatar_url: string | null } | null>(null);

  const form = useForm<WhispererFormValues>({
    resolver: zodResolver(whispererSchema),
    defaultValues: {
      display_name: existingProfile?.display_name || '',
      bio: existingProfile?.bio || '',
      specialties: existingProfile?.specialties || [],
      portfolio_url: existingProfile?.portfolio_url || '',
      social_links: existingProfile?.social_links || {
        twitter: '',
        instagram: '',
        youtube: '',
        website: '',
      },
      wallet_address: existingProfile?.wallet_address || '',
    },
  });

  const selectedSpecialties = form.watch('specialties');

  const toggleSpecialty = (specialty: string) => {
    const current = form.getValues('specialties');
    if (current.includes(specialty)) {
      form.setValue('specialties', current.filter(s => s !== specialty));
    } else if (current.length < 5) {
      form.setValue('specialties', [...current, specialty]);
    }
  };

  const onSubmit = async (data: WhispererFormValues) => {
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Not authenticated', description: 'Please log in to continue' });
      return;
    }

    setIsSubmitting(true);
    try {
      const whispererData = {
        user_id: user.id,
        display_name: data.display_name,
        bio: data.bio,
        specialties: data.specialties,
        portfolio_url: data.portfolio_url || null,
        social_links: data.social_links,
        wallet_address: data.wallet_address,
        is_active: true,
      };

      if (existingProfile?.id) {
        // Update existing profile
        const { error } = await supabase
          .from('whisperers')
          .update(whispererData)
          .eq('id', existingProfile.id);
        
        if (error) throw error;
        toast({ title: 'Profile updated!', description: 'Your whisperer profile has been updated.' });
      } else {
        // Create new profile
        const { error } = await supabase
          .from('whisperers')
          .insert(whispererData);
        
        if (error) throw error;
        toast({ title: 'Welcome, Whisperer!', description: 'Your profile is now live. Sowers can find and invite you!' });
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving whisperer profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save profile'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{existingProfile ? 'Edit Your Profile' : 'Become a Whisperer'}</CardTitle>
                <CardDescription>
                  Help sowers spread their seeds by becoming a marketing agent
                </CardDescription>
              </div>
              {existingProfile?.is_verified && (
                <Badge variant="default" className="ml-auto">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your public name" {...field} />
                  </FormControl>
                  <FormDescription>This is how sowers will see you</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell sowers about your marketing experience, approach, and what makes you effective..."
                      className="min-h-[100px] resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>{field.value?.length || 0}/500 characters</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Specialties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Specialties</CardTitle>
            <CardDescription>Select up to 5 areas you excel in</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="specialties"
              render={() => (
                <FormItem>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTY_OPTIONS.map((specialty) => {
                      const isSelected = selectedSpecialties.includes(specialty);
                      return (
                        <Badge
                          key={specialty}
                          variant={isSelected ? 'default' : 'outline'}
                          className={`cursor-pointer transition-all ${
                            isSelected ? 'bg-primary' : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleSpecialty(specialty)}
                        >
                          {isSelected && <X className="h-3 w-3 mr-1" />}
                          {specialty}
                        </Badge>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Portfolio & Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Portfolio & Social Links
            </CardTitle>
            <CardDescription>Show off your work and connect with sowers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="portfolio_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Portfolio URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://your-portfolio.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="social_links.twitter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter/X Handle</FormLabel>
                    <FormControl>
                      <Input placeholder="@yourhandle" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="social_links.instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram Handle</FormLabel>
                    <FormControl>
                      <Input placeholder="@yourhandle" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="social_links.youtube"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube Channel</FormLabel>
                    <FormControl>
                      <Input placeholder="channel-name" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="social_links.website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yoursite.com" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Payment Wallet
            </CardTitle>
            <CardDescription>Where you'll receive your commission payments via NOWPayments</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="wallet_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Crypto Wallet Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Your BTC, ETH, or USDT wallet address" {...field} />
                  </FormControl>
                  <FormDescription>
                    Commissions will be sent to this address when sowers receive bestowals
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : existingProfile ? (
            'Update Profile'
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create Whisperer Profile
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
