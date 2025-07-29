import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useFileUpload } from '../hooks/useFileUpload'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Sprout, 
  Upload, 
  Image,
  Video,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export default function SeedSubmissionPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { uploadFile, uploading } = useFileUpload()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    additional_details: {}
  })
  
  const [images, setImages] = useState([])
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(false)
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
    "The Gift of Travel & Tourism"
  ]

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

    setLoading(true)
    
    try {
      // Upload images
      const uploadedImages = []
      for (const file of imageFiles) {
        const result = await uploadFile(file, 'orchard-images', 'seeds/')
        if (result.success) {
          uploadedImages.push(result.data.url)
        }
      }

      // Upload video if present
      let uploadedVideoUrl = null
      if (videoFile) {
        const result = await uploadFile(videoFile, 'videos', 'seeds/')
        if (result.success) {
          uploadedVideoUrl = result.data.url
        }
      }

      // Save seed to database
      const { data, error } = await supabase
        .from('seeds')
        .insert({
          gifter_id: user.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          images: uploadedImages,
          video_url: uploadedVideoUrl,
          additional_details: formData.additional_details
        })
        .select()

      if (error) throw error

      toast.success('Seed submitted successfully!')
      navigate('/364yhvh-orchards')
    } catch (error) {
      console.error('Error submitting seed:', error)
      toast.error('Failed to submit seed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-success/10 via-background to-warning/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-success/20 rounded-full">
              <Sprout className="h-12 w-12 text-success" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gift a Seed</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Share your products, services, or skills with the 364yhvh community. Your seed will be showcased in our community orchard.
          </p>
        </div>

        <Card className="bg-card/90 backdrop-blur-sm border-border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Sprout className="h-5 w-5 mr-2" />
              Seed Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Title/Name of the Seed *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter the name of your product or service"
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
                  placeholder="Provide a detailed description of your seed..."
                  className="border-border focus:border-primary min-h-[120px]"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category *
                </label>
                <Select onValueChange={(value) => handleInputChange('category', value)}>
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

              {/* Additional Details */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Additional Details (Optional)
                </label>
                <Textarea
                  placeholder="Any additional information, specifications, availability, or contact details..."
                  className="border-border focus:border-primary"
                  onChange={(e) => handleInputChange('additional_details', { notes: e.target.value })}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || uploading || !formData.title || !formData.description || !formData.category}
                className="w-full bg-success hover:bg-success/90 text-success-foreground"
              >
                {loading || uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-success-foreground border-t-transparent mr-2" />
                    {uploading ? 'Uploading files...' : 'Submitting seed...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Seed
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}