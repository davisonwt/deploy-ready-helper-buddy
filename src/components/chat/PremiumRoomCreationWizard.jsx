import React, { useState } from 'react';
import { WizardContainer } from '@/components/wizard/WizardContainer';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { SecureInput, SecureTextarea } from '@/components/ui/secure-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  Target, 
  Lock, 
  Settings, 
  DollarSign, 
  CheckCircle,
  Video,
  Share2,
  Users,
  Crown,
  FileText,
  Megaphone,
  GraduationCap,
  Radio as RadioIcon,
  Briefcase
} from 'lucide-react';

const ROOM_PURPOSES = [
  { value: 'classroom', label: 'Classroom / Educational', icon: GraduationCap, description: 'Interactive learning sessions' },
  { value: 'seminar', label: 'Seminar / Workshop', icon: Users, description: 'Professional development' },
  { value: 'training', label: 'Training Session', icon: Briefcase, description: 'Skill development' },
  { value: 'podcast', label: 'Podcast Recording', icon: RadioIcon, description: 'Live podcast sessions' },
  { value: 'marketing', label: 'Marketing / Product Demo', icon: Megaphone, description: 'Promote products or services' },
  { value: 'general', label: 'General Discussion', icon: MessageSquare, description: 'Community conversations' },
];

const PREMIUM_CATEGORIES = [
  'cooking_nutrition',
  'diy_home',
  'natural_health',
  'business_training',
  'podcasts_interviews',
  'marketing',
  'general_courses'
];

const CATEGORIES = [
  'Agriculture & Farming',
  'Education & Training',
  'Technology & Innovation',
  'Healthcare & Wellness',
  'Arts & Culture',
  'Business & Entrepreneurship',
  'Spiritual & Religious',
  'Community Development',
];

