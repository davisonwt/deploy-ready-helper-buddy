import { useState, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useSecurityLogging } from "../hooks/useSecurityLogging"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert"
import { useToast } from "../hooks/use-toast"
import { EnhancedSecureInput } from "../components/security/EnhancedSecureInput"
import {
  Sprout, Mail, Lock, Eye, EyeOff, Heart, Users, Sparkles,
  Shield, CheckCircle
} from "lucide-react"
import { FormShell } from "@/components/forms/FormShell"
import { SubmitButton } from "@/components/forms/SubmitButton"
import s2gLogo from "/lovable-uploads/s2g-logo.jpg"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState("")
  const [securityViolations, setSecurityViolations] = useState(0)

  const [searchParams] = useSearchParams();
  const isFirstTimeLogin = searchParams.get('firstTime') === 'true';

  const { login, loginAnonymously, resetPassword } = useAuth()
  const { logSecurityEvent } = useSecurityLogging()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSecurityViolation = async (violationType, details) => {
    setSecurityViolations(prev => prev + 1)
    await logSecurityEvent('login_security_violation', {
      violation_type: violationType,
      details,
      violation_count: securityViolations + 1
    }, 'warning')
    if (securityViolations >= 2) {
      toast({
        variant: "destructive",
        title: "Security Alert",
        description: "Multiple security violations detected. Please review your input.",
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (securityViolations >= 3) {
      toast({
        variant: "destructive",
        title: "Access Blocked",
        description: "Too many security violations. Please refresh and try again.",
      })
      return
    }
    setLoading(true)
    setError("")
    try {
      const result = await login(email, password)
      if (result.success) {
        toast({
          title: "🌱 Welcome back, sower!",
          description: "Redirecting to your orchard…",
        })
        setTimeout(() => navigate("/dashboard", { replace: true }), 50)
      } else {
        setError(result.error || "Login failed")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleGuestAccess = async () => {
    setLoading(true)
    setError("")
    try {
      const result = await loginAnonymously()
      if (result.success) navigate("/dashboard")
      else setError(result.error || "Guest access failed")
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMessage("")
    try {
      const result = await resetPassword(resetEmail)
      if (result.success) {
        setResetMessage("Password reset email sent! Check your inbox.")
        setTimeout(() => {
          setShowForgotPassword(false)
          setResetEmail("")
          setResetMessage("")
        }, 3000)
      } else {
        setResetMessage(result.error || "Failed to send reset email")
      }
    } catch (err) {
      setResetMessage("An unexpected error occurred")
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <FormShell
      backTo="/"
      backLabel="Back to sow2grow"
      eyebrow="Sow • Bestow • Belong"
      icon={Home}
      title="Welcome Home"
      subtitle="Step back into your orchard. Your tribe has been waiting for you."
      benefits={[
        { icon: Users, label: 'Your community awaits' },
        { icon: Heart, label: 'Continue your story' },
        { icon: Sparkles, label: 'Keep growing' },
      ]}
      size="md"
      footer={
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Heart className="h-3 w-3 text-coral-400" />
            <span className="italic">"Give, and it will be given to you…"</span>
            <Heart className="h-3 w-3 text-coral-400" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">Luke 6:38</p>
        </div>
      }
    >
      {isFirstTimeLogin && (
        <Alert className="mb-5 border-emerald-500/40 bg-emerald-500/10">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <AlertTitle className="text-emerald-200">Verification Complete</AlertTitle>
          <AlertDescription className="text-emerald-300/80">
            Please log in for the first time to access all sow2grow features.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="animate-fade-in rounded-xl border-l-4 border-destructive bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Mail className="h-4 w-4 text-amber-300" />
            Email
          </label>
          <EnhancedSecureInput
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onSecurityViolation={handleSecurityViolation}
            sanitizeType="email"
            rateLimitKey="login_form"
            securityLevel="high"
            className="h-12 w-full rounded-xl border-2 border-input-border bg-input px-4 text-foreground shadow-sm transition-all duration-300 placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/40"
            placeholder="your@email.com"
            required
            disabled={loading || securityViolations >= 3}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lock className="h-4 w-4 text-amber-300" />
            Password
          </label>
          <div className="relative">
            <EnhancedSecureInput
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onSecurityViolation={handleSecurityViolation}
              sanitizeType="text"
              rateLimitKey="login_form"
              securityLevel="high"
              className="h-12 w-full rounded-xl border-2 border-input-border bg-input px-4 pr-12 text-foreground shadow-sm transition-all duration-300 placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/40"
              placeholder="Enter your password"
              required
              disabled={loading || securityViolations >= 3}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              disabled={loading || securityViolations >= 3}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <SubmitButton
          loading={loading}
          loadingLabel="Entering your orchard…"
          icon={Sprout}
          disabled={securityViolations >= 3}
        >
          Enter the Garden
        </SubmitButton>

        {securityViolations > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-300" />
              <span className="text-xs font-medium text-amber-200">Security Enhanced Mode Active</span>
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-amber-300 underline-offset-4 transition-colors hover:bg-amber-500/10 hover:text-amber-200 hover:underline"
            onClick={() => setShowForgotPassword(true)}
          >
            Forgot Password?
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-foreground/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="rounded-full bg-card/80 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            New to our community?
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <Link to="/register" className="block">
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl border-2 border-amber-400/40 bg-amber-500/5 text-amber-200 transition-all duration-300 hover:scale-[1.02] hover:border-amber-400/70 hover:bg-amber-500/10"
          >
            <Users className="mr-2 h-4 w-4" />
            Join Our Tribe
          </Button>
        </Link>

        <Button
          variant="ghost"
          onClick={handleGuestAccess}
          disabled={loading}
          className="h-10 w-full text-xs text-muted-foreground hover:bg-card/60 hover:text-foreground"
        >
          {loading ? "Accessing as guest…" : "Continue as Guest"}
        </Button>
      </div>

      {/* Forgot password modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="premium-card w-full max-w-md p-6 animate-scale-in">
            <h3 className="font-display mb-2 text-2xl font-bold text-foreground">Reset Password</h3>
            <p className="mb-4 text-sm text-muted-foreground">Enter your email to receive a reset link.</p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-12 w-full rounded-xl border-2 border-input-border bg-input px-4 text-foreground"
                required
              />
              {resetMessage && (
                <p className={`text-sm ${resetMessage.includes('sent') ? 'text-emerald-400' : 'text-destructive'}`}>{resetMessage}</p>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)} className="flex-1">Cancel</Button>
                <SubmitButton loading={resetLoading} loadingLabel="Sending…" size="md" className="flex-1">Send Reset Link</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </FormShell>
  )
}
