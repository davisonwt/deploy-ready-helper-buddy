import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ChevronLeft, ChevronRight, Loader2, User, Car, Image, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VehicleImageUpload from './VehicleImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const vehicleTypes = ['Car', 'Truck', 'Bike', 'Van', 'Other'] as const;
type VehicleType = typeof vehicleTypes[number];

const formSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  contactPhone: z.string().min(10, 'Please enter a valid phone number').max(20),
  contactEmail: z.string().email('Please enter a valid email'),
  vehicleType: z.string().min(1, 'Please select a vehicle type'),
  vehicleDescription: z.string().min(10, 'Please provide at least 10 characters').max(500, 'Description too long'),
  noIncomeConfirmed: z.boolean().refine(val => val === true, {
    message: 'You must confirm this declaration to proceed'
  }),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms to proceed'
  }),
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Vehicle Details', icon: Car },
  { id: 3, title: 'Upload Photos', icon: Image },
  { id: 4, title: 'Confirm & Submit', icon: FileCheck },
];

const VehicleRegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRegistration, setExistingRegistration] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      contactPhone: '',
      contactEmail: user?.email || '',
      vehicleType: undefined,
      vehicleDescription: '',
      noIncomeConfirmed: false,
      termsAccepted: false,
    },
  });

  useEffect(() => {
    if (user?.email) {
      form.setValue('contactEmail', user.email);
    }
    checkExistingRegistration();
  }, [user]);

  const checkExistingRegistration = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('community_drivers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setExistingRegistration(data);
        setIsEditing(true);
        // Populate form with existing data
        form.reset({
          fullName: data.full_name,
          contactPhone: data.contact_phone,
          contactEmail: data.contact_email,
          vehicleType: data.vehicle_type,
          vehicleDescription: data.vehicle_description,
          noIncomeConfirmed: data.no_income_confirmed,
          termsAccepted: true,
        });
        setImageUrls(data.vehicle_images || []);
      }
    } catch (error: any) {
      console.error('Error checking registration:', error);
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return imageUrls; // Keep existing URLs if no new images

    const uploadedUrls: string[] = [...imageUrls.filter(url => !url.startsWith('blob:'))];

    for (const file of images) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `drivers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('orchard-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('orchard-images')
        .getPublicUrl(filePath);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error('You must be logged in to register');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images first
      const uploadedImageUrls = await uploadImages();

      const driverData = {
        user_id: user.id,
        full_name: data.fullName.trim(),
        contact_phone: data.contactPhone.trim(),
        contact_email: data.contactEmail.trim(),
        vehicle_type: data.vehicleType,
        vehicle_description: data.vehicleDescription.trim(),
        vehicle_images: uploadedImageUrls,
        no_income_confirmed: data.noIncomeConfirmed,
        status: 'pending' as const,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (isEditing && existingRegistration) {
        result = await supabase
          .from('community_drivers')
          .update(driverData)
          .eq('id', existingRegistration.id);
      } else {
        result = await supabase
          .from('community_drivers')
          .insert(driverData);
      }

      if (result.error) throw result.error;

      // Send notification email via edge function
      try {
        await supabase.functions.invoke('notify-driver-registration', {
          body: {
            driverName: data.fullName,
            driverEmail: data.contactEmail,
            vehicleType: data.vehicleType,
            isUpdate: isEditing,
          },
        });
      } catch (emailError) {
        console.warn('Email notification failed:', emailError);
        // Don't fail the whole registration if email fails
      }

      toast.success(
        isEditing 
          ? 'Your registration has been updated!' 
          : 'Welcome to the Community Drivers network! Your registration is under review.'
      );
      navigate('/community-drivers');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to submit registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    let isValid = true;

    if (currentStep === 1) {
      isValid = await form.trigger(['fullName', 'contactPhone', 'contactEmail']);
    } else if (currentStep === 2) {
      isValid = await form.trigger(['vehicleType', 'vehicleDescription']);
    }

    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  return (
    <Card className="border-border">
      {/* Progress Steps */}
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center mb-4">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    currentStep >= step.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs mt-1 text-muted-foreground hidden sm:block">
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded transition-colors ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <CardTitle>
          {isEditing ? 'Edit Your Registration' : 'Register as a Community Driver'}
        </CardTitle>
        <CardDescription>
          {steps[currentStep - 1].title} - Step {currentStep} of 4
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone *</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormDescription>
                        This will be shared with sowers who want to hire you
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email *</FormLabel>
                      <FormControl>
                        <Input placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Vehicle Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your vehicle type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicleTypes.map(type => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                  name="vehicleDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your vehicle (make, model, year, capacity, any special features...)"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Help sowers understand what your vehicle can do (10-500 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 3: Image Upload */}
            {currentStep === 3 && (
              <VehicleImageUpload
                images={images}
                setImages={setImages}
                existingUrls={imageUrls}
                setExistingUrls={setImageUrls}
              />
            )}

            {/* Step 4: Declaration & Submit */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold">Registration Summary</h4>
                  <p><span className="text-muted-foreground">Name:</span> {form.getValues('fullName')}</p>
                  <p><span className="text-muted-foreground">Vehicle:</span> {form.getValues('vehicleType')}</p>
                  <p><span className="text-muted-foreground">Photos:</span> {images.length + imageUrls.filter(u => !u.startsWith('blob:')).length} uploaded</p>
                </div>

                <FormField
                  control={form.control}
                  name="noIncomeConfirmed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          No-Income Declaration *
                        </FormLabel>
                        <FormDescription>
                          I confirm I have no current income and am seeking community work to support myself and my family.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="termsAccepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Terms & Conditions *
                        </FormLabel>
                        <FormDescription>
                          I agree to be respectful to fellow community members and provide honest, reliable service.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {isEditing ? 'Update Registration' : 'Submit Registration'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default VehicleRegistrationForm;
