import { useState, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectScrollUpButton, SelectScrollDownButton } from "../components/ui/select"
import { SecureInput } from "../components/ui/secure-input"
import {
  Sprout, Lock, Eye, EyeOff, Heart, Users, Globe2, Sparkles,
  ShieldCheck, Gift
} from "lucide-react"
import { countries } from "../data/countries"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { QuickRegistration } from "../components/auth/QuickRegistration"
import { getReferralCode, clearReferralCookie } from "@/hooks/useReferralCapture"
import { FormShell } from "@/components/forms/FormShell"
import { SubmitButton } from "@/components/forms/SubmitButton"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    location: "",
    phone: "",
    currency: "USD",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    country: "",
    referralCode: ""
  })

  useEffect(() => {
    const cookieRef = getReferralCode();
    if (cookieRef) {
      setFormData(prev => ({ ...prev, referralCode: cookieRef }));
    }
  }, []);
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showQuickRegistration, setShowQuickRegistration] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  if (showQuickRegistration) {
    return <QuickRegistration />;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      const msg = "Passwords do not match. Please re-type the same password in both boxes."
      setError(msg)
      toast({ variant: "destructive", title: "Passwords don't match", description: msg })
      setLoading(false)
      return
    }

    if (formData.password.length < 12) {
      const msg = "Password must be at least 12 characters long."
      setError(msg)
      toast({ variant: "destructive", title: "Password too short", description: msg })
      setLoading(false)
      return
    }

    const hasUpper = /[A-Z]/.test(formData.password);
    const hasLower = /[a-z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    const hasSpecial = /[^A-Za-z0-9]/.test(formData.password);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      const msg = "Password must contain uppercase letters, lowercase letters, numbers, and at least one special character (e.g. !@#$%)."
      setError(msg)
      toast({ variant: "destructive", title: "Password too simple", description: msg })
      setLoading(false)
      return
    }

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        location: formData.location,
        phone: formData.phone,
        currency: formData.currency,
        timezone: formData.timezone,
        country: formData.location,
        username: formData.email.split('@')[0],
        referral_code: formData.referralCode || null
      })

      if (result.success) {
        if (formData.referralCode) clearReferralCookie();

        const escapeHtml = (text) => {
          if (!text) return '';
          const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
          return String(text).replace(/[&<>"']/g, (m) => map[m]);
        };

        try {
          await supabase.functions.invoke('send_brevo_email', {
            body: {
              to: [formData.email],
              subject: "Welcome to sow2grow! 🌱",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fffe;">
                  <h1 style="color: #059669; text-align: center; margin-bottom: 30px;">Welcome to sow2grow! 🌱</h1>
                  <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <h2 style="color: #065f46;">Hello ${escapeHtml(formData.firstName)}!</h2>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                      Thank you for joining our community farm! We're excited to have you as part of the sow2grow family.
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                      You're now ready to start your journey as a sower and bestower in our 364yhvh community farm.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${window.location.origin}" style="background: linear-gradient(to right, #059669, #2563eb, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Start Exploring
                      </a>
                    </div>
                    <p style="color: #6b7280; font-style: italic; text-align: center; margin-top: 30px;">
                      "Give, and it will be given to you..." - Luke 6:38
                    </p>
                  </div>
                </div>
              `,
              from: "shalom@sow2grow.org"
            }
          })
        } catch (emailError) { console.error('Failed to send welcome email:', emailError) }

        try {
          await supabase.functions.invoke('send-admin-notification', {
            body: {
              email: formData.email,
              firstName: formData.firstName,
              lastName: formData.lastName,
              location: formData.location,
              phone: formData.phone,
              currency: formData.currency
            }
          })
        } catch (notificationError) { console.error('Failed to send admin notification:', notificationError) }

        toast({
          title: "🌱 Welcome to sow2grow!",
          description: "Almost there — let's protect your account with security questions.",
        })

        navigate("/security-questions-setup")
      } else {
        const raw = (result.error || "Registration failed").toString()
        const lower = raw.toLowerCase()
        let friendly = raw
        if (lower.includes('already') && (lower.includes('registered') || lower.includes('exists') || lower.includes('user'))) {
          friendly = "An account with this email already exists. Please log in instead."
        } else if (lower.includes('invalid') && (lower.includes('credentials') || lower.includes('login'))) {
          // This typically means the account was actually created on a previous attempt
          // but the network response was lost. Guide the user to log in instead of panicking.
          friendly = "Looks like your account may have been created already. Please try logging in with the same email and password."
        } else if (lower.includes('password') && lower.includes('weak')) {
          friendly = "Password is too weak. Use at least 12 characters with uppercase, lowercase, numbers and a special character."
        } else if (lower.includes('rate') || lower.includes('too many')) {
          friendly = "Too many attempts. Please wait a few minutes and try again."
        } else if (lower.includes('invalid') && lower.includes('email')) {
          friendly = "That email address looks invalid. Please double-check it."
        }
        setError(friendly)
        toast({ variant: "destructive", title: "Registration failed", description: friendly })
      }
    } catch (err) {
      const msg = err?.message || "An unexpected error occurred. Please try again."
      setError(msg)
      toast({ variant: "destructive", title: "Something went wrong", description: msg })
    } finally {
      setLoading(false)
    }
  }

  const pwd = formData.password || ""
  const pwdChecks = {
    length: pwd.length >= 12,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
    match: pwd.length > 0 && pwd === formData.confirmPassword,
  }

  return (
    <FormShell
      backTo="/"
      backLabel="Back to sow2grow"
      eyebrow="Sow • Bestow • Belong"
      icon={Sprout}
      title="Plant Your Seed in the Garden"
      subtitle="Join a global tribe of sowers and bestowers — where every gift returns a hundredfold. Your story starts the moment you sign up."
      benefits={[
        { icon: Users, label: 'Global tribal community' },
        { icon: Heart, label: 'Bestow & receive freely' },
        { icon: Globe2, label: 'Multi-currency, your timezone' },
        { icon: ShieldCheck, label: 'Secure by default' },
      ]}
      size="lg"
      footer={
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already sowing with us?{' '}
            <Link to="/login" className="font-semibold text-amber-300 underline-offset-4 transition-colors hover:text-amber-200 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      }
    >
      {/* Mode toggle */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          onClick={() => setShowQuickRegistration(true)}
          size="sm"
          className="bg-gradient-to-r from-amber-500 to-coral-500 text-white hover:scale-105 hover:from-amber-400 hover:to-coral-400"
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          60-Second Quick Join
        </Button>
        <Badge variant="secondary" className="border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-amber-200">
          You're using the full registration form
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account policy */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Gift className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">One email, one orchard</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Each email is limited to one sow2grow account. Already have one? Use the login page.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="animate-fade-in rounded-xl border-l-4 border-destructive bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">{error}</p>
            {(error.toLowerCase().includes('already') || error.toLowerCase().includes('exists') || error.toLowerCase().includes('log in')) && (
              <Link
                to="/login"
                className="mt-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                Go to Login Page
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-semibold text-foreground">First Name</label>
            <SecureInput
              id="firstName" name="firstName" type="text"
              value={formData.firstName} onChange={handleChange}
              sanitizeType="text" maxLength={50} rateLimitKey="registration_form"
              className="w-full rounded-xl border-2 border-input-border bg-input px-4 py-3 text-foreground shadow-sm transition-all duration-300 placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/40"
              placeholder="Your first name"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm font-semibold text-foreground">Last Name</label>
            <SecureInput
              id="lastName" name="lastName" type="text"
              value={formData.lastName} onChange={handleChange}
              sanitizeType="text" maxLength={50} rateLimitKey="registration_form"
              className="w-full rounded-xl border-2 border-input-border bg-input px-4 py-3 text-foreground shadow-sm transition-all duration-300 placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/40"
              placeholder="Your last name"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-semibold text-foreground">Email Address</label>
            <SecureInput
              id="email" name="email" type="email"
              value={formData.email} onChange={handleChange}
              sanitizeType="email" rateLimitKey="registration_form"
              className="w-full rounded-xl border-2 border-input-border bg-input px-4 py-3 text-foreground shadow-sm transition-all duration-300 placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/40"
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-semibold text-foreground">
              Phone <span className="font-normal text-muted-foreground">(Optional)</span>
            </label>
            <SecureInput
              id="phone" name="phone" type="tel"
              value={formData.phone} onChange={handleChange}
              sanitizeType="phone" rateLimitKey="registration_form"
              className="w-full rounded-xl border-2 border-input-border bg-input px-4 py-3 text-foreground shadow-sm transition-all duration-300 placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/40"
              placeholder="+1234567890"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-semibold text-foreground">
              Country <span className="font-normal text-muted-foreground">(Optional)</span>
            </label>
            <Select value={formData.location} onValueChange={(value) => setFormData({ ...formData, location: value, country: value })}>
              <SelectTrigger className="w-full rounded-xl border-2 border-input-border bg-input px-4 py-3 text-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/40">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent className="z-50 max-h-72">
                <SelectScrollUpButton />
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.name} className="cursor-pointer">
                    {country.name}
                  </SelectItem>
                ))}
                <SelectScrollDownButton />
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Timezone <span className="font-normal text-muted-foreground">(Auto)</span>
            </label>
            <div className="w-full truncate rounded-xl border-2 border-input-border bg-input px-4 py-3 text-sm text-foreground/80">
              🌍 {formData.timezone}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Preferred Currency</label>
          <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
            <SelectTrigger className="w-full rounded-xl border-2 border-input-border bg-input px-4 py-3 text-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/40">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectScrollUpButton />
              {['USD','EUR','GBP','CAD','AUD','JPY','CHF','CNY','INR','BRL','ZAR','MXN','KRW','SGD','NZD'].map((c) => (
                <SelectItem key={c} value={c} className="cursor-pointer">{c}</SelectItem>
              ))}
              <SelectScrollDownButton />
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="referralCode" className="text-sm font-semibold text-foreground">
            Referral Code <span className="font-normal text-muted-foreground">(Optional)</span>
          </label>
          <SecureInput
            id="referralCode" name="referralCode" type="text"
            value={formData.referralCode} onChange={handleChange}
            sanitizeType="text" maxLength={15} rateLimitKey="registration_form"
            className="w-full rounded-xl border-2 border-amber-400/30 bg-amber-500/5 px-4 py-3 text-center font-mono tracking-[0.2em] text-foreground shadow-sm transition-all duration-300 placeholder:text-muted-foreground hover:border-amber-400/60 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
            placeholder="S2G-XXXXXXXX"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-semibold text-foreground">Password</label>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
            🔐 At least <strong>12 characters</strong> with <strong>capitals</strong>, <strong>small letters</strong>, <strong>numbers</strong>, and a <strong>special character</strong> (e.g. ! @ # $ % &amp; *).
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password" name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password} onChange={handleChange}
              className="w-full rounded-xl border-2 border-input-border bg-input py-3 pl-12 pr-12 text-foreground shadow-sm transition-all duration-300 placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/40"
              placeholder="At least 12 chars: Aa1! …"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-xs sm:grid-cols-5">
            {[
              ['length', '12+ chars'], ['upper', 'Capital'], ['lower', 'Small'], ['number', 'Number'], ['special', 'Special'],
            ].map(([key, label]) => (
              <li key={key} className={pwdChecks[key] ? "flex items-center gap-1 font-semibold text-emerald-400" : "flex items-center gap-1 text-muted-foreground"}>
                <span>{pwdChecks[key] ? "✓" : "•"}</span> {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              id="confirmPassword" name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword} onChange={handleChange}
              className="w-full rounded-xl border-2 border-input-border bg-input py-3 pl-12 pr-12 text-foreground shadow-sm transition-all duration-300 placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/40"
              placeholder="Confirm your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {pwdChecks.match && (
            <p className="mt-1 text-xs font-medium text-emerald-400 animate-fade-in">✓ Passwords match perfectly</p>
          )}
        </div>

        <SubmitButton loading={loading} loadingLabel="Planting your seed…" icon={Sprout}>
          Become a Sower & Bestower
        </SubmitButton>
      </form>
    </FormShell>
  )
}
