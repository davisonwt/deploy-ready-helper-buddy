import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Lock, 
  MapPin,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { countries } from '@/data/countries';
import { validatePassword, getPasswordValidationFeedback } from '@/lib/utils';

const POPULAR_COUNTRIES = [
  'United States',
  'Canada', 
  'United Kingdom',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
  'South Africa',
  'India',
  'Nigeria'
];

export function QuickRegistration() {
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Location, 3: Complete
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    location: '',
    currency: 'USD',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async () => {
    // Use strong password validation (10+ chars with complexity requirements)
    if (!validatePassword(formData.password)) {
      const feedback = getPasswordValidationFeedback(formData.password);
      setError(feedback.feedback.join('. ') || 'Password does not meet security requirements');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        location: formData.location,
        currency: formData.currency,
        timezone: formData.timezone,
        country: formData.location
      });

      if (result.success) {
        setStep(3);
        toast({
          title: "Welcome to sow2grow! 🌱",
          description: "Your account has been created successfully",
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Basic Information
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center text-green-700 hover:text-green-600 mb-6 transition-all duration-300">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sow2grow
          </Link>

          <Card className="bg-white/95 backdrop-blur-lg shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Join sow2grow</CardTitle>
              <p className="text-gray-600">Let's get you started in seconds</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Input
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min 10 chars: uppercase, lowercase, number, special)"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10 pr-10"
                  required
                  minLength={10}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button 
                onClick={() => setStep(2)}
                disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.password}
                className="w-full"
                size="lg"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <div className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-green-600 hover:text-green-500 font-medium">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 2: Location (Optional)
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-white/95 backdrop-blur-lg shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Where are you from?</CardTitle>
              <p className="text-gray-600">This helps us customize your experience</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Country (Optional)
                </label>
                <Select 
                  value={formData.location} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="font-medium text-xs text-gray-500 p-2">Popular:</div>
                    {POPULAR_COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                    <div className="font-medium text-xs text-gray-500 p-2 border-t">All Countries:</div>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">
                  <strong>Timezone:</strong> {formData.timezone}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Auto-detected • {new Date().toLocaleTimeString()}
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1"
                  size="lg"
                >
                  {loading ? (
                    <>Creating...</>
                  ) : (
                    <>
                      Create Account
                      <Sparkles className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center">
                <Button 
                  onClick={handleSubmit}
                  variant="ghost"
                  className="text-gray-500 text-sm"
                  disabled={loading}
                >
                  Skip for now
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
      <div className="w-full max-w-md text-center">
        <Card className="bg-white/95 backdrop-blur-lg shadow-xl">
          <CardContent className="p-8">
            <div className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome! 🎉</h1>
            <p className="text-lg text-gray-600 mb-6">
              Your sow2grow account is ready!
            </p>

            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="secondary">🌱 Sow Seeds</Badge>
                <Badge variant="secondary">💝 Bestow Gifts</Badge>
                <Badge variant="secondary">🤝 Join Community</Badge>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Redirecting you to the community farm...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}