export function PremiumRoomCreationWizard({ onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: Purpose
    purpose: 'general',
    
    // Step 2: Details
    name: '',
    description: '',
    category: '',
    
    // Step 3: Access Control
    is_premium: false,
    access_type: 'public', // public, premium, orchard_based
    required_bestowal_amount: 0,
    orchard_id: null,
    max_participants: 100,
    
    // Step 4: Features
    enable_video_calls: true,
    enable_screen_share: true,
    enable_file_sharing: true,
    enable_voice_memos: true,
    
    // Step 5: Monetization
    enable_paid_entry: false,
    entry_fee: 0,
    enable_ads: false,
    ad_slots: []
  });

  const steps = [
    {
      title: 'Select Purpose',
      description: 'What type of room are you creating?',
      icon: <Target className="h-5 w-5" />
    },
    {
      title: 'Room Details',
      description: 'Basic information about your room',
      icon: <MessageSquare className="h-5 w-5" />
    },
    {
      title: 'Access Control',
      description: 'Who can join your room?',
      icon: <Lock className="h-5 w-5" />
    },
    {
      title: 'Features Setup',
      description: 'Configure available features',
      icon: <Settings className="h-5 w-5" />
    },
    {
      title: 'Monetization',
      description: 'Set up earning opportunities',
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      title: 'Review & Create',
      description: 'Review your room configuration',
      icon: <CheckCircle className="h-5 w-5" />
    }
  ];

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addAdSlot = () => {
    setFormData(prev => ({
      ...prev,
      ad_slots: [...prev.ad_slots, {
        id: Date.now(),
        duration_seconds: 30,
        rate: 25,
        description: ''
      }]
    }));
  };

  const removeAdSlot = (id) => {
    setFormData(prev => ({
      ...prev,
      ad_slots: prev.ad_slots.filter(slot => slot.id !== id)
    }));
  };

  const updateAdSlot = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      ad_slots: prev.ad_slots.map(slot => 
        slot.id === id ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Determine room type based on purpose
      const roomTypeMap = {
        'classroom': 'live_study',
        'seminar': 'live_conference',
        'training': 'live_training',
        'podcast': 'live_podcast',
        'marketing': 'live_marketing',
        'general': 'group'
      };

      // Create the room
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: formData.name,
          description: formData.description,
          room_type: roomTypeMap[formData.purpose],
          category: formData.category,
          is_premium: formData.is_premium,
          premium_category: formData.is_premium ? 
            PREMIUM_CATEGORIES.find(cat => cat.includes(formData.purpose)) || 'general_courses' 
            : null,
          required_bestowal_amount: formData.is_premium ? formData.required_bestowal_amount : null,
          orchard_id: formData.orchard_id,
          max_participants: formData.max_participants,
          created_by: user.id,
          room_features: {
            video_calls: formData.enable_video_calls,
            screen_share: formData.enable_screen_share,
            file_sharing: formData.enable_file_sharing,
            voice_memos: formData.enable_voice_memos
          }
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as participant and moderator
      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          is_moderator: true,
          is_active: true
        });

      if (participantError) throw participantError;

      // Store monetization settings if enabled
      if (formData.enable_paid_entry || formData.enable_ads) {
        const { error: monetizationError } = await supabase
          .from('room_monetization')
          .insert({
            room_id: room.id,
            enable_paid_entry: formData.enable_paid_entry,
            entry_fee: formData.enable_paid_entry ? formData.entry_fee : null,
            enable_ads: formData.enable_ads,
            ad_slots: formData.enable_ads ? formData.ad_slots : []
          });

        if (monetizationError) console.error('Error saving monetization:', monetizationError);
      }

      toast({
        title: "Success!",
        description: "Your room has been created successfully",
      });

      onClose();
      navigate(`/chatapp?room=${room.id}`);
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.purpose;
      case 1:
        return formData.name.trim() && formData.category;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return !formData.enable_ads || formData.ad_slots.length > 0;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROOM_PURPOSES.map((purpose) => {
              const Icon = purpose.icon;
              const isSelected = formData.purpose === purpose.value;
              
              return (
                <button
                  key={purpose.value}
                  type="button"
                  onClick={() => handleFieldChange('purpose', purpose.value)}
                  className={`p-6 border-2 rounded-xl text-left transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className={`h-8 w-8 mb-3 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <h3 className="font-semibold mb-1">{purpose.label}</h3>
                  <p className="text-sm text-muted-foreground">{purpose.description}</p>
                </button>
              );
            })}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Room Name *</Label>
              <SecureInput
                id="name"
                placeholder="e.g., Digital Marketing Masterclass"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                maxLength={100}
                sanitizeType="text"
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleFieldChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <SecureTextarea
                id="description"
                placeholder="Describe what participants can expect..."
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                maxLength={500}
                sanitizeType="text"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="max_participants">Maximum Participants</Label>
              <Input
                id="max_participants"
                type="number"
                min="2"
                max="500"
                value={formData.max_participants}
                onChange={(e) => handleFieldChange('max_participants', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-3 block">Access Level</Label>
              <RadioGroup 
                value={formData.access_type} 
                onValueChange={(value) => {
                  handleFieldChange('access_type', value);
                  handleFieldChange('is_premium', value !== 'public');
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="public" id="public" />
                    <Label htmlFor="public" className="cursor-pointer flex-1">
                      <div>
                        <div className="font-medium">Public Room</div>
                        <div className="text-sm text-muted-foreground">Anyone can join freely</div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="premium" id="premium" />
                    <Label htmlFor="premium" className="cursor-pointer flex-1">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <Crown className="h-4 w-4 text-amber-500" />
                          Premium Room
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Requires payment to join
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="orchard_based" id="orchard" />
                    <Label htmlFor="orchard" className="cursor-pointer flex-1">
                      <div>
                        <div className="font-medium">Orchard Supporters Only</div>
                        <div className="text-sm text-muted-foreground">
                          Only those who contributed to an orchard
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {formData.access_type === 'premium' && (
              <div>
                <Label htmlFor="entry_fee">Entry Fee (USD)</Label>
                <Input
                  id="entry_fee"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.required_bestowal_amount}
                  onChange={(e) => handleFieldChange('required_bestowal_amount', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How much users must pay to join
                </p>
              </div>
            )}

            {formData.access_type === 'orchard_based' && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You'll be able to link this room to an orchard after creation. All users who contributed to that orchard will automatically gain access.
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select which features will be available in this room
            </p>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="video"
                  checked={formData.enable_video_calls}
                  onCheckedChange={(checked) => handleFieldChange('enable_video_calls', checked)}
                />
                <Label htmlFor="video" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Video Calls</div>
                      <div className="text-sm text-muted-foreground">
                        Enable video conferencing
                      </div>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="screen"
                  checked={formData.enable_screen_share}
                  onCheckedChange={(checked) => handleFieldChange('enable_screen_share', checked)}
                />
                <Label htmlFor="screen" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Screen Sharing</div>
                      <div className="text-sm text-muted-foreground">
                        Allow users to share their screen
                      </div>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="files"
                  checked={formData.enable_file_sharing}
                  onCheckedChange={(checked) => handleFieldChange('enable_file_sharing', checked)}
                />
                <Label htmlFor="files" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <div>
                      <div className="font-medium">File Sharing</div>
                      <div className="text-sm text-muted-foreground">
                        Upload and share documents
                      </div>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="voice"
                  checked={formData.enable_voice_memos}
                  onCheckedChange={(checked) => handleFieldChange('enable_voice_memos', checked)}
                />
                <Label htmlFor="voice" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <RadioIcon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Voice Messages</div>
                      <div className="text-sm text-muted-foreground">
                        Record and send voice memos
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Checkbox
                id="enable_ads"
                checked={formData.enable_ads}
                onCheckedChange={(checked) => handleFieldChange('enable_ads', checked)}
              />
              <Label htmlFor="enable_ads" className="cursor-pointer">
                Enable advertisement slots to monetize your room
              </Label>
            </div>

            {formData.enable_ads && (
              <>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    Advertisement Slots
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdSlot}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <span className="mr-1">+</span> Add Slot
                  </Button>
                </div>

                {formData.ad_slots.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground bg-muted rounded-lg">
                    No ad slots added yet. Click "Add Slot" to create one.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.ad_slots.map((slot, index) => (
                      <div key={slot.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge>Slot {index + 1}</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAdSlot(slot.id)}
                          >
                            Remove
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Duration (seconds)</Label>
                            <Input
                              type="number"
                              min="15"
                              max="60"
                              value={slot.duration_seconds}
                              onChange={(e) => updateAdSlot(slot.id, 'duration_seconds', parseInt(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Rate (USD)</Label>
                            <Input
                              type="number"
                              min="5"
                              max="500"
                              value={slot.rate}
                              onChange={(e) => updateAdSlot(slot.id, 'rate', parseInt(e.target.value))}
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Description</Label>
                          <SecureTextarea
                            placeholder="What type of ads fit here..."
                            value={slot.description}
                            onChange={(e) => updateAdSlot(slot.id, 'description', e.target.value)}
                            rows={2}
                            maxLength={200}
                            sanitizeType="text"
                          />
                        </div>
                      </div>
                    ))}

                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm font-medium">
                        Potential Revenue: ${formData.ad_slots.reduce((sum, slot) => sum + slot.rate, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total from {formData.ad_slots.length} slot(s)
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {!formData.enable_ads && formData.access_type !== 'premium' && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  This will be a free room with no monetization. You can always enable these features later.
                </p>
              </div>
            )}
          </div>
        );

      case 5:
        const selectedPurpose = ROOM_PURPOSES.find(p => p.value === formData.purpose);
        
        return (
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                {selectedPurpose && <selectedPurpose.icon className="h-5 w-5" />}
                <h3 className="font-semibold text-lg">{formData.name}</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Purpose:</span>
                  <p className="font-medium">{selectedPurpose?.label}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">{formData.category}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Access:</span>
                  <p className="font-medium capitalize">{formData.access_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Max Participants:</span>
                  <p className="font-medium">{formData.max_participants}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-card border rounded-lg">
                <h4 className="font-medium text-sm mb-2">Features Enabled</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {formData.enable_video_calls && <p>✓ Video Calls</p>}
                  {formData.enable_screen_share && <p>✓ Screen Sharing</p>}
                  {formData.enable_file_sharing && <p>✓ File Sharing</p>}
                  {formData.enable_voice_memos && <p>✓ Voice Messages</p>}
                </div>
              </div>

              <div className="p-3 bg-card border rounded-lg">
                <h4 className="font-medium text-sm mb-2">Monetization</h4>
                <div className="space-y-1 text-xs">
                  {formData.is_premium && (
                    <p>Entry Fee: ${formData.required_bestowal_amount}</p>
                  )}
                  {formData.enable_ads && (
                    <p>{formData.ad_slots.length} Ad Slot(s)</p>
                  )}
                  {!formData.is_premium && !formData.enable_ads && (
                    <p className="text-muted-foreground">Free room</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary/10 border-l-4 border-primary rounded">
              <h4 className="font-semibold mb-2">Ready to Create!</h4>
              <p className="text-sm text-muted-foreground">
                Your room will be created and you'll be redirected to it. You can invite participants and start your session immediately.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <WizardContainer
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      title="Create Premium Room"
      description="Follow these steps to set up your interactive room"
      onCancel={onClose}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      canGoNext={canProceed()}
      submitLabel="Create Room"
    >
      {renderStepContent()}
    </WizardContainer>
  );
}
