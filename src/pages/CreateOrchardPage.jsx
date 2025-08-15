import React, { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useCurrency } from "../hooks/useCurrency"
import { useOrchards } from "../hooks/useOrchards"
import { useFileUpload } from "../hooks/useFileUpload"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { 
  Plus, 
  Sprout, 
  DollarSign, 
  MapPin, 
  Clock, 
  Heart, 
  Users,
  Calculator,
  Sparkles,
  Camera,
  Image,
  Video,
  Upload,
  X,
  Loader2,
  User
} from "lucide-react"

export default function CreateOrchardPage({ isEdit = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currency } = useCurrency()
  const { createOrchard, updateOrchard, fetchOrchardById } = useOrchards()
  const { uploadFile, uploadMultipleFiles, uploading } = useFileUpload()
  
  const [loadingData, setLoadingData] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    orchard_type: "standard",
    seed_value: "",
    pocket_price: "150",
    number_of_pockets: "1", // New field for full value orchards
    location: "",
    why_needed: "",
    how_it_helps: "",
    community_impact: "",
    expected_completion: "",
    features: "",
    video_url: "",
    currency: currency || "USD"
  })
  
  const [selectedImages, setSelectedImages] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(null)
  
  // Update currency when user's preferred currency changes
  useEffect(() => {
    if (currency) {
      setFormData(prev => ({
        ...prev,
        currency: currency
      }))
    }
  }, [currency])
  
  // Load existing orchard data if editing
  useEffect(() => {
    if (isEdit && id) {
      loadOrchardData()
    }
  }, [isEdit, id])
  
  const loadOrchardData = async () => {
    try {
      setLoadingData(true)
      const result = await fetchOrchardById(id)
      
      if (result.success) {
        const orchard = result.data
        setFormData({
          title: orchard.title || "",
          description: orchard.description || "",
          category: orchard.category || "",
          orchard_type: orchard.orchard_type || "standard",
          seed_value: orchard.original_seed_value?.toString() || "",
          pocket_price: orchard.pocket_price?.toString() || "150",
          location: orchard.location || "",
          why_needed: orchard.why_needed || "",
          how_it_helps: orchard.how_it_helps || "",
          community_impact: orchard.community_impact || "",
          expected_completion: orchard.expected_completion || "",
          features: orchard.features ? orchard.features.join(", ") : "",
          video_url: orchard.video_url || "",
          currency: orchard.currency || currency || "USD"
        })
        
        // Handle existing images
        if (orchard.images && orchard.images.length > 0) {
          setSelectedImages(orchard.images.map((img, index) => ({
            id: index,
            url: img,
            preview: img,
            isExisting: true
          })))
        }
      } else {
        setError("Failed to load orchard data")
      }
    } catch (error) {
      setError("Failed to load orchard data")
      console.error("Load orchard error:", error)
    } finally {
      setLoadingData(false)
    }
  }
  
  const categories = [
    "The Gift of Accessories", 
    "The Gift of Adventure Packages",
    "The Gift of Appliances",
    "The Gift of Art",
    "The Gift of Books & Literature",
    "The Gift of Business Solutions",
    "The Gift of Clothing & Fashion",
    "The Gift of Computers & Technology",
    "The Gift of Education & Training",
    "The Gift of Entertainment",
    "The Gift of Food & Beverages",
    "The Gift of Furniture & Home Decor",
    "The Gift of Gifts & Special Items",
    "The Gift of Health & Medical",
    "The Gift of Industrial & Scientific",
    "The Gift of Music",
    "The Gift of Personal Care",
    "The Gift of Security",
    "The Gift of Services",
    "The Gift of Social Impact",
    "The Gift of Software",
    "The Gift of Sports & Recreation",
    "The Gift of Tools & Equipment",
    "The Gift of Transportation",
    "The Gift of Travel & Tourism"
  ]
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      // Validation
      if (!user?.id) {
        throw new Error("You must be logged in to create an orchard")
      }

      if (!formData.title || !formData.description || !formData.seed_value) {
        throw new Error("Please fill in all required fields")
      }

      const seedValue = parseFloat(formData.seed_value) || 0

      // Validate based on orchard type
      if (formData.orchard_type === 'standard') {
        if (seedValue <= 100) {
          throw new Error("Seed value must be over $100 for Standard Orchard")
        }
        const pocketValue = parseFloat(formData.pocket_price) || 0
        if (pocketValue <= 0) {
          throw new Error("Bestowal pocket value must be greater than 0")
        }
      } else if (formData.orchard_type === 'full_value') {
        if (seedValue < 1 || seedValue > 100) {
          throw new Error("Seed value must be between $1 and $100 for Full Value Orchard")
        }
        const numPockets = parseInt(formData.number_of_pockets) || 0
        if (numPockets < 1) {
          throw new Error("Number of pockets must be greater than 0")
        }
      }

      // Upload images first
      let imageUrls = []
      const newImages = selectedImages.filter(img => !img.isExisting && img.file)
      const existingImages = selectedImages.filter(img => img.isExisting).map(img => img.url)
      
      if (newImages.length > 0) {
        const imageFiles = newImages.map(img => img.file)
        const uploadResult = await uploadMultipleFiles(imageFiles, 'orchard-images', 'images/')
        
        if (uploadResult.success) {
          imageUrls = uploadResult.data.map(item => item.url)
        }
      }
      
      // Combine existing and new image URLs
      const allImageUrls = [...existingImages, ...imageUrls]

      // Upload video if present
      let videoUrl = formData.video_url
      if (selectedVideo && selectedVideo.file) {
        const videoUploadResult = await uploadFile(selectedVideo.file, 'orchard-videos', 'videos/')
        if (videoUploadResult.success) {
          videoUrl = videoUploadResult.data.url
        }
      }

      // Calculate financial breakdown
      const originalSeedValue = parseFloat(formData.seed_value) || 0
      const pocketPrice = parseFloat(formData.pocket_price) || 150
      const breakdown = getSeedValueBreakdown()
      const finalSeedValue = breakdown ? breakdown.final : originalSeedValue

      // Prepare orchard data
      const orchardData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category || "General",
        orchard_type: formData.orchard_type,
        seed_value: finalSeedValue,
        original_seed_value: originalSeedValue,
        tithing_amount: breakdown ? breakdown.tithing : 0,
        payment_processing_fee: breakdown ? breakdown.paymentProcessing : 0,
        pocket_price: formData.orchard_type === 'full_value' ? finalSeedValue : pocketPrice,
        total_pockets: calculatePockets(),
        location: formData.location?.trim() || "",
        currency: formData.currency || currency || "USD",
        why_needed: formData.why_needed?.trim() || "",
        how_it_helps: formData.how_it_helps?.trim() || "",
        community_impact: formData.community_impact?.trim() || "",
        expected_completion: formData.expected_completion?.trim() || "",
        features: formData.features ? formData.features.split(',').map(f => f.trim()).filter(f => f) : [],
        images: allImageUrls,
        video_url: videoUrl
      }

      // Create or update orchard
      let result
      if (isEdit) {
        result = await updateOrchard(id, orchardData)
      } else {
        result = await createOrchard(orchardData)
      }

      if (result.success) {
        if (isEdit) {
          navigate("/my-orchards")
        } else {
          navigate(`/orchard/${result.data.id}`)
        }
      } else {
        throw new Error(result.error || `Failed to ${isEdit ? 'update' : 'create'} orchard`)
      }

    } catch (err) {
      console.error("Orchard submission error:", err)
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} orchard`)
    } finally {
      setSaving(false)
    }
  }
  
  const calculatePockets = () => {
    if (formData.orchard_type === 'full_value') {
      // For full value orchards, use the specified number of pockets
      return parseInt(formData.number_of_pockets) || 1
    } else {
      // For standard orchards, calculate based on total (seed value * 1.16) / pocket price
      const seedValue = parseFloat(formData.seed_value) || 0
      const total = seedValue * 1.16  // 10% tithing + 6% payment gateway fees
      const pocketPrice = parseFloat(formData.pocket_price) || 150
      if (total && pocketPrice) {
        return Math.floor(total / pocketPrice)
      }
      return 0
    }
  }

  const calculateFinalSeedValue = () => {
    const originalSeedValue = parseFloat(formData.seed_value) || 0
    if (originalSeedValue === 0) return 0
    
    if (formData.orchard_type === 'full_value') {
      // For full value orchards: (seed value * 1.16) * number of pockets
      const pocketCost = originalSeedValue * 1.16 // 10% tithing + 6% payment gateway fees
      const numberOfPockets = parseInt(formData.number_of_pockets) || 1
      return pocketCost * numberOfPockets
    } else {
      // For standard orchards: seed value * 1.16
      return originalSeedValue * 1.16 // 10% tithing + 6% payment gateway fees
    }
  }

  const getSeedValueBreakdown = () => {
    const originalSeedValue = parseFloat(formData.seed_value) || 0
    if (originalSeedValue === 0) return null
    
    const tithingAmount = originalSeedValue * 0.10  // 10% tithing
    const gatewayFees = originalSeedValue * 0.06    // 6% payment gateway fees
    const totalWithFees = originalSeedValue * 1.16  // Total = seed * 1.16
    
    let finalCost = totalWithFees
    if (formData.orchard_type === 'full_value') {
      const numberOfPockets = parseInt(formData.number_of_pockets) || 1
      finalCost = totalWithFees * numberOfPockets
    }
    
    return {
      original: originalSeedValue,
      tithing: tithingAmount,
      paymentProcessing: gatewayFees,
      totalWithFees: totalWithFees,
      final: finalCost,
      pocketCost: formData.orchard_type === 'full_value' ? totalWithFees : null
    }
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 3) {
      setError("You can only upload up to 3 images")
      return
    }
    
    const validImages = files.filter(file => file.type.startsWith('image/'))
    if (validImages.length !== files.length) {
      setError("Please upload only image files")
      return
    }
    
    const imagePromises = validImages.map((file, index) => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve({
            id: Date.now() + index,
            file,
            preview: e.target.result,
            isExisting: false
          })
        }
        reader.readAsDataURL(file)
      })
    })
    
    Promise.all(imagePromises).then(images => {
      setSelectedImages(images)
      setError("")
    })
  }

  const handleVideoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (!file.type.startsWith('video/')) {
      setError("Please upload a video file")
      return
    }
    
    if (file.size > 50 * 1024 * 1024) {
      setError("Video file is too large. Maximum size is 50MB.")
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setSelectedVideo({
        file,
        preview: e.target.result,
        isExisting: false
      })
      setError("")
    }
    reader.readAsDataURL(file)
  }

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index)
    setSelectedImages(newImages)
  }

  const removeVideo = () => {
    setSelectedVideo(null)
  }
  
  // Loading state for fetching data
  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-amber-50 to-green-100 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 mx-auto max-w-md border border-white/20 shadow-2xl text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-green-800 mb-2">Loading orchard data...</h2>
          <p className="text-gray-600">Please wait while we fetch your orchard details</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          console.error('Video error:', e);
          // Hide video and show background color if video fails
          e.target.style.display = 'none';
        }}
        onLoadStart={() => console.log('Video loading started')}
        onCanPlay={() => console.log('Video can play')}
      >
        <source src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/s2g upload sower 1280x720.mp4" type="video/mp4" />
        <source src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/s2g%20upload%20sower%201280x720.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 backdrop-blur-[2px]" style={{ backgroundColor: '#fdffb630' }}></div>
      
      {/* Content Container */}
      <div className="relative z-10">
      {/* Welcome Section with Profile Picture */}
      <div className="max-w-4xl mx-auto p-8 rounded-2xl border shadow-2xl mb-8 mt-4 bg-white/90">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-nav-create shadow-lg">
            {user?.profile_picture ? (
              <img 
                src={user.profile_picture} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-nav-create to-nav-create/80 flex items-center justify-center">
                <User className="h-10 w-10 text-yellow-700" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold px-8 py-4 rounded-lg" style={{ 
              color: 'hsl(45, 90%, 55%)', 
              textShadow: '2px 2px 4px hsl(45, 90%, 35%)',
              backgroundColor: '#C8B6A6'
            }}>
              {isEdit ? "Edit Orchard" : "Create New Orchard"}
            </h1>
            <p className="text-lg" style={{ color: '#cc5500' }}>
              {isEdit ? "Update your orchard details" : "Plant a new seed in our community"}
            </p>
            <p className="text-sm mt-1" style={{ color: '#cc5500' }}>
              Preferred Currency: {user?.preferred_currency || 'USD'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8 px-4">
        {/* Header */}
        <div className="text-center">
          <div className="bg-nav-create/10 backdrop-blur-sm rounded-3xl p-8 mx-auto max-w-3xl border border-nav-create/30 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-nav-create/30 rounded-full flex items-center justify-center shadow-lg">
                <Sprout className="h-8 w-8 text-yellow-700 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-nav-create mb-4">
              {isEdit ? "Edit Your Orchard" : "Sow a New Seed"}
            </h2>
            <p className="text-lg text-yellow-600 max-w-2xl mx-auto">
              {isEdit ? "Update your orchard details and grow your community support" : "Create a new orchard in your farm stall within the sow2grow community farm."} 
              Share your need with the community and watch it grow with their support.
            </p>
            <Badge className="mt-4 bg-nav-create text-yellow-700">
              <Plus className="h-3 w-3 mr-1" />
              6-Step Creation Process
            </Badge>
          </div>
        </div>
      
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card className="bg-white/90 backdrop-blur-sm border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle style={{ color: '#f8a5c2' }} className="flex items-center gap-2">
                <Sprout className="h-5 w-5" style={{ color: '#f472b6' }} />
                Step 1: Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-rose-400 mb-2">
                    Orchard Title *
                  </label>
                  <Input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., 2019 Toyota Corolla"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-rose-400 mb-2">
                    Category *
                  </label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-green-200 shadow-xl z-50">
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-rose-400 mb-2">
                  Description *
                </label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe what this orchard is for..."
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-rose-400 mb-2">
                    Location
                  </label>
                  <Input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="City, Country"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-rose-400 mb-2">
                    Timeline
                  </label>
                  <Input
                    type="text"
                    name="expected_completion"
                    value={formData.expected_completion}
                    onChange={handleChange}
                    placeholder="e.g., Need by March 2024"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Orchard Type Selection */}
          <Card className="bg-white/90 backdrop-blur-sm border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle style={{ color: '#7dd3fc' }} className="flex items-center gap-2">
                <Sprout className="h-5 w-5" style={{ color: '#38bdf8' }} />
                Step 2: Orchard Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-sky-400 mb-4">
                  Choose your orchard type:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.orchard_type === 'standard' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, orchard_type: 'standard' }))}
                  >
                    <div className="flex items-center mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                        formData.orchard_type === 'standard' ? 'bg-green-500 border-green-500' : 'border-gray-400'
                      }`}></div>
                      <h3 className="font-semibold text-gray-800">Standard Orchard</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">For larger seeds (over $100)</p>
                    <p className="text-xs text-gray-500">Divided into R150 pockets for multiple supporters</p>
                  </div>
                  
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.orchard_type === 'full_value' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, orchard_type: 'full_value' }))}
                  >
                    <div className="flex items-center mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                        formData.orchard_type === 'full_value' ? 'bg-green-500 border-green-500' : 'border-gray-400'
                      }`}></div>
                      <h3 className="font-semibold text-gray-800">Full Value Orchard</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">For smaller seeds ($1 - $100)</p>
                    <p className="text-xs text-gray-500">Each pocket contains the full seed value + fees</p>
                  </div>
                </div>
                {/* Number of Pockets for Full Value Orchard */}
                {formData.orchard_type === 'full_value' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-sky-400 mb-2">
                      Number of Pockets
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.number_of_pockets}
                      onChange={(e) => setFormData(prev => ({ ...prev, number_of_pockets: e.target.value }))}
                      placeholder="Enter number of pockets (1-10)"
                      className="border-green-300 focus:border-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Each pocket will contain the full seed value (${formData.seed_value || 0}) + fees
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Financial Details */}
          <Card className="bg-white/90 backdrop-blur-sm border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle style={{ color: '#6ee7b7' }} className="flex items-center gap-2">
                <Calculator className="h-5 w-5" style={{ color: '#34d399' }} />
                Step 3: Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-medium text-emerald-400 mb-2">
                     <DollarSign className="inline h-4 w-4 mr-1" />
                     Seed Value (R) *
                   </label>
                   <Input
                     type="number"
                     name="seed_value"
                     value={formData.seed_value}
                     onChange={handleChange}
                     placeholder={formData.orchard_type === 'standard' ? "e.g., 18000 (minimum R100.01)" : "e.g., 50 (R1 - R100)"}
                     min={formData.orchard_type === 'standard' ? "100.01" : "1"}
                     max={formData.orchard_type === 'full_value' ? "100" : undefined}
                     step="0.01"
                     required
                   />
                   <p className="text-xs text-gray-500 mt-1">
                     {formData.orchard_type === 'standard' 
                       ? "Must be greater than R100 for Standard Orchard" 
                       : "Must be between R1 and R100 for Full Value Orchard"}
                   </p>
                 </div>
                 {formData.orchard_type === 'standard' && (
                   <div>
                      <label className="block text-sm font-medium text-emerald-400 mb-2">
                       Bestowal Pocket Value (R) *
                     </label>
                     <Input
                       type="number"
                       name="pocket_price"
                       value={formData.pocket_price}
                       onChange={handleChange}
                       placeholder="150"
                       min="1"
                       step="0.01"
                       required
                     />
                     <p className="text-xs text-gray-500 mt-1">
                       Default R150. Must be greater than 0.
                     </p>
                   </div>
                 )}
              </div>
              
              {formData.seed_value && (
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-4 text-lg">
                    <Calculator className="inline h-5 w-5 mr-2" />
                    Financial Breakdown & Pocket Calculation
                  </h4>
                  
                  {(() => {
                    const breakdown = getSeedValueBreakdown()
                    if (!breakdown) return null
                    
                    return (
                      <div className="space-y-4">
                          {/* Financial Breakdown */}
                         <div className="bg-white p-4 rounded-lg border border-green-100">
                           <h5 className="font-medium text-gray-800 mb-3">
                             {formData.orchard_type === 'standard' ? 'Standard Orchard' : 'Full Value Orchard'} Calculation:
                           </h5>
                           <div className="space-y-2 text-sm">
                             <div className="flex justify-between">
                               <span className="text-gray-600">Original Seed Value:</span>
                               <span className="font-medium">R{breakdown.original.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between text-amber-700">
                               <span>+ 10% Tithing:</span>
                               <span className="font-medium">R{breakdown.tithing.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between text-blue-700">
                               <span>+ 6% Payment Gateway Fee:</span>
                               <span className="font-medium">R{breakdown.paymentProcessing.toFixed(2)}</span>
                             </div>
                             <div className="border-t border-gray-200 pt-2 mt-2">
                               <div className="flex justify-between font-semibold text-green-700">
                                 <span>Total (= Seed × 1.16):</span>
                                 <span>R{breakdown.totalWithFees.toFixed(2)}</span>
                               </div>
                               {formData.orchard_type === 'full_value' && (
                                 <>
                                   <div className="flex justify-between text-purple-700">
                                     <span>× {formData.number_of_pockets || 1} Pockets:</span>
                                     <span className="font-medium">R{breakdown.final.toFixed(2)}</span>
                                   </div>
                                   <div className="flex justify-between text-sm text-gray-600 mt-1">
                                     <span>Pocket Cost (each):</span>
                                     <span>R{breakdown.pocketCost?.toFixed(2)}</span>
                                   </div>
                                 </>
                               )}
                               <div className="border-t border-gray-200 pt-2 mt-2">
                                 <div className="flex justify-between font-bold text-green-800">
                                   <span>Final Cost:</span>
                                   <span>R{breakdown.final.toFixed(2)}</span>
                                 </div>
                               </div>
                             </div>
                           </div>
                         </div>
                        
                         {/* Pocket Calculation */}
                         <div className="grid grid-cols-3 gap-4 text-center">
                           <div className="bg-white p-3 rounded-lg border border-green-100">
                             <div className="text-2xl font-bold text-green-800">{calculatePockets()}</div>
                             <div className="text-sm text-green-600">
                               {formData.orchard_type === 'standard' ? 'Total Pockets' : 'Number of Pockets'}
                             </div>
                           </div>
                           <div className="bg-white p-3 rounded-lg border border-green-100">
                             <div className="text-2xl font-bold text-green-800">
                               R{formData.orchard_type === 'standard' 
                                 ? formData.pocket_price 
                                 : breakdown.pocketCost?.toFixed(2) || '0.00'}
                             </div>
                             <div className="text-sm text-green-600">
                               {formData.orchard_type === 'standard' ? 'Pocket Value' : 'Cost Per Pocket'}
                             </div>
                           </div>
                           <div className="bg-white p-3 rounded-lg border border-green-100">
                             <div className="text-2xl font-bold text-green-800">R{breakdown.final.toFixed(2)}</div>
                             <div className="text-sm text-green-600">Total Cost</div>
                           </div>
                         </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Purpose & Impact */}
          <Card className="bg-white/90 backdrop-blur-sm border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle style={{ color: '#c084fc' }} className="flex items-center gap-2">
                <Heart className="h-5 w-5" style={{ color: '#a855f7' }} />
                Step 4: Purpose & Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-purple-400 mb-2">
                  Why is this needed? *
                </label>
                <Textarea
                  name="why_needed"
                  value={formData.why_needed}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Explain why this orchard is important for you..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-purple-400 mb-2">
                  Community Impact *
                </label>
                <Textarea
                  name="community_impact"
                  value={formData.community_impact}
                  onChange={handleChange}
                  rows={3}
                  placeholder="How will this benefit the community?"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-purple-400 mb-2">
                  Features (comma-separated)
                </label>
                <Input
                  type="text"
                  name="features"
                  value={formData.features}
                  onChange={handleChange}
                  placeholder="e.g., Reliable, Fuel efficient, Low maintenance"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Media Upload */}
          <Card className="bg-white/90 backdrop-blur-sm border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle style={{ color: '#fb923c' }} className="flex items-center gap-2">
                <Camera className="h-5 w-5" style={{ color: '#f97316' }} />
                Step 5: Media Upload
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Help the community see your need! Upload 1-3 photos and optionally a video to showcase your orchard.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-orange-400 mb-2">
                  <Image className="inline h-4 w-4 mr-1" />
                  Images (1-3 photos)
                </label>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                    <input
                      type="file"
                      id="image-upload"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      max="3"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to upload images or drag and drop</p>
                      <p className="text-xs text-gray-500">PNG, JPG, JPEG up to 5MB each (max 3 images)</p>
                    </label>
                  </div>
                  
                  {/* Image Previews */}
                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedImages.map((image, index) => (
                        <div key={image.id || index} className="relative group">
                          <img
                            src={image.preview || image.url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                            {image.isExisting ? 'Existing' : (image.file?.name || 'Image')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Video Upload */}
              <div>
                <label className="block text-sm font-medium text-orange-400 mb-2">
                  <Video className="inline h-4 w-4 mr-1" />
                  Video (Optional)
                </label>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                    <input
                      type="file"
                      id="video-upload"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                    <label htmlFor="video-upload" className="cursor-pointer">
                      <Video className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to upload a video or drag and drop</p>
                      <p className="text-xs text-gray-500">MP4, MOV, AVI up to 50MB</p>
                    </label>
                  </div>
                  
                  {/* Video Preview */}
                  {selectedVideo && (
                    <div className="relative group">
                      <video
                        src={selectedVideo.preview}
                        controls
                        className="w-full h-48 rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeVideo}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {selectedVideo.isExisting ? 'Existing' : (selectedVideo.file?.name || 'Video')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {/* Submit Button */}
          <div className="text-center">
            <Button
              type="submit"
              size="lg"
              variant="default"
              disabled={saving || uploading}
              style={{ background: 'linear-gradient(to right, #8B4513, #A0522D)' }}
              className="px-8 py-4 text-lg font-bold text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              {saving || uploading ? (
                <div className="flex items-center">
                  <Loader2 className="animate-spin h-6 w-6 mr-3" />
                  {uploading ? "Uploading files..." : (isEdit ? "Updating orchard..." : "Creating orchard...")}
                </div>
              ) : (
                <>
                  <Sprout className="h-6 w-6 mr-3" />
                  {isEdit ? "Update Orchard 🌱" : "Sow Your Seed 🌱"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
      </div>
    </div>
  )
}