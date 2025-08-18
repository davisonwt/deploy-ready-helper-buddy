import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOrchards } from '../hooks/useOrchards'
import { useFileUpload } from '../hooks/useFileUpload.jsx'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TreePine, 
  Upload, 
  Image,
  Video,
  X,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'

export default function EditOrchardPage() {
  const { orchardId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [userRoles, setUserRoles] = useState([])
  const { fetchOrchardById, updateOrchard } = useOrchards()
  const { uploadFile, uploading } = useFileUpload()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orchard, setOrchard] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    why_needed: '',
    how_it_helps: '',
    community_impact: '',
    expected_completion: '',
    seed_value: '',
    pocket_price: ''
  })
  
  const [images, setImages] = useState([])
  const [video, setVideo] = useState(null)
  const [imageFiles, setImageFiles] = useState([])
  const [videoFile, setVideoFile] = useState(null)

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
    "The Gift of Travel & Tourism",
    "The Gift of Vehicles",
    "The Gift of Wellness"
  ]

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadOrchard()
  }, [orchardId, user])

  const loadOrchard = async () => {
    try {
      setLoading(true)
      
      // Load user roles FIRST
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
      
      const currentUserRoles = rolesData?.map(r => r.role) || []
      setUserRoles(currentUserRoles)
      const isGosat = currentUserRoles.includes('gosat') || currentUserRoles.includes('admin')
      
      const result = await fetchOrchardById(orchardId)
      
      if (!result.success) {
        toast.error(result.error)
        navigate('/my-orchards')
        return
      }

      const orchardData = result.data
      
      // Check if user owns this orchard or is a gosat/admin
      if (orchardData.user_id !== user.id && !isGosat) {
        toast.error('You can only edit your own orchards')
        navigate('/my-orchards')
        return
      }

      setOrchard(orchardData)
      setFormData({
        title: orchardData.title || '',
        description: orchardData.description || '',
        category: orchardData.category || '',
        location: orchardData.location || '',
        why_needed: orchardData.why_needed || '',
        how_it_helps: orchardData.how_it_helps || '',
        community_impact: orchardData.community_impact || '',
        expected_completion: orchardData.expected_completion || '',
        seed_value: orchardData.seed_value || '',
        pocket_price: orchardData.pocket_price || ''
      })

      // Set existing images
      if (orchardData.images && orchardData.images.length > 0) {
        setImages(orchardData.images.map((url, index) => ({
          id: `existing-${index}`,
          url: url,
          isExisting: true
        })))
      }

      // Set existing video
      if (orchardData.video_url) {
        setVideo({
          id: 'existing-video',
          url: orchardData.video_url,
          isExisting: true
        })
      }

    } catch (error) {
      console.error('Error loading orchard:', error)
      toast.error('Failed to load orchard')
      navigate('/my-orchards')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files)
    if (files.length + images.length > 5) {
      toast.error('Maximum 5 images allowed')
      return
    }
    
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload only image files (JPG, PNG)')
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB')
        return
      }

      setImageFiles(prev => [...prev, file])
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setImages(prev => [...prev, {
          id: Date.now() + Math.random(),
          url: e.target.result,
          file: file
        }])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleVideoUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload only video files (MP4)')
      return
    }
    
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video size should be less than 50MB')
      return
    }

    setVideoFile(file)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setVideo({
        id: Date.now(),
        url: e.target.result,
        file: file
      })
    }
    reader.readAsDataURL(file)
  }

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id))
    setImageFiles(prev => {
      const imageIndex = images.findIndex(img => img.id === id)
      return prev.filter((_, index) => index !== imageIndex)
    })
  }

  const removeVideo = () => {
    setVideo(null)
    setVideoFile(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.description || !formData.category) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    
    try {
      // Upload new images
      const existingImages = images.filter(img => img.isExisting).map(img => img.url)
      const newImageFiles = imageFiles
      
      let uploadedImages = [...existingImages]
      for (const file of newImageFiles) {
        const result = await uploadFile(file, 'orchard-images', 'images/')
        if (result.success) {
          uploadedImages.push(result.data.url)
        }
      }

      // Upload new video if present
      let uploadedVideoUrl = video?.isExisting ? video.url : null
      if (videoFile) {
        const result = await uploadFile(videoFile, 'orchard-videos', 'videos/')
        if (result.success) {
          uploadedVideoUrl = result.data.url
        }
      }

      // Update orchard
      const updateData = {
        ...formData,
        images: uploadedImages,
        video_url: uploadedVideoUrl
      }

      const result = await updateOrchard(orchardId, updateData)

      if (result.success) {
        toast.success('Orchard updated successfully!')
        
        // Trigger refresh in other tabs/components
        localStorage.setItem(`orchard_updated_${orchardId}`, Date.now().toString())
        localStorage.removeItem(`orchard_updated_${orchardId}`)
        
        navigate('/my-orchards')
      } else {
        toast.error(result.error || 'Failed to update orchard')
      }

    } catch (error) {
      console.error('Error updating orchard:', error)
      toast.error('Failed to update orchard. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading orchard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nav-create/20 via-background to-nav-create/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/my-orchards')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Orchards
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-nav-create">Edit Orchard</h1>
            <p className="text-muted-foreground">Update your orchard details</p>
          </div>
        </div>

        <Card className="bg-card/90 backdrop-blur-sm border-border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <TreePine className="h-5 w-5 mr-2" />
              Orchard Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Title *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter orchard title"
                  className="border-border focus:border-primary"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description *
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your orchard..."
                  className="border-border focus:border-primary min-h-[120px]"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category *
                </label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger className="border-border focus:border-primary">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Location
                </label>
                <Input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Enter location"
                  className="border-border focus:border-primary"
                />
              </div>

              {/* Why Needed */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Why is this needed?
                </label>
                <Textarea
                  value={formData.why_needed}
                  onChange={(e) => handleInputChange('why_needed', e.target.value)}
                  placeholder="Explain why this orchard is important..."
                  className="border-border focus:border-primary"
                />
              </div>

              {/* How it Helps */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  How will this help?
                </label>
                <Textarea
                  value={formData.how_it_helps}
                  onChange={(e) => handleInputChange('how_it_helps', e.target.value)}
                  placeholder="Describe how this will make a difference..."
                  className="border-border focus:border-primary"
                />
              </div>

              {/* Community Impact */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Community Impact
                </label>
                <Textarea
                  value={formData.community_impact}
                  onChange={(e) => handleInputChange('community_impact', e.target.value)}
                  placeholder="How will this impact the community?"
                  className="border-border focus:border-primary"
                />
              </div>

              {/* Expected Completion */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Expected Completion Timeline
                </label>
                <Textarea
                  value={formData.expected_completion}
                  onChange={(e) => handleInputChange('expected_completion', e.target.value)}
                  placeholder="When do you expect to complete this?"
                  className="border-border focus:border-primary"
                />
              </div>

              {/* Gosat Financial Controls */}
              {userRoles.includes('gosat') || userRoles.includes('admin') ? (
                <>
                  <div className="border-t border-border pt-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                      <Settings className="h-5 w-5 mr-2 text-primary" />
                      Gosat Financial Controls
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Seed Value */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Seed Value (Total Project Value)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.seed_value}
                          onChange={(e) => handleInputChange('seed_value', e.target.value)}
                          placeholder="Enter total project value"
                          className="border-border focus:border-primary"
                        />
                      </div>

                      {/* Pocket Price */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Pocket Price (Price per pocket)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.pocket_price}
                          onChange={(e) => handleInputChange('pocket_price', e.target.value)}
                          placeholder="Enter price per pocket"
                          className="border-border focus:border-primary"
                        />
                      </div>
                    </div>
                    
                    {formData.seed_value && formData.pocket_price && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Calculated Total Pockets:</strong> {Math.ceil(Number(formData.seed_value) / Number(formData.pocket_price))}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Images (Max 5)
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload images (JPG, PNG - Max 5MB each)
                    </p>
                  </label>
                </div>
                
                {/* Image Preview */}
                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((image) => (
                      <div key={image.id} className="relative">
                        <img
                          src={image.url}
                          alt="Preview"
                          className="w-full h-32 object-cover rounded-lg border border-border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => removeImage(image.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Video (Optional)
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload" className="cursor-pointer">
                    <Video className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload video (MP4 - Max 50MB)
                    </p>
                  </label>
                </div>
                
                {/* Video Preview */}
                {video && (
                  <div className="mt-4 relative">
                    <video
                      src={video.url}
                      controls
                      className="w-full h-48 rounded-lg border border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeVideo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/my-orchards')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                >
                  {saving || uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {uploading ? 'Uploading...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Update Orchard
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}