import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Gift, 
  Heart, 
  Sparkles, 
  User,
  DollarSign,
  Send,
  Users,
  HandHeart,
  Sprout,
  Droplets,
  Upload
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export default function FreeWillGiftingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [giftType, setGiftType] = useState('rain')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [frequency, setFrequency] = useState('one-time')
  const [loading, setLoading] = useState(false)
  
  // Seed form states
  const [seedTitle, setSeedTitle] = useState('')
  const [seedDescription, setSeedDescription] = useState('')
  const [seedCategory, setSeedCategory] = useState('')
  const { toast } = useToast()

  const categories = [
    'Technology', 'Education', 'Healthcare', 'Agriculture', 'Arts & Culture',
    'Community Service', 'Environment', 'Business', 'Food & Nutrition', 'Other'
  ]

  const handleGiftTypeChange = (value) => {
    setGiftType(value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (giftType === 'rain') {
        // Handle free will gifting logic here
        toast({
          title: "Gift Sent!",
          description: "Your free-will gift has been sent successfully.",
        })
      } else if (giftType === 'seed') {
        // Handle seed submission
        if (!seedTitle || !seedDescription || !seedCategory) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields.",
            variant: "destructive"
          })
          return
        }

        const { data, error } = await supabase
          .from('seeds')
          .insert({
            gifter_id: user.id,
            title: seedTitle,
            description: seedDescription,
            category: seedCategory
          })

        if (error) throw error

        toast({
          title: "Seed Submitted!",
          description: "Your seed has been submitted for gosat review.",
        })
        
        // Reset form
        setSeedTitle('')
        setSeedDescription('')
        setSeedCategory('')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          console.error('Video failed to load:', e);
          e.target.style.display = 'none';
        }}
      >
        <source
          src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/free-will%20giving.mp4"
          type="video/mp4"
        />
      </video>
      
      {/* Solid dark overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-black/80"></div>
      
      {/* Content */}
      <div className="relative z-10">
      {/* Welcome Section with Profile Picture */}
      <div className="max-w-4xl mx-auto p-8 rounded-2xl border shadow-2xl mb-8 mt-4 bg-white/90">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-nav-gifting shadow-lg">
            {user?.profile_picture ? (
              <img 
                src={user.profile_picture} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-nav-gifting to-nav-gifting/80 flex items-center justify-center">
                <User className="h-10 w-10 text-purple-700" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold px-8 py-4 rounded-lg" style={{ 
              color: 'hsl(280, 100%, 80%)', 
              textShadow: '2px 2px 4px hsl(280, 100%, 60%)'
            }}>
              Free-Will Gifting
            </h1>
            <p className="text-lg" style={{ color: '#084caa' }}>
              Spread love and blessings through spontaneous giving
            </p>
            <p className="text-sm mt-1" style={{ color: '#084caa' }}>
              Preferred Currency: {user?.preferred_currency || 'USD'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gifting Form */}
          <Card className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center" style={{ 
                color: 'hsl(160, 100%, 70%)', 
                textShadow: '2px 2px 0px hsl(160, 100%, 30%), -1px -1px 0px hsl(160, 100%, 30%), 1px -1px 0px hsl(160, 100%, 30%), -1px 1px 0px hsl(160, 100%, 30%)',
                WebkitTextStroke: '1px hsl(160, 100%, 30%)'
              }}>
                <HandHeart className="h-5 w-5 mr-2" />
                Send a Gift
              </CardTitle>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Gift Type Selection */}
              <div>
                <label className="block text-sm font-medium text-purple-700 mb-3">
                  Choose Gift Type
                </label>
                <RadioGroup value={giftType} onValueChange={handleGiftTypeChange} className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 border border-nav-gifting/30 rounded-lg hover:bg-nav-gifting/10 transition-colors">
                    <RadioGroupItem value="rain" id="rain" />
                    <Label htmlFor="rain" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="font-medium text-purple-700">Rain/Compost</div>
                        <div className="text-sm text-purple-600">Free-will support to 364yhvh community projects</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border border-nav-gifting/30 rounded-lg hover:bg-nav-gifting/10 transition-colors">
                    <RadioGroupItem value="seed" id="seed" />
                    <Label htmlFor="seed" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <Sprout className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="font-medium text-purple-700">Seed</div>
                        <div className="text-sm text-purple-600">Gift a product, service, or skill to the community</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {giftType === 'rain' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-2">
                      Gift Amount ({user?.preferred_currency || 'USD'})
                    </label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="border-nav-gifting/30 focus:border-nav-gifting"
                    />
                  </div>

                <div>
                  <label className="block text-sm font-medium text-purple-700 mb-2">
                    Recipient (Email or Username)
                  </label>
                  <Input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter recipient"
                    className="border-nav-gifting/30 focus:border-nav-gifting"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-700 mb-2">
                    Frequency
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['one-time', 'monthly', 'weekly'].map((freq) => (
                      <Button
                        key={freq}
                        type="button"
                        variant={frequency === freq ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFrequency(freq)}
                        className={frequency === freq ? 'bg-nav-gifting text-purple-700' : 'border-nav-gifting/30 text-purple-700'}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1).replace('-', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>

                </>
              )}

              {giftType === 'seed' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-2">
                      Seed Title *
                    </label>
                    <Input
                      type="text"
                      value={seedTitle}
                      onChange={(e) => setSeedTitle(e.target.value)}
                      placeholder="What are you offering?"
                      className="border-nav-gifting/30 focus:border-nav-gifting"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-2">
                      Category *
                    </label>
                    <Select value={seedCategory} onValueChange={setSeedCategory}>
                      <SelectTrigger className="border-nav-gifting/30 focus:border-nav-gifting">
                        <SelectValue placeholder="Select category" />
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

                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-2">
                      Description *
                    </label>
                    <Textarea
                      value={seedDescription}
                      onChange={(e) => setSeedDescription(e.target.value)}
                      placeholder="Describe your offering in detail..."
                      className="border-nav-gifting/30 focus:border-nav-gifting"
                      rows={4}
                      required
                    />
                  </div>
                </>
              )}

               {giftType === 'rain' && (
                 <div>
                   <label className="block text-sm font-medium text-purple-700 mb-2">
                     Personal Message (Optional)
                   </label>
                   <Textarea
                     value={message}
                     onChange={(e) => setMessage(e.target.value)}
                     placeholder="Share a blessing or encouragement..."
                     className="border-nav-gifting/30 focus:border-nav-gifting"
                     rows={3}
                   />
                 </div>
               )}

                <Button
                  type="submit"
                  disabled={loading || (giftType === 'rain' && (!amount || !recipient)) || (giftType === 'seed' && (!seedTitle || !seedDescription || !seedCategory))}
                  className="w-full bg-nav-gifting hover:bg-nav-gifting/90 text-purple-700"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-700 border-t-transparent mr-2" />
                      {giftType === 'seed' ? 'Submitting Seed...' : 'Sending Gift...'}
                    </>
                  ) : (
                    <>
                      {giftType === 'seed' ? <Sprout className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      {giftType === 'seed' ? 'Submit Seed' : 'Send Gift'}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Gifts & Community */}
          <div className="space-y-6">
            <Card className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center" style={{ 
                  color: 'hsl(320, 100%, 75%)', 
                  textShadow: '1px 1px 2px hsl(320, 100%, 55%)' 
                }}>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Recent Community Gifts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-nav-gifting/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-nav-gifting rounded-full flex items-center justify-center">
                          <Heart className="h-4 w-4 text-purple-700" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-purple-700">Anonymous Gift</p>
                          <p className="text-xs text-purple-600">To community member</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-nav-gifting/30 text-purple-700">
                        ${(Math.random() * 100).toFixed(0)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center" style={{ 
                  color: 'hsl(200, 100%, 75%)', 
                  textShadow: '1px 1px 2px hsl(200, 100%, 55%)' 
                }}>
                  <Users className="h-5 w-5 mr-2" />
                  Gifting Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-purple-600">
                  <div className="flex items-start space-x-2">
                    <Heart className="h-4 w-4 mt-0.5 text-purple-500" />
                    <p>Give from the heart without expectation of return</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Sparkles className="h-4 w-4 mt-0.5 text-purple-500" />
                    <p>Consider the recipient's genuine needs</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <DollarSign className="h-4 w-4 mt-0.5 text-purple-500" />
                    <p>Give within your means and abilities</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Gift className="h-4 w-4 mt-0.5 text-purple-500" />
                    <p>Include encouragement and prayer when possible</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}