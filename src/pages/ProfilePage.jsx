import React, { useState, useRef, useEffect } from "react"
import { useAuth } from "../hooks/useAuth"
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

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [pictureError, setPictureError] = useState("")
  const [socialLinksError, setSocialLinksError] = useState({})
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef(null)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
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
    profile_picture: user?.profile_picture || null,
    preferred_currency: user?.preferred_currency || "USD"
  })
  
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
          profile_picture: base64Data
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
      profile_picture: user?.profile_picture || null,
      preferred_currency: user?.preferred_currency || "USD"
    })
    setEditing(false)
    setPictureError("")
    setSocialLinksError({})
  }
  
  const removePicture = () => {
    setFormData(prev => ({
      ...prev,
      profile_picture: null
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
    communityRank: "Faithful Grower",
    verificationLevel: "Verified"
  }
  
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Enhanced Background Video */}
      <div className="fixed inset-0 w-full h-full z-0">
        <video 
          autoPlay 
          muted 
          loop 
          className="w-full h-full object-cover"
        >
          <source src="/bestowers main mp4.mp4" type="video/mp4" />
          <div className="w-full h-full bg-gradient-to-br from-green-100 to-amber-100"></div>
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/10 to-black/20"></div>
      </div>

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
          {/* Enhanced Header */}
          <div className="text-center">
            <div className="bg-card/90 backdrop-blur-md rounded-3xl p-8 mx-auto max-w-4xl border border-border/30 shadow-2xl">
              <div className="flex justify-center mb-6 relative">
                {/* Enhanced Profile Picture */}
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden shadow-2xl border-4 border-primary/20 transition-all duration-500 group-hover:scale-105 group-hover:shadow-3xl">
                    {formData.profile_picture ? (
                      <img 
                        src={formData.profile_picture} 
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
              
              <h1 className="text-5xl font-bold text-foreground mb-3 animate-fade-in" style={{ 
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
                <Button
                  onClick={() => setEditing(true)}
                  variant="outline"
                  size="sm"
                  className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 hover:scale-105"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
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
                      className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                      placeholder="Enter your first name"
                    />
                  ) : (
                    <p className="text-foreground py-3 px-4 bg-muted/30 rounded-xl">{user?.first_name || "Not set"}</p>
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
                      className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-foreground"
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
                      className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-foreground placeholder:text-muted-foreground"
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
                    Location
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                      placeholder="City, Country"
                    />
                  ) : (
                    <p className="text-foreground py-3 px-4 bg-muted/30 rounded-xl">{user?.location || "Not set"}</p>
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
                      className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-foreground placeholder:text-muted-foreground"
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
                      className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-foreground placeholder:text-muted-foreground"
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
                      className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 resize-none text-foreground placeholder:text-muted-foreground"
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
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground flex items-center gap-2">
                    <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                      <Music className="h-3 w-3 text-white" />
                    </div>
                    TikTok
                  </label>
                  {editing ? (
                    <div>
                      <input
                        type="url"
                        name="tiktok_url"
                        value={formData.tiktok_url}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                        placeholder="https://tiktok.com/@username"
                      />
                      {socialLinksError.tiktok && (
                        <p className="text-destructive text-xs mt-2 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {socialLinksError.tiktok}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="py-3 px-4 bg-muted/30 rounded-xl">
                      {user?.tiktok_url ? (
                        <a href={user.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          {user.tiktok_url}
                        </a>
                      ) : (
                        <span className="text-foreground">Not connected</span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Instagram */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Instagram className="h-3 w-3 text-white" />
                    </div>
                    Instagram
                  </label>
                  {editing ? (
                    <div>
                      <input
                        type="url"
                        name="instagram_url"
                        value={formData.instagram_url}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                        placeholder="https://instagram.com/username"
                      />
                      {socialLinksError.instagram && (
                        <p className="text-destructive text-xs mt-2 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {socialLinksError.instagram}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="py-3 px-4 bg-muted/30 rounded-xl">
                      {user?.instagram_url ? (
                        <a href={user.instagram_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-2">
                          <Instagram className="h-4 w-4" />
                          {user.instagram_url}
                        </a>
                      ) : (
                        <span className="text-foreground">Not connected</span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Facebook */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <Facebook className="h-3 w-3 text-white" />
                    </div>
                    Facebook
                  </label>
                  {editing ? (
                    <div>
                      <input
                        type="url"
                        name="facebook_url"
                        value={formData.facebook_url}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                        placeholder="https://facebook.com/username"
                      />
                      {socialLinksError.facebook && (
                        <p className="text-destructive text-xs mt-2 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {socialLinksError.facebook}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="py-3 px-4 bg-muted/30 rounded-xl">
                      {user?.facebook_url ? (
                        <a href={user.facebook_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-2">
                          <Facebook className="h-4 w-4" />
                          {user.facebook_url}
                        </a>
                      ) : (
                        <span className="text-foreground">Not connected</span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* YouTube */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                      <Youtube className="h-3 w-3 text-white" />
                    </div>
                    YouTube
                  </label>
                  {editing ? (
                    <div>
                      <input
                        type="url"
                        name="youtube_url"
                        value={formData.youtube_url}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                        placeholder="https://youtube.com/c/username"
                      />
                      {socialLinksError.youtube && (
                        <p className="text-destructive text-xs mt-2 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {socialLinksError.youtube}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="py-3 px-4 bg-muted/30 rounded-xl">
                      {user?.youtube_url ? (
                        <a href={user.youtube_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-2">
                          <Youtube className="h-4 w-4" />
                          {user.youtube_url}
                        </a>
                      ) : (
                        <span className="text-foreground">Not connected</span>
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
        </div>
      </div>
    </div>
  )
}