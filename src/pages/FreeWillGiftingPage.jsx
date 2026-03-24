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
      const giftItem = {
        orchardId: 'free-will-gift',
        orchardTitle: `Free-Will ${giftType.charAt(0).toUpperCase() + giftType.slice(1)} Bestowal`,
        amount: parseFloat(amount),
        currency: 'USDC',
        pockets: [],
        type: 'free_will_gift',
        recipient: recipient || 'Community Pool',
        message: message,
        frequency: frequency
      }
      
      addToBasket(giftItem)
      
      setAmount("")
      setRecipient("")
      setMessage("")
      
      toast({
        title: "Bestowal Added to Basket",
        description: "Your free-will bestowal has been added to your basket! Please proceed to checkout."
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error adding your bestowal to the basket.",
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
      title: "Bestowal Sent!",
      description: "Your free-will bestowal has been processed successfully!"
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
      title: 'Rain Bestowal', 
      description: 'Spontaneous blessing for someone in need',
      icon: Droplets,
      color: 'text-amber-600'
    },
    { 
      id: 'seed', 
      title: 'Seed Bestowal', 
      description: 'Plant a seed for future blessings',
      icon: Sprout,
      color: 'text-emerald-600'
    },
    { 
      id: 'harvest', 
      title: 'Harvest Bestowal', 
      description: 'Celebrate and share abundance',
      icon: Heart,
      color: 'text-rose-600'
    }
  ]

  const suggestedAmounts = [25, 50, 100, 250, 500]

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(165deg, #2d1810 0%, #3d1f14 30%, #4a2518 60%, #2a1a12 100%)' }}>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Welcome Section */}
        <div className="max-w-4xl mx-auto p-6 rounded-2xl border border-amber-700/30 shadow-2xl mb-6 mt-4" style={{ background: 'rgba(45, 24, 16, 0.8)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-amber-500/50 shadow-lg flex-shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center">
                  <User className="h-8 w-8 text-amber-100" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-amber-50">Free-Will Bestowing</h1>
              <p className="text-amber-300/70 text-sm">Give from the heart, bless others freely</p>
              <p className="text-xs mt-1 text-amber-400/50">Payment Method: USDC (USD Coin)</p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Scripture Header */}
          <div className="text-center mb-6 px-6 py-5 rounded-2xl border border-amber-700/30 shadow-lg" style={{ background: 'rgba(45, 24, 16, 0.7)' }}>
            <div className="flex items-center justify-center mb-3">
              <div className="p-2.5 bg-amber-600/20 rounded-full mr-3">
                <Gift className="h-8 w-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-amber-100">Share Your Blessings</h2>
            </div>
            <p className="max-w-2xl mx-auto text-amber-300/60 text-sm leading-relaxed">
              "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for elohim loves a cheerful giver." - 2 Corinthians 9:7
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gift Form */}
            <Card className="border-amber-700/30 shadow-xl" style={{ background: 'rgba(45, 24, 16, 0.8)', backdropFilter: 'blur(12px)' }}>
              <CardHeader>
                <CardTitle className="flex items-center text-amber-100 text-base">
                  <HandHeart className="h-5 w-5 mr-2 text-amber-400" />
                  Send a Free-Will Bestowal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label className="text-amber-200/80 text-sm">Bestowal Type</Label>
                    <RadioGroup 
                      value={giftType} 
                      onValueChange={setGiftType}
                      className="grid grid-cols-1 gap-3 mt-2"
                    >
                      {giftTypes.map((type) => (
                        <div key={type.id} className="flex items-center space-x-2 p-3 border border-amber-700/30 rounded-xl hover:bg-amber-800/20 transition">
                          <RadioGroupItem value={type.id} id={type.id} />
                          <div className="flex items-center space-x-3 flex-1">
                            <type.icon className={`h-5 w-5 ${type.color}`} />
                            <div>
                              <Label htmlFor={type.id} className="font-medium text-amber-100 text-sm">{type.title}</Label>
                              <p className="text-xs text-amber-300/50">{type.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="amount" className="text-amber-200/80 text-sm">Amount (USDC)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="border-amber-700/40 bg-black/20 text-amber-50 placeholder:text-amber-500/30 focus:border-amber-500"
                    />
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {suggestedAmounts.map((suggAmount) => (
                        <Button
                          key={suggAmount}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setAmount(suggAmount.toString())}
                          className={amount === suggAmount.toString() 
                            ? 'bg-amber-600 text-amber-50 border-amber-500 hover:bg-amber-500' 
                            : 'border-amber-700/40 text-amber-300 hover:bg-amber-800/30 bg-transparent'}
                        >
                          ${suggAmount}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="recipient" className="text-amber-200/80 text-sm">Recipient (Optional)</Label>
                    <Input
                      id="recipient"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="Enter recipient name or leave blank for community pool"
                      className="border-amber-700/40 bg-black/20 text-amber-50 placeholder:text-amber-500/30 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-amber-200/80 text-sm">Message (Optional)</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Add a blessing or encouragement..."
                      rows={3}
                      className="border-amber-700/40 bg-black/20 text-amber-50 placeholder:text-amber-500/30 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <Label className="text-amber-200/80 text-sm">Frequency</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger className="border-amber-700/40 bg-black/20 text-amber-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-time">One-time Bestowal</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !amount}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-amber-50 font-bold shadow-lg"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-200 border-t-transparent mr-2" />
                        Processing Bestowal...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Add Bestowal to Basket
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Guidelines */}
            <div className="space-y-5">
              <Card className="border-amber-700/30 shadow-xl" style={{ background: 'rgba(45, 24, 16, 0.7)' }}>
                <CardHeader>
                  <CardTitle className="flex items-center text-amber-100 text-base">
                    <Sparkles className="h-5 w-5 mr-2 text-amber-400" />
                    Bestowing Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-2">
                      <Heart className="h-4 w-4 mt-0.5 text-rose-400 flex-shrink-0" />
                      <p className="text-amber-200/70">Give cheerfully and from the heart</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Users className="h-4 w-4 mt-0.5 text-amber-400 flex-shrink-0" />
                      <p className="text-amber-200/70">Consider those in your community who may be in need</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <DollarSign className="h-4 w-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                      <p className="text-amber-200/70">Give within your means and abilities</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Gift className="h-4 w-4 mt-0.5 text-orange-400 flex-shrink-0" />
                      <p className="text-amber-200/70">Include encouragement and prayer when possible</p>
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
              orchardTitle: 'Free-Will Rain Bestowal',
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
