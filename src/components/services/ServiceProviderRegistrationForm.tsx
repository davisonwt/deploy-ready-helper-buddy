import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@/lib/zodResolver';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { WizardContainer } from '@/components/wizard/WizardContainer';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, MapPin, Briefcase, Image, FileCheck, Calendar, X, Plus } from 'lucide-react';
import ServiceAvailabilityCalendar from './ServiceAvailabilityCalendar';

// Service categories
const SERVICE_CATEGORIES = [
  'Plumber',
  'Electrician',
  'Bookkeeper',
  'Welder',
  'Teacher',
  'Trainer',
  'Web/App Builder',
  'Security Guard',
  'Cleaner',
  'Pool Maintenance',
  'Carpenter',
  'Painter',
  'Gardener',
  'Mechanic',
  'Driver',
  'Chef/Cook',
  'Tutor',
  'Handyman',
  'Other'
];

// Countries list
const COUNTRIES = [
  'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Tanzania', 
  'Uganda', 'Ethiopia', 'Zimbabwe', 'Zambia', 'Botswana',
  'Namibia', 'Mozambique', 'Malawi', 'Rwanda', 'Cameroon',
  'United States', 'United Kingdom', 'Canada', 'Australia',
  'India', 'Philippines', 'Brazil', 'Mexico', 'Israel', 'Other'
];

// Form schema
const formSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  contact_email: z.string().email('Please enter a valid email'),
  contact_phone: z.string().min(6, 'Please enter a valid phone number').max(20),
  services_offered: z.array(z.string()).min(1, 'Select at least one service'),
  custom_services: z.array(z.string()).optional(),
  country: z.string().min(1, 'Please select a country'),
  city: z.string().min(2, 'Please enter your city/town'),
  service_areas: z.array(z.string()).min(1, 'Add at least one service area'),
  hourly_rate: z.coerce.number().min(0, 'Rate must be positive').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  no_income_confirmed: z.boolean().refine(val => val === true, {
    message: 'You must confirm this declaration'
  })
});

type FormData = z.infer<typeof formSchema>;

interface AvailabilityEntry {
  date: Date;
  locations: string[];
  timeSlots: string[];
  notes?: string;
}

const ServiceProviderRegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRegistration, setExistingRegistration] = useState<any>(null);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  
  // Service area input
  const [areaInput, setAreaInput] = useState('');
  
  // Custom service input
  const [customServiceInput, setCustomServiceInput] = useState('');
  
  // Image upload state
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Availability calendar state
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      contact_email: '',
      contact_phone: '',
      services_offered: [],
      custom_services: [],
      country: '',
      city: '',
      service_areas: [],
      hourly_rate: undefined,
      description: '',
      no_income_confirmed: false
    }
  });

  // Check for existing registration
  useEffect(() => {
    const checkExisting = async () => {
      if (!user) {
        setCheckingRegistration(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('service_providers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setExistingRegistration(data);
          // Pre-populate form
          form.reset({
            full_name: data.full_name || '',
            contact_email: data.contact_email || '',
            contact_phone: data.contact_phone || '',
            services_offered: data.services_offered || [],
            custom_services: data.custom_services || [],
            country: data.country || '',
            city: data.city || '',
            service_areas: data.service_areas || [],
            hourly_rate: data.hourly_rate || undefined,
            description: data.description || '',
            no_income_confirmed: data.no_income_confirmed || false
          });
          setPortfolioImages(data.portfolio_images || []);
        }
      } catch (error: any) {
        console.error('Error checking registration:', error);
      } finally {
        setCheckingRegistration(false);
      }
    };
    
    checkExisting();
  }, [user, form]);

  // Pre-fill email from user profile
  useEffect(() => {
    if (user?.email && !form.getValues('contact_email')) {
      form.setValue('contact_email', user.email);
    }
  }, [user, form]);

  const steps = [
    { 
      title: 'Personal Info', 
      description: 'Your contact details',
      icon: <User className="h-5 w-5" />
    },
    { 
      title: 'Services', 
      description: 'What services do you offer?',
      icon: <Briefcase className="h-5 w-5" />
    },
    { 
      title: 'Location', 
      description: 'Where can you provide services?',
      icon: <MapPin className="h-5 w-5" />
    },
    { 
      title: 'Availability', 
      description: 'When are you available?',
      icon: <Calendar className="h-5 w-5" />
    },
    { 
      title: 'Portfolio', 
      description: 'Showcase your work',
      icon: <Image className="h-5 w-5" />
    },
    { 
      title: 'Declaration', 
      description: 'Confirm and submit',
      icon: <FileCheck className="h-5 w-5" />
    }
  ];

  // Add service area
  const handleAddArea = () => {
    const trimmed = areaInput.trim();
    if (trimmed && !form.getValues('service_areas').includes(trimmed)) {
      form.setValue('service_areas', [...form.getValues('service_areas'), trimmed]);
      setAreaInput('');
    }
  };

  // Remove service area
  const handleRemoveArea = (area: string) => {
    form.setValue(
      'service_areas',
      form.getValues('service_areas').filter(a => a !== area)
    );
  };

  // Add custom service
  const handleAddCustomService = () => {
    const trimmed = customServiceInput.trim();
    if (trimmed && !form.getValues('custom_services')?.includes(trimmed)) {
      form.setValue('custom_services', [...(form.getValues('custom_services') || []), trimmed]);
      setCustomServiceInput('');
    }
  };

  // Remove custom service
  const handleRemoveCustomService = (service: string) => {
    form.setValue(
      'custom_services',
      (form.getValues('custom_services') || []).filter(s => s !== service)
    );
  };

  // Toggle service selection
  const toggleService = (service: string) => {
    const current = form.getValues('services_offered');
    if (current.includes(service)) {
      form.setValue('services_offered', current.filter(s => s !== service));
    } else {
      form.setValue('services_offered', [...current, service]);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    
    if (portfolioImages.length + files.length > 3) {
      toast.error('Maximum 3 images allowed');
      return;
    }
    
    setUploadingImages(true);
    const newUrls: string[] = [];
    
    try {
      for (const file of Array.from(files)) {
        // Validate file
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          toast.error(`Invalid file type: ${file.name}. Use JPEG, PNG, or WebP.`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File too large: ${file.name}. Max 5MB.`);
          continue;
        }
        
        const filename = `${user.id}/portfolio_${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from('service-provider-images')
          .upload(filename, file, { upsert: true });
        
        if (error) {
          // If bucket doesn't exist, try creating it via public bucket
          if (error.message.includes('Bucket not found')) {
            toast.error('Storage not configured. Please contact support.');
            continue;
          }
          throw error;
        }
        
        const { data: urlData } = supabase.storage
          .from('service-provider-images')
          .getPublicUrl(data.path);
        
        newUrls.push(urlData.publicUrl);
      }
      
      setPortfolioImages(prev => [...prev, ...newUrls]);
      toast.success('Images uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  // Remove image
  const handleRemoveImage = (url: string) => {
    setPortfolioImages(prev => prev.filter(u => u !== url));
  };

  // Validate current step
  const validateStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 0: // Personal Info
        return await form.trigger(['full_name', 'contact_email', 'contact_phone']);
      case 1: // Services
        return await form.trigger(['services_offered']);
      case 2: // Location
        return await form.trigger(['country', 'city', 'service_areas']);
      case 3: // Availability (optional)
        return true;
      case 4: // Portfolio (optional)
        return true;
      case 5: // Declaration
        return await form.trigger(['no_income_confirmed']);
      default:
        return true;
    }
  };

  // Handle step change
  const handleStepChange = async (newStep: number) => {
    if (newStep > currentStep) {
      const isValid = await validateStep(currentStep);
      if (!isValid) return;
    }
    setCurrentStep(newStep);
  };

  // Submit form
  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error('Please log in to continue');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const providerData = {
        user_id: user.id,
        full_name: data.full_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        services_offered: data.services_offered,
        custom_services: data.custom_services || [],
        country: data.country,
        city: data.city,
        service_areas: data.service_areas,
        hourly_rate: data.hourly_rate || null,
        description: data.description || null,
        portfolio_images: portfolioImages,
        no_income_confirmed: data.no_income_confirmed,
        status: 'pending'
      };
      
      let providerId: string;
      
      if (existingRegistration) {
        // Update existing
        const { error } = await supabase
          .from('service_providers')
          .update(providerData)
          .eq('id', existingRegistration.id);
        
        if (error) throw error;
        providerId = existingRegistration.id;
        toast.success('Registration updated successfully!');
      } else {
        // Create new
        const { data: newProvider, error } = await supabase
          .from('service_providers')
          .insert(providerData)
          .select('id')
          .single();
        
        if (error) throw error;
        providerId = newProvider.id;
        toast.success('Registration submitted successfully!');
      }
      
      // Save availability data
      if (availability.length > 0) {
        // Delete existing availability
        await supabase
          .from('service_provider_availability')
          .delete()
          .eq('provider_id', providerId);
        
        // Insert new availability
        const availabilityData = availability.map(entry => ({
          provider_id: providerId,
          available_date: entry.date.toISOString().split('T')[0],
          locations_available: entry.locations,
          time_slots: entry.timeSlots,
          notes: entry.notes || null
        }));
        
        const { error: availError } = await supabase
          .from('service_provider_availability')
          .insert(availabilityData);
        
        if (availError) {
          console.error('Error saving availability:', availError);
        }
      }
      
      // Navigate to community services page
      navigate('/community-services');
      
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to submit registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || checkingRegistration) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Please Log In</h2>
        <p className="text-muted-foreground mb-4">You need to be logged in to register as a service provider.</p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    );
  }

  const canGoNext = currentStep < steps.length - 1;
  
  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Personal Info
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+27 12 345 6789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
        
      case 1: // Services
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="services_offered"
              render={() => (
                <FormItem>
                  <FormLabel>Services You Offer *</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {SERVICE_CATEGORIES.map(service => (
                      <div
                        key={service}
                        onClick={() => toggleService(service)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          form.watch('services_offered').includes(service)
                            ? 'bg-primary/20 border-primary'
                            : 'bg-card border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="text-sm">{service}</span>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Custom services */}
            <div>
              <FormLabel>Custom Services (Optional)</FormLabel>
              <p className="text-sm text-muted-foreground mb-2">Add any services not listed above</p>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="e.g., Solar Panel Installation"
                  value={customServiceInput}
                  onChange={(e) => setCustomServiceInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomService())}
                />
                <Button type="button" onClick={handleAddCustomService} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.watch('custom_services')?.map(service => (
                  <Badge key={service} variant="secondary" className="gap-1">
                    {service}
                    <button type="button" onClick={() => handleRemoveCustomService(service)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Hourly rate */}
            <FormField
              control={form.control}
              name="hourly_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hourly Rate (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g., 150" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">Leave blank if you prefer to quote per job</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills & Experience (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell potential clients about your skills, experience, certifications, tools..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
        
      case 2: // Location
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City/Town *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cape Town" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="service_areas"
              render={() => (
                <FormItem>
                  <FormLabel>Service Areas *</FormLabel>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add neighborhoods or areas where you can provide services
                  </p>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="e.g., Sandton, Rosebank"
                      value={areaInput}
                      onChange={(e) => setAreaInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddArea())}
                    />
                    <Button type="button" onClick={handleAddArea} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.watch('service_areas').map(area => (
                      <Badge key={area} variant="secondary" className="gap-1">
                        {area}
                        <button type="button" onClick={() => handleRemoveArea(area)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
        
      case 3: // Availability Calendar
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Mark days when you're available. You can specify different locations for different days.
            </p>
            <ServiceAvailabilityCalendar
              availability={availability}
              onAvailabilityChange={setAvailability}
              serviceAreas={form.watch('service_areas')}
            />
          </div>
        );
        
      case 4: // Portfolio Images
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Upload up to 3 photos showcasing your work, tools, or certifications (max 5MB each, JPEG/PNG/WebP)
            </p>
            
            {/* Image grid */}
            <div className="grid grid-cols-3 gap-4">
              {portfolioImages.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img src={url} alt={`Portfolio ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(url)}
                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              {portfolioImages.length < 3 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Add Photo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImages}
                  />
                </label>
              )}
            </div>
            
            {uploadingImages && (
              <p className="text-sm text-muted-foreground text-center">Uploading...</p>
            )}
          </div>
        );
        
      case 5: // Declaration
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Summary</h3>
              <dl className="space-y-2 text-sm">
                <div><dt className="font-medium inline">Name:</dt> <dd className="inline">{form.watch('full_name')}</dd></div>
                <div><dt className="font-medium inline">Services:</dt> <dd className="inline">{[...form.watch('services_offered'), ...(form.watch('custom_services') || [])].join(', ')}</dd></div>
                <div><dt className="font-medium inline">Location:</dt> <dd className="inline">{form.watch('city')}, {form.watch('country')}</dd></div>
                <div><dt className="font-medium inline">Areas:</dt> <dd className="inline">{form.watch('service_areas').join(', ')}</dd></div>
                {form.watch('hourly_rate') && (
                  <div><dt className="font-medium inline">Rate:</dt> <dd className="inline">R{form.watch('hourly_rate')}/hr</dd></div>
                )}
                <div><dt className="font-medium inline">Photos:</dt> <dd className="inline">{portfolioImages.length} uploaded</dd></div>
                <div><dt className="font-medium inline">Available days:</dt> <dd className="inline">{availability.length} marked</dd></div>
              </dl>
            </div>
            
            <FormField
              control={form.control}
              name="no_income_confirmed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-base cursor-pointer">
                      No-Income Declaration *
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      I confirm that I currently have no regular income and am seeking community work opportunities.
                      I understand this platform connects me with fellow sowers for mutual support.
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <WizardContainer
          steps={steps}
          currentStep={currentStep}
          onStepChange={handleStepChange}
          title={existingRegistration ? "Update Your Registration" : "Register as a Service Provider"}
          description="Join our community of skilled professionals"
          onCancel={() => navigate('/dashboard')}
          onSubmit={form.handleSubmit(onSubmit)}
          isSubmitting={isSubmitting}
          canGoNext={canGoNext}
          submitLabel={existingRegistration ? "Update Registration" : "Submit Registration"}
        >
          {renderStepContent()}
        </WizardContainer>
      </form>
    </Form>
  );
};

export default ServiceProviderRegistrationForm;
