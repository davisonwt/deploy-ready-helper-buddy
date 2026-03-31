import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { WizardContainer } from '@/components/wizard/WizardContainer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Sprout, Store, Factory, User, MapPin, Upload, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const SUBTYPES = [
  { value: 'farmer', label: 'Farmer', icon: '🌾', desc: 'Growing crops, fruits, vegetables, herbs' },
  { value: 'homesteader', label: 'Homesteader', icon: '🏡', desc: 'Homegrown produce, eggs, dairy, preserves' },
  { value: 'manufacturer', label: 'Manufacturer', icon: '🏭', desc: 'Handmade goods, packaged products, crafts' },
];

const STEPS = [
  { title: 'Provider Type', description: 'Choose your provider category', icon: <Sprout className="h-5 w-5" /> },
  { title: 'Business Info', description: 'Tell us about your business', icon: <Store className="h-5 w-5" /> },
  { title: 'Location', description: 'Where are you based?', icon: <MapPin className="h-5 w-5" /> },
  { title: 'Photos', description: 'Upload your logo and photos', icon: <Upload className="h-5 w-5" /> },
  { title: 'Payout', description: 'How should we pay you?', icon: <Wallet className="h-5 w-5" /> },
];

export default function RegisterProviderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    subtype: '',
    business_name: '',
    bio: '',
    phone: '',
    email: '',
    address_line: '',
    city: '',
    country: '',
    latitude: '',
    longitude: '',
    logo_url: '',
    photos: [] as string[],
    payout_wallet: '',
  });

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('provider-assets').upload(path, file);
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    }
    const { data: urlData } = supabase.storage.from('provider-assets').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, 'logos');
    if (url) update('logo_url', url);
  };

  const handlePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await uploadFile(file, 'photos');
      if (url) urls.push(url);
    }
    update('photos', [...form.photos, ...urls]);
  };

  const canGoNext = () => {
    switch (step) {
      case 0: return !!form.subtype;
      case 1: return !!form.business_name.trim() && !!form.email.trim();
      case 2: return !!form.city.trim() && !!form.country.trim();
      case 3: return true;
      case 4: return true;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('providers').insert({
        user_id: user.id,
        subtype: form.subtype,
        business_name: form.business_name.trim(),
        bio: form.bio.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim(),
        address_line: form.address_line.trim() || null,
        city: form.city.trim(),
        country: form.country.trim(),
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        logo_url: form.logo_url || null,
        photos: form.photos,
        payout_details: form.payout_wallet ? { wallet: form.payout_wallet } : {},
      } as any);

      if (error) throw error;

      toast({ title: '🎉 Application Submitted!', description: 'Your provider application is pending admin approval.' });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <WizardContainer
        steps={STEPS}
        currentStep={step}
        onStepChange={setStep}
        title="🌿 Become a Provider"
        description="Register as a Farmer, Homesteader, or Manufacturer"
        onCancel={() => navigate('/dashboard')}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        canGoNext={canGoNext()}
        submitLabel="Submit Application"
      >
        {step === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SUBTYPES.map(st => (
              <button
                key={st.value}
                type="button"
                onClick={() => update('subtype', st.value)}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${
                  form.subtype === st.value
                    ? 'border-primary bg-primary/10 shadow-lg scale-105'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50'
                }`}
              >
                <div className="text-4xl mb-3">{st.icon}</div>
                <h3 className="font-bold text-lg text-foreground">{st.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{st.desc}</p>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Business / Farm Name *</label>
              <Input value={form.business_name} onChange={e => update('business_name', e.target.value)} placeholder="e.g. Green Valley Farm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Short Bio</label>
              <textarea
                className="w-full rounded-xl border border-input bg-input p-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring min-h-[100px]"
                value={form.bio}
                onChange={e => update('bio', e.target.value)}
                placeholder="Tell the community what you grow or make..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Phone</label>
                <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 555 123 4567" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Email *</label>
                <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="farm@example.com" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Street Address</label>
              <Input value={form.address_line} onChange={e => update('address_line', e.target.value)} placeholder="123 Farm Road" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">City *</label>
                <Input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Springfield" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Country *</label>
                <Input value={form.country} onChange={e => update('country', e.target.value)} placeholder="United States" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Latitude (optional)</label>
                <Input value={form.latitude} onChange={e => update('latitude', e.target.value)} placeholder="37.7749" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Longitude (optional)</label>
                <Input value={form.longitude} onChange={e => update('longitude', e.target.value)} placeholder="-122.4194" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Logo / Profile Image</label>
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo" className="w-24 h-24 rounded-xl object-cover mb-3 border border-border" />
              )}
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-muted-foreground" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Farm / Product Photos</label>
              {form.photos.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {form.photos.map((url, i) => (
                    <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-20 h-20 rounded-xl object-cover border border-border" />
                  ))}
                </div>
              )}
              <input type="file" accept="image/*" multiple onChange={handlePhotosUpload} className="text-sm text-muted-foreground" />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Payout Wallet Address (Solana/USDC)</label>
              <Input value={form.payout_wallet} onChange={e => update('payout_wallet', e.target.value)} placeholder="Your Solana wallet address" />
              <p className="text-xs text-muted-foreground mt-2">This is where you'll receive payments for orders. You can update this later.</p>
            </div>
          </div>
        )}
      </WizardContainer>
    </Layout>
  );
}
