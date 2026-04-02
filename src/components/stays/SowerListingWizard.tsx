import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, MapPin, Upload, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const PROPERTY_TYPES = [
  'game_lodge', 'guesthouse', 'bnb', 'farm_stay', 'self_catering', 'glamping',
  'backpackers', 'eco_retreat', 'treehouse', 'bush_camp', 'boutique_hotel',
  'vineyard_stay', 'mountain_hut', 'coastal_cottage', 'family_farm',
];

const AMENITIES = [
  'WiFi', 'Pool', 'Braai/BBQ', 'Air Conditioning', 'Heating', 'Kitchen', 'Parking',
  'Hot Tub', 'Fireplace', 'Garden', 'Balcony', 'Laundry', 'TV', 'Board Games',
];

const ACTIVITIES = [
  'Hiking', 'Horse Riding', 'Farm Activities', 'Game Drives', 'Bird Watching',
  'Fishing', 'Mountain Biking', 'Wine Tasting', 'Stargazing', 'Swimming',
  'Kayaking', 'Cooking Classes', 'Farm Tours', 'Nature Walks',
];

const STEPS = ['Basics', 'Location', 'Details', 'Photos', 'Review'];

const SowerListingWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    business_name: '',
    property_type: 'guesthouse',
    description: '',
    short_description: '',
    country: 'South Africa',
    province: '',
    city: '',
    address: '',
    amenities: [] as string[],
    activities: [] as string[],
    pet_friendly: false,
    check_in_time: '14:00',
    check_out_time: '10:00',
    cancellation_policy: 'flexible',
    house_rules: '',
    photos: [] as string[],
  });

  const updateForm = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleArray = (key: 'amenities' | 'activities', value: string) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    const files = Array.from(e.target.files);
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('stay-photos').upload(path, file);
      if (error) { toast.error('Upload failed'); continue; }
      const { data: { publicUrl } } = supabase.storage.from('stay-photos').getPublicUrl(path);
      updateForm('photos', [...form.photos, publicUrl]);
    }
  };

  const removePhoto = (index: number) => {
    updateForm('photos', form.photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) { toast.error('Please sign in'); return; }
    if (!form.business_name.trim()) { toast.error('Business name is required'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('stay_listings').insert({
        sower_id: user.id,
        business_name: form.business_name,
        property_type: form.property_type,
        description: form.description,
        short_description: form.short_description,
        country: form.country,
        province: form.province,
        city: form.city,
        address: form.address,
        amenities: form.amenities,
        activities: form.activities,
        pet_friendly: form.pet_friendly,
        check_in_time: form.check_in_time,
        check_out_time: form.check_out_time,
        cancellation_policy: form.cancellation_policy,
        house_rules: form.house_rules,
        photos: form.photos,
        cover_photo: form.photos[0] || null,
        status: 'pending',
      } as any);
      if (error) throw error;
      toast.success('🎉 Listing submitted for approval!');
      navigate('/sower-stays-dashboard');
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to submit listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">🏡 List Your Stay</h1>
          <p className="text-muted-foreground">Share your unique space with travellers from around the world</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-colors ${
                  i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
                onClick={() => i < step && setStep(i)}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div>
                  <Label>Business Name *</Label>
                  <Input value={form.business_name} onChange={e => updateForm('business_name', e.target.value)} placeholder="e.g. Sunset Ridge Farm Stay" className="bg-card" />
                </div>
                <div>
                  <Label>Property Type</Label>
                  <Select value={form.property_type} onValueChange={v => updateForm('property_type', v)}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Short Description</Label>
                  <Input value={form.short_description} onChange={e => updateForm('short_description', e.target.value)} placeholder="A one-liner about your stay" className="bg-card" maxLength={120} />
                </div>
                <div>
                  <Label>Full Description</Label>
                  <Textarea value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder="Tell travellers what makes your place special..." className="bg-card min-h-[120px]" />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Country</Label>
                    <Input value={form.country} onChange={e => updateForm('country', e.target.value)} className="bg-card" />
                  </div>
                  <div>
                    <Label>Province/State</Label>
                    <Input value={form.province} onChange={e => updateForm('province', e.target.value)} placeholder="e.g. Western Cape" className="bg-card" />
                  </div>
                </div>
                <div>
                  <Label>City/Town</Label>
                  <Input value={form.city} onChange={e => updateForm('city', e.target.value)} placeholder="e.g. Stellenbosch" className="bg-card" />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={form.address} onChange={e => updateForm('address', e.target.value)} placeholder="Street address" className="bg-card" />
                </div>
                <div className="p-4 rounded-lg bg-muted/20 border border-border text-center">
                  <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Map pin feature coming soon</p>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <Label className="mb-2 block">Amenities</Label>
                  <div className="flex flex-wrap gap-2">
                    {AMENITIES.map(a => (
                      <Badge
                        key={a}
                        variant={form.amenities.includes(a) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleArray('amenities', a)}
                      >
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Activities</Label>
                  <div className="flex flex-wrap gap-2">
                    {ACTIVITIES.map(a => (
                      <Badge
                        key={a}
                        variant={form.activities.includes(a) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleArray('activities', a)}
                      >
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.pet_friendly} onCheckedChange={v => updateForm('pet_friendly', v)} />
                  <Label>🐾 Pet-Friendly</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Check-in Time</Label>
                    <Input value={form.check_in_time} onChange={e => updateForm('check_in_time', e.target.value)} className="bg-card" />
                  </div>
                  <div>
                    <Label>Check-out Time</Label>
                    <Input value={form.check_out_time} onChange={e => updateForm('check_out_time', e.target.value)} className="bg-card" />
                  </div>
                </div>
                <div>
                  <Label>House Rules</Label>
                  <Textarea value={form.house_rules} onChange={e => updateForm('house_rules', e.target.value)} placeholder="Any rules guests should know about..." className="bg-card" />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <Label className="mb-2 block">Property Photos</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {form.photos.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removePhoto(i)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        {i === 0 && <Badge className="absolute bottom-1 left-1 text-[10px]">Cover</Badge>}
                      </div>
                    ))}
                    <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Add Photo</span>
                      <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <h3 className="font-semibold text-foreground mb-2">{form.business_name || 'Untitled'}</h3>
                  <p className="text-sm text-muted-foreground mb-1">{form.property_type.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-muted-foreground">{[form.city, form.province, form.country].filter(Boolean).join(', ')}</p>
                  {form.photos.length > 0 && <p className="text-sm text-muted-foreground mt-2">📸 {form.photos.length} photos</p>}
                  {form.amenities.length > 0 && <p className="text-sm text-muted-foreground">✅ {form.amenities.length} amenities</p>}
                  {form.activities.length > 0 && <p className="text-sm text-muted-foreground">🎯 {form.activities.length} activities</p>}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Your listing will be submitted for review. You'll be notified once it's approved.
                </p>
                <p className="text-xs text-muted-foreground text-center italic">
                  Payouts and invoicing are managed through your S2G Sower bookkeeping dashboard
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(step + 1)}>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : '🚀 Submit Listing'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SowerListingWizard;
