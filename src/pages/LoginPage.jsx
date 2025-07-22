import React, { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Sprout, Mail, Lock, Eye, EyeOff, ArrowLeft, Heart, Users, Sparkles } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
      const result = await login(email, password)
      
      if (result.success) {
        navigate("/browse-orchards")
      } else {
        setError(result.error || "Login failed")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-amber-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "4s" }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-amber-200/30 to-yellow-200/30 rounded-full animate-bounce shadow-lg" style={{ animationDuration: "3s", animationDelay: "1s" }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-br from-green-300/20 to-teal-300/20 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "5s", animationDelay: "2s" }}></div>
        <div className="absolute top-1/3 right-1/3 w-16 h-16 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full animate-ping shadow-md" style={{ animationDuration: "6s", animationDelay: "3s" }}></div>
        <div className="absolute bottom-20 right-10 w-20 h-20 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full animate-pulse shadow-lg" style={{ animationDuration: "7s", animationDelay: "4s" }}></div>
      </div>
      
      <div className={`relative z-10 w-full max-w-md transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Enhanced back button */}
        <Link 
          to="/" 
          className="inline-flex items-center text-primary hover:text-primary/80 mb-6 transition-all duration-300 hover:scale-105 font-medium group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Farm
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
          <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
            Welcome Back to Your Farm
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Join your fellow sowers and bestowers in cultivating abundance together
          </p>
        </div>
        
        <Card className="bg-card/95 backdrop-blur-sm border-border shadow-2xl transition-all duration-500 hover:shadow-3xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-xl relative overflow-hidden group">
                <Sprout className="h-10 w-10 text-primary-foreground transition-all duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </div>
            <CardTitle className="text-xl text-card-foreground mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
              Enter Your Orchard
            </CardTitle>
            <Badge variant="secondary" className="bg-secondary/80 text-secondary-foreground border-border/50">
              <Sprout className="h-3 w-3 mr-1" />
              364yhvh Community Farm
            </Badge>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 animate-fade-in">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-primary" />
                  Username
                </label>
                <div className="relative group">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-foreground placeholder:text-muted-foreground hover:border-primary/50"
                    placeholder="your@email.com"
                    required
                  />
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground flex items-center">
                  <Lock className="h-4 w-4 mr-2 text-primary" />
                  Sacred Passphrase
                </label>
                <div className="relative group">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-foreground placeholder:text-muted-foreground hover:border-primary/50 pr-12"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground py-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] font-medium"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Entering Your Orchard...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sow or Bestow
                  </div>
                )}
              </Button>
              
              {/* Forgot Password */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary/80 transition-colors duration-200"
                  onClick={() => {/* TODO: Implement forgot password */}}
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
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Ready to start sowing and bestowing?
              </p>
              <Link to="/register">
                <Button 
                  variant="outline" 
                  className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 hover:scale-105 font-medium"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Join Our Community
                </Button>
              </Link>
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
    </div>
  )
}