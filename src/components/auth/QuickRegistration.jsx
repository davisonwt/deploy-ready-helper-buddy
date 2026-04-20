import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  User, Mail, Lock, MapPin, Sparkles, ArrowRight, ArrowLeft,
  CheckCircle, Eye, EyeOff, Heart, Users, Zap, Globe2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { countries } from '@/data/countries';
import { validatePassword, getPasswordValidationFeedback } from '@/lib/utils';
import { getReferralCode, clearReferralCookie } from '@/hooks/useReferralCapture';
import { FormShell } from '@/components/forms/FormShell';
import { SubmitButton } from '@/components/forms/SubmitButton';

const POPULAR_COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
  'France', 'Netherlands', 'South Africa', 'India', 'Nigeria'
];

export function QuickRegistration() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '',
    location: '', currency: 'USD',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referralCode: ''
  });

  useEffect(() => {
    const cookieRef = getReferralCode();
    if (cookieRef) setFormData(prev => ({ ...prev, referralCode: cookieRef }));
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!validatePassword(formData.password)) {
      const feedback = getPasswordValidationFeedback(formData.password);
      setError(feedback.feedback.join('. ') || 'Password does not meet security requirements');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await register({
        email: formData.email, password: formData.password,
        first_name: formData.firstName, last_name: formData.lastName,
        location: formData.location, currency: formData.currency,
        timezone: formData.timezone, country: formData.location,
        referral_code: formData.referralCode || null
      });

      if (result.success) {
        if (formData.referralCode) clearReferralCookie();
        setStep(3);
        toast({
          title: "🌱 Welcome to sow2grow!",
          description: "Your account is ready. Get ready to sow & bestow.",
        });
        setTimeout(() => navigate('/'), 2200);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const StepDots = () => (
    <div className="mb-4 flex items-center justify-center gap-2">
      {[1, 2, 3].map((s) => (
        <span
          key={s}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            step === s ? 'w-8 bg-amber-400' : step > s ? 'w-4 bg-emerald-400' : 'w-4 bg-foreground/20'
          }`}
        />
      ))}
    </div>
  );

  // STEP 1
  if (step === 1) {
    return (
      <FormShell
        backTo="/"
        backLabel="Back to sow2grow"
        eyebrow="60-second join"
        icon={Zap}
        title="Welcome — Let's Begin"
        subtitle="Just the essentials. You'll be inside the garden in under a minute."
        benefits={[
          { icon: Users, label: 'Tribe of 250+ sowers' },
          { icon: Heart, label: 'Bestow freely' },
          { icon: Sparkles, label: 'Quick & friendly' },
        ]}
        size="md"
        footer={
          <p className="text-center text-sm text-muted-foreground">
            Already a sower?{' '}
            <Link to="/login" className="font-semibold text-amber-300 hover:text-amber-200 hover:underline">Sign in</Link>
          </p>
        }
      >
        <StepDots />

        {error && (
          <div className="mb-4 animate-fade-in rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="First name"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              className="h-12 rounded-xl border-2 border-input-border bg-input text-foreground"
              required
            />
            <Input
              placeholder="Last name"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              className="h-12 rounded-xl border-2 border-input-border bg-input text-foreground"
              required
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="h-12 rounded-xl border-2 border-input-border bg-input pl-11 text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              🔐 Min 12 chars · Capitals · Small letters · Numbers · Special char (! @ # $ %)
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="At least 12 chars: Aa1! …"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="h-12 rounded-xl border-2 border-input-border bg-input pl-11 pr-11 text-foreground"
                required
                minLength={12}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            onClick={() => setStep(2)}
            disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.password}
            className="group h-14 w-full rounded-2xl bg-gradient-to-r from-amber-500 via-coral-500 to-primary text-base font-semibold text-white shadow-[0_12px_40px_-12px_hsl(var(--amber-500)/0.55)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_18px_48px_-12px_hsl(var(--amber-500)/0.7)] disabled:opacity-50"
          >
            <span>Continue</span>
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </FormShell>
    );
  }

  // STEP 2
  if (step === 2) {
    return (
      <FormShell
        eyebrow="Almost there"
        icon={Globe2}
        title="Where in the World?"
        subtitle="A whisper of context — so we can greet you in your timezone & currency."
        benefits={[{ icon: Sparkles, label: 'Optional but lovely' }]}
        size="md"
      >
        <StepDots />

        {error && (
          <div className="mb-4 animate-fade-in rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              <MapPin className="mr-1 inline h-4 w-4 text-amber-300" />
              Country (Optional)
            </label>
            <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}>
              <SelectTrigger className="h-12 rounded-xl border-2 border-input-border bg-input text-foreground">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2 text-xs font-medium text-muted-foreground">Popular:</div>
                {POPULAR_COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
                <div className="border-t p-2 text-xs font-medium text-muted-foreground">All Countries:</div>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-foreground/10 bg-card/60 p-3 text-sm text-foreground/80">
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-amber-300" />
              <strong className="text-foreground">Timezone:</strong> {formData.timezone}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Auto-detected • {new Date().toLocaleTimeString()}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Referral Code (Optional)</label>
            <Input
              placeholder="S2G-XXXXXXXX"
              value={formData.referralCode}
              onChange={(e) => setFormData(prev => ({ ...prev, referralCode: e.target.value }))}
              className="h-12 rounded-xl border-2 border-amber-400/30 bg-amber-500/5 text-center font-mono tracking-[0.2em] text-foreground"
              maxLength={15}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => setStep(1)}
              variant="outline"
              className="h-12 flex-1 rounded-xl border-2 border-input-border bg-card/40 text-foreground hover:bg-card/70"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <SubmitButton
              type="button"
              onClick={handleSubmit}
              loading={loading}
              loadingLabel="Creating…"
              icon={Sparkles}
              size="md"
              className="flex-[2]"
            >
              Create My Account
            </SubmitButton>
          </div>

          <div className="text-center">
            <Button
              onClick={handleSubmit}
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              Skip for now
            </Button>
          </div>
        </div>
      </FormShell>
    );
  }

  // STEP 3 — SUCCESS
  return (
    <FormShell
      eyebrow="🎉 You're in"
      icon={CheckCircle}
      title="Welcome to the Garden"
      subtitle="Your sow2grow account is ready. Redirecting you to the community farm…"
      size="md"
    >
      <div className="space-y-6 py-4 text-center">
        <div className="mx-auto inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_20px_60px_-20px_hsl(142_76%_36%/0.7)] animate-scale-in">
          <CheckCircle className="h-12 w-12 text-white" />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <Badge className="border-amber-400/40 bg-amber-500/10 text-amber-200">🌱 Sow Seeds</Badge>
          <Badge className="border-coral-400/40 bg-coral-500/10 text-coral-200">💝 Bestow Gifts</Badge>
          <Badge className="border-primary/40 bg-primary/10 text-primary">🤝 Join the Tribe</Badge>
        </div>

        <p className="text-sm italic text-muted-foreground">
          "A good measure, pressed down, shaken together and running over…"
        </p>
      </div>
    </FormShell>
  );
}

export default QuickRegistration;
