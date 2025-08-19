import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useBillingInfo } from '../hooks/useBillingInfo'
import { useBasket } from '../hooks/useBasket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import BillingInfoForm from '@/components/BillingInfoForm'
import PaymentModal from '@/components/PaymentModal'
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
import { useFileUpload } from '../hooks/useFileUpload.jsx'

export default function FreeWillGiftingPage() {
  const { user } = useAuth()
  const { billingInfo, hasCompleteBillingInfo } = useBillingInfo()
  const { addToBasket } = useBasket()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [giftType, setGiftType] = useState('rain')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [frequency, setFrequency] = useState('one-time')
  const [loading, setLoading] = useState(false)
  const [showBillingForm, setShowBillingForm] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pendingGiftData, setPendingGiftData] = useState(null)
  
  // Seed form states
  const [seedTitle, setSeedTitle] = useState('')
  const [seedDescription, setSeedDescription] = useState('')
  const [seedCategory, setSeedCategory] = useState('')
  const [seedTargetAmount, setSeedTargetAmount] = useState('')
  const [seedBeneficiaries, setSeedBeneficiaries] = useState('')
  const [seedImpact, setSeedImpact] = useState('')
  const { uploadFile, uploading } = useFileUpload()
  const [seedImage, setSeedImage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Add gift item to basket
      const giftItem = {
        orchardId: 'free-will-gift',
        orchardTitle: `Free-Will ${giftType.charAt(0).toUpperCase() + giftType.slice(1)} Gift`,
        amount: parseFloat(amount),
        currency: 'USDC',
        pockets: [],
        type: 'free_will_gift',
        recipient: recipient || 'Community Pool',
        message: message,
        frequency: frequency
      }
      
      addToBasket(giftItem)
      
      // Reset form
      setAmount("")
      setRecipient("")
      setMessage("")
      
      toast({
        title: "Gift Added to Basket",
        description: "Your free-will gift has been added to your basket! Please proceed to checkout."
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error adding your gift to the basket.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBillingInfoComplete = () => {
    setShowBillingForm(false)
    if (pendingGiftData) {
      setShowPaymentModal(true)
    }
  }

  const handlePaymentComplete = () => {
    setShowPaymentModal(false)
    setPendingGiftData(null)
    setAmount("")
    setRecipient("")
    setMessage("")
    toast({
      title: "Gift Sent!",
      description: "Your free-will gift has been processed successfully!"
    })
  }

  const handleSeedSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit a seed.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      let imageUrl = null
      if (seedImage) {
        imageUrl = await uploadFile(seedImage, 'seed-images')
      }

      const { data, error } = await supabase
        .from('seeds')
        .insert([
          {
            title: seedTitle,
            description: seedDescription,
            category: seedCategory,
            target_amount: parseFloat(seedTargetAmount),
            beneficiaries: seedBeneficiaries,
            impact_description: seedImpact,
            image_url: imageUrl,
            user_id: user.id,
            status: 'pending'
          }
        ])

      if (error) throw error

      toast({
        title: "Seed Submitted!",
        description: "Your seed has been submitted for review and will be processed soon."
      })

      // Reset form
      setSeedTitle('')
      setSeedDescription('')
      setSeedCategory('')
      setSeedTargetAmount('')
      setSeedBeneficiaries('')
      setSeedImpact('')
      setSeedImage(null)
      
    } catch (error) {
      console.error('Error submitting seed:', error)
      toast({
        title: "Submission Error",
        description: "There was an error submitting your seed. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const giftTypes = [
    { 
      id: 'rain', 
      title: 'Rain Gift', 
      description: 'Spontaneous blessing for someone in need',
      icon: Droplets,
      color: 'text-blue-600'
    },
    { 
      id: 'seed', 
      title: 'Seed Gift', 
      description: 'Plant a seed for future blessings',
      icon: Sprout,
      color: 'text-green-600'
    },
    { 
      id: 'harvest', 
      title: 'Harvest Gift', 
      description: 'Celebrate and share abundance',
      icon: Heart,
      color: 'text-purple-600'
    }
  ]

  const suggestedAmounts = [25, 50, 100, 250, 500]

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
          src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/free%20will%20gifting%201280x720.mp4"
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
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-purple-400 shadow-lg">
              {user?.profile_picture ? (
                <img 
                  src={user.profile_picture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  <User className="h-10 w-10 text-white" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-purple-600">
                Free-Will Gifting
              </h1>
              <p className="text-lg text-purple-700">
                Give from the heart, bless others freely
              </p>
              <p className="text-sm mt-1 text-purple-600">
                Payment Method: USDC (USD Coin)
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-8 px-8 py-6 bg-white/90 rounded-3xl shadow-lg">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-purple-100/80 rounded-full mr-4">
                <Gift className="h-12 w-12 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-purple-700">Share Your Blessings</h2>
            </div>
            <p className="max-w-2xl mx-auto text-purple-600">
              "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for elohim loves a cheerful giver." - 2 Corinthians 9:7
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gift Form */}
            <Card className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-700">
                  <HandHeart className="h-5 w-5 mr-2" />
                  Send a Free-Will Gift
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label className="text-purple-700">Gift Type</Label>
                    <RadioGroup 
                      value={giftType} 
                      onValueChange={setGiftType}
                      className="grid grid-cols-1 gap-4 mt-2"
                    >
                      {giftTypes.map((type) => (
                        <div key={type.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-purple-50/50">
                          <RadioGroupItem value={type.id} id={type.id} />
                          <div className="flex items-center space-x-3 flex-1">
                            <type.icon className={`h-5 w-5 ${type.color}`} />
                            <div>
                              <Label htmlFor={type.id} className="font-medium text-purple-700">{type.title}</Label>
                              <p className="text-sm text-purple-600">{type.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="amount" className="text-purple-700">Amount (USDC)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="border-purple-300 focus:border-purple-500"
                    />
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {suggestedAmounts.map((suggAmount) => (
                        <Button
                          key={suggAmount}
                          type="button"
                          variant={amount === suggAmount.toString() ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setAmount(suggAmount.toString())}
                          className={amount === suggAmount.toString() ? 'bg-purple-600 text-white' : 'border-purple-300 text-purple-700'}
                        >
                          ${suggAmount}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="recipient" className="text-purple-700">Recipient (Optional)</Label>
                    <Input
                      id="recipient"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="Enter recipient name or leave blank for community pool"
                      className="border-purple-300 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-purple-700">Message (Optional)</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Add a blessing or encouragement..."
                      rows={4}
                      className="border-purple-300 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <Label className="text-purple-700">Frequency</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger className="border-purple-300 focus:border-purple-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-time">One-time Gift</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !amount}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    style={{ color: '#ffffff' }}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Processing Gift...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" style={{ color: '#ffffff' }} />
                        <span style={{ color: '#ffffff' }}>Add Gift to Basket</span>
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Information & Guidelines */}
            <div className="space-y-6">
              <Card className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-700">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Gifting Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm text-green-700">
                    <div className="flex items-start space-x-2">
                      <Heart className="h-4 w-4 mt-0.5 text-purple-500" />
                      <p>Give cheerfully and from the heart</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Users className="h-4 w-4 mt-0.5 text-purple-500" />
                      <p>Consider those in your community who may be in need</p>
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

        {/* Billing Info Form Modal */}
        {showBillingForm && (
          <BillingInfoForm
            isOpen={showBillingForm}
            onClose={() => setShowBillingForm(false)}
            onComplete={handleBillingInfoComplete}
          />
        )}

        {/* Payment Modal */}
        {showPaymentModal && pendingGiftData && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            paymentDetails={{
              orchardTitle: 'Free-Will Rain Gift',
              amount: pendingGiftData.amount,
              currency: 'USDC',
              pockets: [],
              type: 'rain_gift'
            }}
            onPaymentComplete={handlePaymentComplete}
          />
        )}
      </div>
    </div>
  )
}