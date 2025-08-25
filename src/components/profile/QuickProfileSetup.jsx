import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Camera, 
  MapPin,
  Phone,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Globe
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function QuickProfileSetup({ onComplete, onClose }) {
  const [step, setStep] = useState(1); // 1: Basic, 2: Photo, 3: Complete
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    location: '',
    phone: '',
    website: '',
    avatar_url: null
  });
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const { updateProfile } = useAuth();
  const { toast } = useToast();

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, or WebP image",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingPhoto(true);
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          avatar_url: e.target.result
        }));
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process the image",
        variant: "destructive"
      });
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await updateProfile(formData);
      if (result.success) {
        setStep(3);
        toast({
          title: "Profile updated! ✨",
          description: "Your profile looks great!",
        });
        setTimeout(() => {
          onComplete?.();
        }, 2000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Basic Info
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-md mx-auto">
          <Card className="bg-white/95 backdrop-blur-lg shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Complete Your Profile</CardTitle>
              <p className="text-gray-600">Tell the community about yourself</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Display Name
                </label>
                <Input
                  placeholder="What should people call you?"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  maxLength={50}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Bio
                </label>
                <Textarea
                  placeholder="Tell us a bit about yourself..."
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Location
                  </label>
                  <Input
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Phone
                  </label>
                  <Input
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  <Globe className="h-4 w-4 inline mr-1" />
                  Website (Optional)
                </label>
                <Input
                  placeholder="https://yourwebsite.com"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={onClose} variant="outline" className="flex-1">
                  Skip for now
                </Button>
                <Button onClick={() => setStep(2)} className="flex-1">
                  Next: Photo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 2: Photo Upload
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="max-w-md mx-auto">
          <Card className="bg-white/95 backdrop-blur-lg shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                <Camera className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Add Your Photo</CardTitle>
              <p className="text-gray-600">Show your face to the community</p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="relative mx-auto w-32 h-32 mb-4">
                  <div className="w-full h-full rounded-full overflow-hidden shadow-lg border-4 border-white">
                    {formData.avatar_url ? (
                      <img 
                        src={formData.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <User className="h-16 w-16 text-gray-500" />
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    size="sm"
                    className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0"
                  >
                    {uploadingPhoto ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                
                <p className="text-sm text-gray-500">
                  Upload a photo (JPEG, PNG, or WebP • Max 5MB)
                </p>
              </div>

              {formData.display_name && (
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <h3 className="font-semibold text-gray-900 mb-1">{formData.display_name}</h3>
                  {formData.bio && <p className="text-sm text-gray-600">{formData.bio}</p>}
                  {formData.location && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{formData.location}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleSave} disabled={loading} className="flex-1">
                  {loading ? (
                    <>Saving...</>
                  ) : (
                    <>
                      Complete Setup
                      <Sparkles className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 3: Success
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center">
        <Card className="bg-white/95 backdrop-blur-lg shadow-xl">
          <CardContent className="p-8">
            <div className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Profile Complete! ✨</h1>
            <p className="text-lg text-gray-600 mb-6">
              You're all set to connect with the community
            </p>

            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="secondary">🌱 Create Orchards</Badge>
                <Badge variant="secondary">💬 Join Conversations</Badge>
                <Badge variant="secondary">🎯 Support Others</Badge>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Welcome to the sow2grow community!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}