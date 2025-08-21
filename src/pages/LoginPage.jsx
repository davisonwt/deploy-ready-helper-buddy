import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useSecurityLogging } from "../hooks/useSecurityLogging"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { useToast } from "../hooks/use-toast"
import { EnhancedSecureInput } from "../components/security/EnhancedSecureInput"
import { Sprout, Mail, Lock, Eye, EyeOff, ArrowLeft, Heart, Users, Sparkles, Shield } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState("")
  const [securityViolations, setSecurityViolations] = useState(0)
  
  const { login, loginAnonymously, resetPassword } = useAuth()
  const { logSecurityEvent } = useSecurityLogging()
  const { toast } = useToast()
  const navigate = useNavigate()
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const handleSecurityViolation = async (violationType, details) => {
    setSecurityViolations(prev => prev + 1)
    
    await logSecurityEvent('login_security_violation', {
      violation_type: violationType,
      details: details,
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
        console.log('✅ Login successful, navigating to dashboard...')
        // Small delay to ensure auth state is updated
        setTimeout(() => {
          navigate("/dashboard", { replace: true })
        }, 50)
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
      
      if (result.success) {
        navigate("/dashboard")
      } else {
        setError(result.error || "Guest access failed")
      }
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-amber-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/30 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "4s" }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-green-200/30 rounded-full animate-bounce shadow-lg" style={{ animationDuration: "3s", animationDelay: "1s" }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-amber-200/20 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "5s", animationDelay: "2s" }}></div>
        <div className="absolute top-1/3 right-1/3 w-16 h-16 bg-blue-300/20 rounded-full animate-ping shadow-md" style={{ animationDuration: "6s", animationDelay: "3s" }}></div>
        <div className="absolute bottom-20 right-10 w-20 h-20 bg-green-300/20 rounded-full animate-pulse shadow-lg" style={{ animationDuration: "7s", animationDelay: "4s" }}></div>
      </div>
      
      <div className={`relative z-10 w-full max-w-lg transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Enhanced back button */}
        <Link 
          to="/" 
          className="inline-flex items-center text-blue-700 hover:text-blue-600 mb-6 transition-all duration-300 hover:scale-105 font-medium group bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md hover:shadow-lg"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to sow2grow
        </Link>
        
        {/* Welcome message for community */}
        <div className="text-center mb-6">
          <div className="flex justify-center space-x-2 mb-3">
            <div className="flex items-center bg-gradient-to-r from-green-100 to-green-200 px-3 py-1 rounded-full">
              <Users className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm text-green-700 font-medium">Community</span>
            </div>
            <div className="flex items-center bg-gradient-to-r from-purple-100 to-purple-200 px-3 py-1 rounded-full">
              <Heart className="h-4 w-4 text-purple-600 mr-1" />
              <span className="text-sm text-purple-700 font-medium">Support</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-blue-600 mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
            Welcome Back to sow2grow
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Enter your orchard and continue sowing & bestowing
          </p>
        </div>
        
        <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl transition-all duration-500 hover:shadow-3xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-blue-100">
                <img 
                  src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-images/logo.jpeg" 
                  alt="sow2grow logo" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <CardTitle className="text-xl text-blue-700 mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
              Enter Your Orchard
            </CardTitle>
            <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-green-500 text-white border-0">
              <Sprout className="h-3 w-3 mr-1" />
              364yhvh Community Farm
            </Badge>
          </CardHeader>
          
        <div className="console-log-debug bg-red-100 p-4 text-xs">
          Auth Debug: {JSON.stringify({ isAuthenticated, loading })}
        </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 animate-fade-in">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-blue-700 flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-blue-500" />
                  Username
                </label>
                <div className="relative group">
                  <EnhancedSecureInput
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onSecurityViolation={handleSecurityViolation}
                    sanitizeType="email"
                    rateLimitKey="login_form"
                    securityLevel="high"
                    className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300 text-foreground placeholder:text-muted-foreground hover:border-gray-300 shadow-sm hover:shadow-md"
                    placeholder="your@email.com"
                    required
                    disabled={loading || securityViolations >= 3}
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/5 to-green-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-green-700 flex items-center">
                  <Lock className="h-4 w-4 mr-2 text-green-500" />
                  Password
                </label>
                <div className="relative group">
                  <EnhancedSecureInput
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onSecurityViolation={handleSecurityViolation}
                    sanitizeType="text"
                    rateLimitKey="login_form"
                    securityLevel="high"
                    className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all duration-300 text-foreground placeholder:text-muted-foreground hover:border-gray-300 shadow-sm hover:shadow-md pr-12"
                    placeholder="Enter your password"
                    required
                    disabled={loading || securityViolations >= 3}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                    disabled={loading || securityViolations >= 3}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-400/5 to-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white py-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] font-medium"
                disabled={loading || securityViolations >= 3}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Entering Your Orchard...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sow or Bestow
                  </div>
                )}
              </Button>
              
              {/* Security Status Indicator */}
              {securityViolations > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs text-yellow-700 font-medium">
                      Security Enhanced Mode Active
                    </span>
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">
                    Additional validation is being performed to protect your account.
                  </p>
                </div>
              )}
              
              {/* Forgot Password */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors duration-200"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot Password?
                </button>
              </div>
            </form>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">New to our community?</span>
              </div>
            </div>
            
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground mb-3">
                Ready to start sowing and bestowing?
              </p>
              <div className="flex flex-col gap-2">
                <Link to="/register">
                  <Button 
                    variant="outline" 
                    className="w-full border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-500 transition-all duration-300 hover:scale-105 font-medium"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Join Our Community
                  </Button>
                </Link>
                
                <Button 
                  variant="ghost" 
                  onClick={handleGuestAccess}
                  disabled={loading}
                  className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-all duration-300 text-sm"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
                      Accessing as Guest...
                    </div>
                  ) : (
                    <>Continue as Guest</>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <div className="text-center space-y-2">
                <div className="flex justify-center items-center space-x-2 text-xs text-muted-foreground">
                  <Heart className="h-3 w-3 text-red-400" />
                  <span>"Give, and it will be given to you..."</span>
                  <Heart className="h-3 w-3 text-red-400" />
                </div>
                <p className="text-xs text-muted-foreground italic">Luke 6:38</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Community stats preview */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="bg-card/60 backdrop-blur-sm rounded-lg p-3 border border-border/50 hover:bg-card/80 transition-all duration-300">
            <div className="text-lg font-bold text-primary">250+</div>
            <div className="text-xs text-muted-foreground">Sowers</div>
          </div>
          <div className="bg-card/60 backdrop-blur-sm rounded-lg p-3 border border-border/50 hover:bg-card/80 transition-all duration-300">
            <div className="text-lg font-bold text-secondary">180+</div>
            <div className="text-xs text-muted-foreground">Bestowers</div>
          </div>
          <div className="bg-card/60 backdrop-blur-sm rounded-lg p-3 border border-border/50 hover:bg-card/80 transition-all duration-300">
            <div className="text-lg font-bold text-accent">45+</div>
            <div className="text-xs text-muted-foreground">Orchards</div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-blue-700 mb-4 text-center">Reset Password</h3>
            
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {resetMessage && (
                <div className={`p-3 rounded-lg text-sm text-center ${
                  resetMessage.includes('sent') 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {resetMessage}
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="resetEmail" className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="resetEmail"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={resetLoading}
                >
                  {resetLoading ? "Sending..." : "Send Reset Email"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetEmail("")
                    setResetMessage("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}