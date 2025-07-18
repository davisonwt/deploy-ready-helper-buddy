import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectScrollUpButton, SelectScrollDownButton } from "../components/ui/select"
import { Sprout, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { countries } from "../data/countries"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    location: "",
    phone: "",
    currency: "USD"
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const { register } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
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
        currency: formData.currency
      })
      
      if (result.success) {
        // Send welcome email to user
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: formData.email,
              firstName: formData.firstName,
              lastName: formData.lastName,
            }
          })
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError)
        }

        // Send admin notification
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
        } catch (notificationError) {
          console.error('Failed to send admin notification:', notificationError)
        }

        toast({
          title: "Welcome to sow2grow! 🌱",
          description: "Please check your email to verify your account before continuing.",
        })
        
        navigate("/")
      } else {
        setError(result.error || "Registration failed")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-amber-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-green-200/30 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "4s" }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-blue-200/30 rounded-full animate-bounce shadow-lg" style={{ animationDuration: "3s", animationDelay: "1s" }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-amber-200/20 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "5s", animationDelay: "2s" }}></div>
        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-green-300/20 rounded-full animate-bounce shadow-md" style={{ animationDuration: "4s", animationDelay: "3s" }}></div>
        
        {/* Floating particles */}
        <div className="absolute top-1/3 left-1/3 w-4 h-4 bg-green-400/40 rounded-full animate-ping" style={{ animationDelay: "1s" }}></div>
        <div className="absolute bottom-1/3 right-1/3 w-3 h-3 bg-blue-400/40 rounded-full animate-ping" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-2/3 left-1/5 w-2 h-2 bg-amber-400/40 rounded-full animate-ping" style={{ animationDelay: "3s" }}></div>
      </div>
      
      <div className="relative z-10 w-full max-w-lg">
        {/* Beautiful back to home link */}
        <Link to="/" className="inline-flex items-center text-green-700 hover:text-green-600 mb-8 transition-all duration-300 hover:scale-105 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md hover:shadow-lg">
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="font-medium">Back to sow2grow</span>
        </Link>
        
        <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 overflow-hidden">
          {/* Beautiful gradient header */}
          <div className="bg-gradient-to-r from-green-600 via-blue-600 to-green-600 p-1">
            <div className="bg-white/95 rounded-t-lg">
              <CardHeader className="text-center pb-8 pt-8">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-green-100">
                    <img 
                      src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-images/logo.jpeg" 
                      alt="sow2grow logo" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-700 to-blue-700 bg-clip-text text-transparent mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
                  Join the Community
                </CardTitle>
                <p className="text-gray-600 text-lg mb-4">Begin your journey in the 364yhvh community farm</p>
                <div className="flex justify-center">
                  <Badge className="bg-gradient-to-r from-green-600 to-blue-600 text-white border-0 px-6 py-3 text-base font-bold shadow-lg rounded-full">
                    sow2grow • community farm stall
                  </Badge>
                </div>
              </CardHeader>
            </div>
          </div>
          
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4 shadow-sm animate-fade-in">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800 font-medium">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-semibold text-green-700">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 bg-olive-green rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all duration-300 text-light-beige hover:border-gray-300 shadow-sm hover:shadow-md text-center"
                    placeholder="Enter first name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-semibold text-blue-700">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 bg-olive-green rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all duration-300 text-light-beige hover:border-gray-300 shadow-sm hover:shadow-md text-center"
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-blue-700">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 bg-olive-green rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300 text-light-beige hover:border-gray-300 shadow-sm hover:shadow-md text-center"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-semibold text-purple-700">
                    Phone <span className="text-purple-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 bg-olive-green rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all duration-300 text-light-beige hover:border-gray-300 shadow-sm hover:shadow-md text-center"
                    placeholder="+1234567890"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="location" className="text-sm font-semibold text-amber-700">
                    Country <span className="text-amber-500 font-normal">(Optional)</span>
                  </label>
                  <Select value={formData.location} onValueChange={(value) => setFormData({...formData, location: value})}>
                    <SelectTrigger className="w-full px-4 py-3 border-2 border-gray-200 bg-olive-green rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all duration-300 text-light-beige hover:border-gray-300 shadow-sm hover:shadow-md text-center">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                      <SelectScrollUpButton />
                      {countries.map((country) => (
                        <SelectItem 
                          key={country.code} 
                          value={country.name}
                          className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer"
                        >
                          {country.name}
                        </SelectItem>
                      ))}
                      <SelectScrollDownButton />
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-indigo-700">
                    Preferred Currency
                  </label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({...formData, currency: value})}>
                    <SelectTrigger className="w-full px-4 py-3 border-2 border-gray-200 bg-olive-green rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-300 text-light-beige hover:border-gray-300 shadow-sm hover:shadow-md text-center">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                      <SelectScrollUpButton />
                      <SelectItem value="USD" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">EUR - Euro</SelectItem>
                      <SelectItem value="GBP" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">GBP - British Pound</SelectItem>
                      <SelectItem value="CAD" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">AUD - Australian Dollar</SelectItem>
                      <SelectItem value="JPY" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">JPY - Japanese Yen</SelectItem>
                      <SelectItem value="CHF" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">CHF - Swiss Franc</SelectItem>
                      <SelectItem value="CNY" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">CNY - Chinese Yuan</SelectItem>
                      <SelectItem value="INR" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">INR - Indian Rupee</SelectItem>
                      <SelectItem value="BRL" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">BRL - Brazilian Real</SelectItem>
                      <SelectItem value="ZAR" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">ZAR - South African Rand</SelectItem>
                      <SelectItem value="MXN" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">MXN - Mexican Peso</SelectItem>
                      <SelectItem value="KRW" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">KRW - South Korean Won</SelectItem>
                      <SelectItem value="SGD" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">SGD - Singapore Dollar</SelectItem>
                      <SelectItem value="NZD" className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer">NZD - New Zealand Dollar</SelectItem>
                      <SelectScrollDownButton />
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-green-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 bg-olive-green rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all duration-300 text-light-beige hover:border-gray-300 shadow-sm hover:shadow-md text-center"
                    placeholder="Create a secure password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors p-1 rounded-full hover:bg-green-50/20 z-10"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-semibold text-green-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 bg-olive-green rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all duration-300 text-light-beige hover:border-gray-300 shadow-sm hover:shadow-md text-center"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors p-1 rounded-full hover:bg-green-50/20 z-10"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 via-blue-600 to-green-600 hover:from-green-700 hover:via-blue-700 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] focus:ring-4 focus:ring-green-300"
              >
                <div className="flex items-center justify-center">
                  {loading && <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>}
                  <Sprout className="h-5 w-5 mr-2" />
                  <span>Become a sower and bestower</span>
                </div>
              </Button>
            </form>
            
            <div className="mt-8 text-center">
              <p className="text-royal-purple">
                Already part of our community?{" "}
                <Link to="/login" className="text-cyan-accent hover:text-cyan-accent/80 font-semibold transition-colors hover:underline">
                  Sign In Here
                </Link>
              </p>
            </div>
            
            {/* Beautiful divider with scripture */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 shadow-sm">
                <p className="text-sm text-green-700 italic font-medium">
                  "Give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap."
                </p>
                <p className="text-xs text-green-600 font-semibold mt-2">— Luke 6:38</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
