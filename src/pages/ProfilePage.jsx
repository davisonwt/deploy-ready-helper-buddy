import { useState, useRef, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useToast } from "../hooks/use-toast"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { 
  User, 
  Mail, 
  MapPin, 
  Phone, 
  Edit, 
  Save, 
  X,
  Sprout,
  Heart,
  TrendingUp,
  Users,
  Star,
  Calendar,
  Shield,
  Camera,
  Upload,
  Globe,
  Link,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Music,
  Sparkles,
  Crown,
  Award,
  TreePine
} from "lucide-react"
import { QuickProfileSetup } from "../components/profile/QuickProfileSetup"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import Journal from "../components/journal/Journal"
import RecipesPage from "./RecipesPage"

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const location = useLocation()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [pictureError, setPictureError] = useState("")
  const [socialLinksError, setSocialLinksError] = useState({})
  const [mounted, setMounted] = useState(false)
  const [showQuickSetup, setShowQuickSetup] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const fileInputRef = useRef(null)
  
  useEffect(() => {
    setMounted(true)
    
    // Show message if redirected here for missing info
    if (location.state?.message) {
      toast({
        title: "Complete Your Profile",
        description: location.state.message,
        duration: 5000,
      })
      setEditing(true) // Auto-enter edit mode
    }
  }, [location.state, toast])
  
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    display_name: user?.display_name || "",
    location: user?.location || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    website: user?.website || "",
    tiktok_url: user?.tiktok_url || "",
    instagram_url: user?.instagram_url || "",
    facebook_url: user?.facebook_url || "",
    twitter_url: user?.twitter_url || "",
    youtube_url: user?.youtube_url || "",
    show_social_media: user?.show_social_media !== false,
    avatar_url: user?.avatar_url || null,
    preferred_currency: user?.preferred_currency || "USD",
    country: user?.country || "",
    timezone: user?.timezone || ""
  })
  
  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        display_name: user?.display_name || "",
        location: user?.location || "",
        phone: user?.phone || "",
        bio: user?.bio || "",
        website: user?.website || "",
        tiktok_url: user?.tiktok_url || "",
        instagram_url: user?.instagram_url || "",
        facebook_url: user?.facebook_url || "",
        twitter_url: user?.twitter_url || "",
        youtube_url: user?.youtube_url || "",
        show_social_media: user?.show_social_media !== false,
        avatar_url: user?.avatar_url || null,
        preferred_currency: user?.preferred_currency || "USD",
        country: user?.country || "",
        timezone: user?.timezone || ""
      })
    }
  }, [user])
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }))
  }
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setPictureError("Please upload a JPEG, PNG, or WebP image")
      return
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setPictureError("Image size must be less than 5MB")
      return
    }
    
    setUploadingPicture(true)
    setPictureError("")
    
    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Data = e.target.result
        
        // Set the image directly (simplified without backend validation)
        setFormData(prev => ({
          ...prev,
          avatar_url: base64Data
        }))
        setPictureError("")
        setUploadingPicture(false)
      }
      
      reader.onerror = () => {
        setPictureError("Failed to read the image file")
        setUploadingPicture(false)
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      setPictureError("Failed to process the image")
      setUploadingPicture(false)
    }
  }
  
  const validateSocialLinks = async () => {
    // Simplified validation without backend API
    const errors = {}
    
    // Basic URL validation for social links
    const urlPattern = /^https?:\/\/.+/
    
    if (formData.tiktok_url && !urlPattern.test(formData.tiktok_url)) {
      errors.tiktok = "Please enter a valid TikTok URL"
    }
    
    if (formData.instagram_url && !urlPattern.test(formData.instagram_url)) {
      errors.instagram = "Please enter a valid Instagram URL"
    }
    
    if (formData.facebook_url && !urlPattern.test(formData.facebook_url)) {
      errors.facebook = "Please enter a valid Facebook URL"
    }
    
    if (formData.twitter_url && !urlPattern.test(formData.twitter_url)) {
      errors.twitter = "Please enter a valid Twitter URL"
    }
    
    if (formData.youtube_url && !urlPattern.test(formData.youtube_url)) {
      errors.youtube = "Please enter a valid YouTube URL"
    }
    
    setSocialLinksError(errors)
    return Object.keys(errors).length === 0
  }
  
  const handleSave = async () => {
    setLoading(true)
    try {
      // Validate social links first
      const socialLinksValid = await validateSocialLinks()
      if (!socialLinksValid) {
        setLoading(false)
        return
      }
      
      const result = await updateProfile(formData)
      if (result.success) {
        setEditing(false)
        setPictureError("")
        setSocialLinksError({})
      }
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCancel = () => {
    setFormData({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      display_name: user?.display_name || "",
      location: user?.location || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
      website: user?.website || "",
      tiktok_url: user?.tiktok_url || "",
      instagram_url: user?.instagram_url || "",
      facebook_url: user?.facebook_url || "",
      twitter_url: user?.twitter_url || "",
      youtube_url: user?.youtube_url || "",
      show_social_media: user?.show_social_media !== false,
      avatar_url: user?.avatar_url || null,
      preferred_currency: user?.preferred_currency || "USD",
      country: user?.country || "",
      timezone: user?.timezone || ""
    })
    setEditing(false)
    setPictureError("")
    setSocialLinksError({})
  }
  
  const removePicture = () => {
    setFormData(prev => ({
      ...prev,
      avatar_url: null
    }))
    setPictureError("")
  }
  
  // Get social media platform icon
  const getSocialIcon = (platform) => {
    switch (platform) {
      case 'tiktok':
        return <Music className="h-4 w-4" />
      case 'instagram':
        return <Instagram className="h-4 w-4" />
      case 'facebook':
        return <Facebook className="h-4 w-4" />
      case 'twitter':
        return <Twitter className="h-4 w-4" />
      case 'youtube':
        return <Youtube className="h-4 w-4" />
      default:
        return <Link className="h-4 w-4" />
    }
  }
  
  // Mock user stats
  const userStats = {
    joinedDate: "January 2024",
    totalBestowed: 2450,
    totalReceived: 1800,
    orchardsCreated: 3,
    orchardsSupported: 12,
    communityRank: "Faithful Sower",
    verificationLevel: "Verified"
  }

  // Show Quick Setup if requested
  if (showQuickSetup) {
    return (
      <QuickProfileSetup
        onComplete={() => setShowQuickSetup(false)}
        onClose={() => setShowQuickSetup(false)}
      />
    );
  }
  
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#001f3f' }}>

      {/* Enhanced floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-green-200/20 to-emerald-200/20 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "6s" }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full animate-bounce shadow-lg" style={{ animationDuration: "4s", animationDelay: "1s" }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-br from-blue-300/15 to-indigo-300/15 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "8s", animationDelay: "2s" }}></div>
        <div className="absolute top-1/3 right-1/3 w-16 h-16 bg-gradient-to-br from-amber-200/20 to-yellow-200/20 rounded-full animate-ping shadow-md" style={{ animationDuration: "10s", animationDelay: "3s" }}></div>
      </div>

      {/* Content */}
      <div className={`relative z-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-6xl mx-auto space-y-8 p-6">
          {/* Tabs for Profile and Journal */}
          <div className="flex justify-center mb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex justify-center gap-4 bg-card/80 border-2 border-border shadow-lg">
                <TabsTrigger 
                  value="profile" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <User className="h-4 w-4" />
                  My Profile
                </TabsTrigger>
                <TabsTrigger 
                  value="journal" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Calendar className="h-4 w-4" />
                  My Journal
                </TabsTrigger>
                <TabsTrigger 
                  value="recipes" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Sparkles className="h-4 w-4" />
                  My Recipes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6 space-y-8">
          {/* Enhanced Header */}
          <div className="text-center">
            <div className="bg-card text-card-foreground backdrop-blur-md rounded-3xl p-8 mx-auto max-w-4xl border shadow-2xl">
              <div className="flex justify-center mb-6 relative">
                {/* Enhanced Profile Picture */}
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden shadow-2xl border-4 border-primary/20 transition-all duration-500 group-hover:scale-105 group-hover:shadow-3xl">
                    {formData.avatar_url ? (
                      <img 
                        src={formData.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center relative overflow-hidden">
                        <User className="h-16 w-16 text-primary-foreground z-10" />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Floating elements around profile */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-success/80 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    <CheckCircle className="h-4 w-4 text-success-foreground" />
                  </div>
                  
                  {editing && (
                    <div className="absolute -bottom-3 -right-3">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPicture}
                        size="sm"
                        className="rounded-full w-12 h-12 p-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"
                      >
                        {uploadingPicture ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground border-t-transparent" />
                        ) : (
                          <Camera className="h-5 w-5" />
                        )}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Enhanced Profile Picture Error */}
              {pictureError && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl backdrop-blur-sm animate-fade-in">
                  <div className="flex items-center justify-center gap-3 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">{pictureError}</span>
                  </div>
                </div>
              )}
              
              <h1 className="text-5xl font-bold text-primary mb-3 animate-fade-in" style={{ 
                fontFamily: "Playfair Display, serif"
              }}>
                My Farm Profile
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                Cultivating connections in the 364yhvh Community Farm
              </p>
              
              {/* Enhanced Badges */}
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20 px-4 py-2 text-sm font-medium hover:bg-success/20 transition-colors">
                  <Sprout className="h-4 w-4 mr-2" />
                  Farm Stall Owner
                </Badge>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm font-medium hover:bg-primary/20 transition-colors">
                  <Shield className="h-4 w-4 mr-2" />
                  {userStats.verificationLevel}
                </Badge>
                <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20 px-4 py-2 text-sm font-medium hover:bg-warning/20 transition-colors">
                  <Crown className="h-4 w-4 mr-2" />
                  {userStats.communityRank}
                </Badge>
              </div>
              
              {/* Community Stats Preview */}
              <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{userStats.orchardsCreated}</div>
                  <div className="text-sm text-muted-foreground">Orchards</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{userStats.orchardsSupported}</div>
                  <div className="text-sm text-muted-foreground">Supported</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">23</div>
                  <div className="text-sm text-muted-foreground">People Helped</div>
                </div>
              </div>
            </div>
          </div>
        
          {/* Enhanced Profile Information */}
          <Card className="bg-card/95 backdrop-blur-md border-border/30 shadow-2xl transition-all duration-500 hover:shadow-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
              <CardTitle className="text-foreground text-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                Personal Information
              </CardTitle>
              {!editing ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowQuickSetup(true)}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Quick Setup
                    </Button>
                    <Button
                      onClick={() => setEditing(true)}
                      variant="outline"
                      size="sm"
                      className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 hover:scale-105"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Full Edit
                    </Button>
                  </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    size="sm"
                    className="bg-success hover:bg-success/90 text-success-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-success-foreground border-t-transparent mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    className="border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 transition-all duration-300 hover:scale-105"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    First Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border bg-card rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-[#001f3f] placeholder:text-[#001f3f]/60"
                      placeholder="Enter your first name"
                    />
                  ) : (
                    <p className="text-foreground py-3 px-4 bg-muted/30 rounded-xl">{user?.first_name || "Not set"}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Display Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="display_name"
                      value={formData.display_name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border bg-card rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-[#001f3f] placeholder:text-[#001f3f]/60"
                      placeholder="How you want to be known in the community"
                    />
                  ) : (
                    <p className="text-foreground py-3 px-4 bg-muted/30 rounded-xl">{user?.display_name || "Not set"}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Preferred Currency
                  </label>
                  {editing ? (
                    <select
                      name="preferred_currency"
                      value={formData.preferred_currency}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border bg-card rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-[#001f3f]"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="ZAR">ZAR (R)</option>
                    </select>
                  ) : (
                    <p className="text-foreground py-3 px-4 bg-muted/30 rounded-xl">{user?.preferred_currency || "USD"}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Last Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border bg-card rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-[#001f3f] placeholder:text-[#001f3f]/60"
                      placeholder="Enter your last name"
                    />
                  ) : (
                    <p className="text-foreground py-3 px-4 bg-muted/30 rounded-xl">{user?.last_name || "Not set"}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    Email Address
                  </label>
                  <div className="py-3 px-4 bg-muted/30 rounded-xl border border-border/50">
                    <p className="text-foreground">{user?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    City/Location
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border bg-card rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-[#001f3f] placeholder:text-[#001f3f]/60"
                      placeholder="City, Town, State"
                    />
                  ) : (
                    <p className="text-foreground py-3 px-4 bg-muted/30 rounded-xl">{user?.location || "Not set"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Country
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border bg-card rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-[#001f3f] placeholder:text-[#001f3f]/60"
                      placeholder="Your country"
                    />
                  ) : (
                    <p className="text-foreground py-3 px-4 bg-muted/30 rounded-xl">{user?.country || "Not set"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Timezone
                  </label>
                  {editing ? (
                    <select
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border bg-card rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-[#001f3f]"
                    >
                      <option value="">Select timezone</option>
                      <option value="America/New_York">Eastern (EST/EDT)</option>
                      <option value="America/Chicago">Central (CST/CDT)</option>
                      <option value="America/Denver">Mountain (MST/MDT)</option>
                      <option value="America/Los_Angeles">Pacific (PST/PDT)</option>
                      <option value="Europe/London">London (GMT/BST)</option>
                      <option value="Europe/Paris">Central Europe (CET/CEST)</option>
                      <option value="Europe/Moscow">Moscow (MSK)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Shanghai">Shanghai (CST)</option>
                      <option value="Asia/Dubai">Dubai (GST)</option>
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                      <option value="Pacific/Auckland">Auckland (NZDT/NZST)</option>
                      <option value="Africa/Lagos">Lagos (WAT)</option>
                      <option value="Africa/Cairo">Cairo (EET)</option>
                      <option value="Africa/Johannesburg">Johannesburg (SAST)</option>
                      <option value="America/Sao_Paulo">São Paulo (BRT/BRST)</option>
                      <option value="America/Mexico_City">Mexico City (CST/CDT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  ) : (
                    <p className="text-foreground py-3 px-4 bg-muted/30 rounded-xl">{user?.timezone || "Not set"}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Website
                  </label>
                  {editing ? (
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border bg-card rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-[#001f3f] placeholder:text-[#001f3f]/60"
                      placeholder="https://yourwebsite.com"
                    />
                  ) : (
                    <div className="py-3 px-4 bg-muted/30 rounded-xl">
                      {user?.website ? (
                        <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors font-medium">
                          {user.website}
                        </a>
                      ) : (
                        <span className="text-foreground">Not set</span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Phone Number
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border bg-card rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-[#001f3f] placeholder:text-[#001f3f]/60"
                      placeholder="Phone number"
                    />
                  ) : (
                    <p className="text-foreground py-3 px-4 bg-muted/30 rounded-xl">{user?.phone || "Not set"}</p>
                  )}
                </div>
                
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <TreePine className="h-4 w-4 text-primary" />
                    Bio
                  </label>
                  {editing ? (
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-3 border border-border bg-card rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 resize-none text-[#001f3f] placeholder:text-[#001f3f]/60"
                      placeholder="Tell us about yourself and your journey in the community farm..."
                    />
                  ) : (
                    <p className="text-foreground py-3 px-4 bg-muted/30 rounded-xl min-h-[100px] leading-relaxed">{user?.bio || "Not set"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Enhanced Social Media Links */}
          <Card className="bg-card/95 backdrop-blur-md border-border/30 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-foreground text-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Link className="h-5 w-5 text-secondary" />
                </div>
                Social Media Presence
              </CardTitle>
              <p className="text-muted-foreground">Connect your social media to share your community impact</p>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Social Media Visibility Toggle */}
              <div className="flex items-center justify-between p-6 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    {formData.show_social_media ? (
                      <Eye className="h-5 w-5 text-success" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <span className="text-foreground font-medium">Social Media Visibility</span>
                    <p className="text-sm text-muted-foreground">Show your social links to the community</p>
                  </div>
                </div>
                {editing && (
                  <label className="relative inline-flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      name="show_social_media"
                      checked={formData.show_social_media}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className="w-14 h-7 bg-muted rounded-full transition-all duration-300 group-hover:shadow-lg peer peer-focus:ring-4 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-border after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                )}
              </div>
              
              {/* Enhanced Social Media Links Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TikTok */}
                <div className="p-6 bg-muted/20 rounded-xl border border-border/50 hover:border-border transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center shadow-lg">
                      <Music className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold text-lg">TikTok</h3>
                    </div>
                  </div>
                  {editing ? (
                    <div className="space-y-3">
                      <input
                        type="url"
                        name="tiktok_url"
                        value={formData.tiktok_url}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-border bg-card rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-[#001f3f] placeholder:text-[#001f3f]/60"
                        placeholder="https://tiktok.com/@username"
                      />
                      {socialLinksError.tiktok && (
                        <p className="text-destructive text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {socialLinksError.tiktok}
                        </p>
                      )}
                      {formData.tiktok_url && (
                        <Button
                          onClick={() => setFormData(prev => ({ ...prev, tiktok_url: "" }))}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          Disconnect
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      {user?.tiktok_url ? (
                        <div className="space-y-3">
                          <a 
                            href={user.tiktok_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                          >
                            <Music className="h-4 w-4" />
                            View Profile
                          </a>
                          <div className="px-4 py-2 bg-success/10 text-success rounded-lg text-sm font-medium border border-success/20">
                            Connected
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-2 bg-muted/50 text-foreground rounded-lg text-sm font-medium border border-border/50">
                          Not connected
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Instagram */}
                <div className="p-6 bg-muted/20 rounded-xl border border-border/50 hover:border-border transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                      <Instagram className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold text-lg">Instagram</h3>
                    </div>
                  </div>
                  {editing ? (
                    <div className="space-y-3">
                      <input
                        type="url"
                        name="instagram_url"
                        value={formData.instagram_url}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-border bg-card rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-[#001f3f] placeholder:text-[#001f3f]/60"
                        placeholder="https://instagram.com/username"
                      />
                      {socialLinksError.instagram && (
                        <p className="text-destructive text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {socialLinksError.instagram}
                        </p>
                      )}
                      {formData.instagram_url && (
                        <Button
                          onClick={() => setFormData(prev => ({ ...prev, instagram_url: "" }))}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          Disconnect
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      {user?.instagram_url ? (
                        <div className="space-y-3">
                          <a 
                            href={user.instagram_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                          >
                            <Instagram className="h-4 w-4" />
                            View Profile
                          </a>
                          <div className="px-4 py-2 bg-success/10 text-success rounded-lg text-sm font-medium border border-success/20">
                            Connected
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-2 bg-muted/50 text-foreground rounded-lg text-sm font-medium border border-border/50">
                          Not connected
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Facebook */}
                <div className="p-6 bg-muted/20 rounded-xl border border-border/50 hover:border-border transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <Facebook className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold text-lg">Facebook</h3>
                    </div>
                  </div>
                  {editing ? (
                    <div className="space-y-3">
                      <input
                        type="url"
                        name="facebook_url"
                        value={formData.facebook_url}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-border bg-card rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-[#001f3f] placeholder:text-[#001f3f]/60"
                        placeholder="https://facebook.com/username"
                      />
                      {socialLinksError.facebook && (
                        <p className="text-destructive text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {socialLinksError.facebook}
                        </p>
                      )}
                      {formData.facebook_url && (
                        <Button
                          onClick={() => setFormData(prev => ({ ...prev, facebook_url: "" }))}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          Disconnect
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      {user?.facebook_url ? (
                        <div className="space-y-3">
                          <a 
                            href={user.facebook_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                          >
                            <Facebook className="h-4 w-4" />
                            View Profile
                          </a>
                          <div className="px-4 py-2 bg-success/10 text-success rounded-lg text-sm font-medium border border-success/20">
                            Connected
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-2 bg-muted/50 text-foreground rounded-lg text-sm font-medium border border-border/50">
                          Not connected
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* YouTube */}
                <div className="p-6 bg-muted/20 rounded-xl border border-border/50 hover:border-border transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                      <Youtube className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold text-lg">YouTube</h3>
                    </div>
                  </div>
                  {editing ? (
                    <div className="space-y-3">
                      <input
                        type="url"
                        name="youtube_url"
                        value={formData.youtube_url}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-border bg-card rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-[#001f3f] placeholder:text-[#001f3f]/60"
                        placeholder="https://youtube.com/c/username"
                      />
                      {socialLinksError.youtube && (
                        <p className="text-destructive text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {socialLinksError.youtube}
                        </p>
                      )}
                      {formData.youtube_url && (
                        <Button
                          onClick={() => setFormData(prev => ({ ...prev, youtube_url: "" }))}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          Disconnect
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      {user?.youtube_url ? (
                        <div className="space-y-3">
                          <a 
                            href={user.youtube_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                          >
                            <Youtube className="h-4 w-4" />
                            View Profile
                          </a>
                          <div className="px-4 py-2 bg-success/10 text-success rounded-lg text-sm font-medium border border-success/20">
                            Connected
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-2 bg-muted/50 text-foreground rounded-lg text-sm font-medium border border-border/50">
                          Not connected
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Enhanced Social Media Preview */}
              {!editing && user?.show_social_media && (
                <div className="mt-8 p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-primary/20">
                  <h4 className="text-foreground font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Public Social Media Links
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {user?.tiktok_url && (
                      <a
                        href={user.tiktok_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-3 bg-black text-white rounded-xl hover:bg-black/80 transition-all duration-300 hover:scale-105 shadow-lg"
                      >
                        <Music className="h-4 w-4" />
                        TikTok
                      </a>
                    )}
                    {user?.instagram_url && (
                      <a
                        href={user.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-105 shadow-lg"
                      >
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </a>
                    )}
                    {user?.facebook_url && (
                      <a
                        href={user.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 hover:scale-105 shadow-lg"
                      >
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </a>
                    )}
                    {user?.youtube_url && (
                      <a
                        href={user.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300 hover:scale-105 shadow-lg"
                      >
                        <Youtube className="h-4 w-4" />
                        YouTube
                      </a>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Enhanced Activity Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-success/10 via-card to-success/5 border-success/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Heart className="h-8 w-8 text-success" />
                </div>
                <div className="text-3xl font-bold text-success mb-2">R{userStats.totalBestowed.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground font-medium">Total Bestowed</p>
                <p className="text-xs text-muted-foreground mt-1">Spreading abundance</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-primary/10 via-card to-primary/5 border-primary/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary mb-2">R{userStats.totalReceived.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground font-medium">Total Received</p>
                <p className="text-xs text-muted-foreground mt-1">Community support</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-secondary/10 via-card to-secondary/5 border-secondary/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Users className="h-8 w-8 text-secondary" />
                </div>
                <div className="text-3xl font-bold text-secondary mb-2">{userStats.orchardsSupported}</div>
                <p className="text-sm text-muted-foreground font-medium">Orchards Supported</p>
                <p className="text-xs text-muted-foreground mt-1">Growing together</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Enhanced Account Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-card/95 backdrop-blur-md border-border/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-xl">
                  <span className="text-muted-foreground font-medium">Member Since</span>
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Calendar className="h-4 w-4" />
                    {userStats.joinedDate}
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-xl">
                  <span className="text-muted-foreground font-medium">Verification Level</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {userStats.verificationLevel}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-xl">
                  <span className="text-muted-foreground font-medium">Community Rank</span>
                  <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                    <Crown className="h-3 w-3 mr-1" />
                    {userStats.communityRank}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-xl">
                  <span className="text-muted-foreground font-medium">Role</span>
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    <Sprout className="h-3 w-3 mr-1" />
                    Farm Stall Owner
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/95 backdrop-blur-md border-border/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-3">
                  <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                    <TreePine className="h-5 w-5 text-success" />
                  </div>
                  Farm Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-xl">
                  <span className="text-muted-foreground font-medium">Orchards Created</span>
                  <span className="text-foreground font-bold text-lg">{userStats.orchardsCreated}</span>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-xl">
                  <span className="text-muted-foreground font-medium">Orchards Supported</span>
                  <span className="text-foreground font-bold text-lg">{userStats.orchardsSupported}</span>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-xl">
                  <span className="text-muted-foreground font-medium">Total Impact</span>
                  <span className="text-foreground font-bold text-lg">R{(userStats.totalBestowed + userStats.totalReceived).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-xl">
                  <span className="text-muted-foreground font-medium">Community Rating</span>
                  <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                    <Star className="h-3 w-3 mr-1" />
                    4.8/5.0
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Enhanced Community Standing */}
          <Card className="bg-gradient-to-br from-primary/5 via-card to-secondary/5 border-primary/20 shadow-2xl">
            <CardContent className="p-10 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center shadow-xl">
                  <Award className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>
              
              <h3 className="text-3xl font-bold text-foreground mb-4" style={{ fontFamily: "Playfair Display, serif" }}>
                Your Community Legacy
              </h3>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                You are a cherished member of the 364yhvh Community Farm. Your generous spirit and faithful participation 
                have helped create a thriving ecosystem where everyone supports and uplifts each other.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="text-center p-6 bg-success/10 rounded-2xl border border-success/20">
                  <div className="text-4xl font-bold text-success mb-2">23</div>
                  <p className="text-sm text-muted-foreground font-medium">People Helped</p>
                </div>
                <div className="text-center p-6 bg-primary/10 rounded-2xl border border-primary/20">
                  <div className="text-4xl font-bold text-primary mb-2">89%</div>
                  <p className="text-sm text-muted-foreground font-medium">Success Rate</p>
                </div>
                <div className="text-center p-6 bg-warning/10 rounded-2xl border border-warning/20">
                  <div className="text-4xl font-bold text-warning mb-2">4.8</div>
                  <p className="text-sm text-muted-foreground font-medium">Community Rating</p>
                </div>
              </div>
              
              <blockquote className="text-lg font-medium text-foreground mb-3 italic" style={{ fontFamily: "Playfair Display, serif" }}>
                "From generous hearts flow endless blessings, and in faithful hands, every seed finds its season."
              </blockquote>
              <cite className="text-sm text-muted-foreground">— 364yhvh Community Wisdom</cite>
            </CardContent>
          </Card>
              </TabsContent>

              <TabsContent value="journal" className="mt-6">
                <Journal />
              </TabsContent>

              <TabsContent value="recipes" className="mt-6">
                <RecipesPage />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}