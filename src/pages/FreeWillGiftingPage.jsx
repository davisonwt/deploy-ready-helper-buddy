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
    <div className="min-h-screen text-slate-100 relative" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)' }}>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,211,238,0.10), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(245,158,11,0.08), transparent 60%)' }} />
      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <Button onClick={() => navigate(-1)} variant="ghost" className="gap-2 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10">← Go Back</Button>
        </div>

        {/* Welcome Section */}
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="rounded-2xl border border-cyan-400/25 bg-[#0f172a]/80 backdrop-blur p-6 shadow-[0_0_40px_rgba(34,211,238,0.10)]">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.35)]">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cyan-500/40 to-violet-500/40 flex items-center justify-center"><User className="h-10 w-10 text-white" /></div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-black text-white drop-shadow-[0_2px_8px_rgba(34,211,238,0.25)]">Free-Will Gifting</h1>
                <p className="text-slate-300">Give from the heart, bless others freely</p>
                <p className="text-xs mt-1 text-cyan-300/80">Payment Method: USDC</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero / verse */}
          <div className="text-center mb-8 rounded-2xl border border-amber-400/25 bg-[#0f172a]/80 backdrop-blur p-8 shadow-[0_0_40px_rgba(245,158,11,0.10)]">
            <div className="flex items-center justify-center mb-3 gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/30"><Gift className="h-10 w-10 text-amber-300" /></div>
              <h2 className="text-2xl font-black text-white">Share Your Blessings</h2>
            </div>
            <p className="max-w-2xl mx-auto text-slate-300/90 italic">
              "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for elohim loves a cheerful giver." — 2 Corinthians 9:7
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gift Form */}
            <div className="rounded-2xl border border-cyan-400/25 bg-[#0f172a]/80 backdrop-blur p-6 shadow-[0_0_40px_rgba(34,211,238,0.10)]">
              <h3 className="flex items-center text-cyan-200 font-black text-lg mb-4"><HandHeart className="h-5 w-5 mr-2" /> Send a Free-Will Gift</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label className="text-slate-200">Gift Type</Label>
                  <RadioGroup value={giftType} onValueChange={setGiftType} className="grid grid-cols-1 gap-3 mt-2">
                    {giftTypes.map((type) => {
                      const accents = { rain: 'border-cyan-400/30 hover:bg-cyan-500/10 data-[state=checked]:bg-cyan-500/15', seed: 'border-emerald-400/30 hover:bg-emerald-500/10', harvest: 'border-violet-400/30 hover:bg-violet-500/10' };
                      const iconColor = { rain: 'text-cyan-300', seed: 'text-emerald-300', harvest: 'text-violet-300' };
                      const isSel = giftType === type.id;
                      return (
                        <label key={type.id} htmlFor={type.id} className={`flex items-center gap-3 p-3 rounded-xl border ${accents[type.id]} bg-white/5 backdrop-blur cursor-pointer transition ${isSel ? 'ring-2 ring-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.25)]' : ''}`}>
                          <RadioGroupItem value={type.id} id={type.id} />
                          <type.icon className={`h-5 w-5 ${iconColor[type.id]}`} />
                          <div>
                            <div className="font-semibold text-white">{type.title}</div>
                            <p className="text-sm text-slate-400">{type.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="amount" className="text-slate-200">Amount (USDC)</Label>
                  <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" />
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {suggestedAmounts.map((suggAmount) => (
                      <button key={suggAmount} type="button" onClick={() => setAmount(suggAmount.toString())} className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${amount === suggAmount.toString() ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.30)]' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}>${suggAmount}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="recipient" className="text-slate-200">Recipient (Optional)</Label>
                  <Input id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient name or leave blank for community pool" />
                </div>

                <div>
                  <Label htmlFor="message" className="text-slate-200">Message (Optional)</Label>
                  <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add a blessing or encouragement..." rows={4} />
                </div>

                <div>
                  <Label className="text-slate-200">Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-time">One-time Gift</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <button type="submit" disabled={loading || !amount} className="w-full h-12 rounded-xl font-black text-white bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 shadow-[0_0_30px_rgba(34,211,238,0.35)] disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Processing Gift...</> : <><Send className="h-4 w-4" /> Add Gift to Basket</>}
                </button>
              </form>
            </div>

            {/* Guidelines */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-400/25 bg-[#0f172a]/80 backdrop-blur p-6 shadow-[0_0_40px_rgba(16,185,129,0.10)]">
                <h3 className="flex items-center text-emerald-200 font-black text-lg mb-4"><Sparkles className="h-5 w-5 mr-2" /> Gifting Guidelines</h3>
                <div className="space-y-3 text-sm text-slate-300">
                  <div className="flex items-start gap-2"><Heart className="h-4 w-4 mt-0.5 text-rose-300" /><p>Give cheerfully and from the heart</p></div>
                  <div className="flex items-start gap-2"><Users className="h-4 w-4 mt-0.5 text-cyan-300" /><p>Consider those in your community who may be in need</p></div>
                  <div className="flex items-start gap-2"><DollarSign className="h-4 w-4 mt-0.5 text-amber-300" /><p>Give within your means and abilities</p></div>
                  <div className="flex items-start gap-2"><Gift className="h-4 w-4 mt-0.5 text-violet-300" /><p>Include encouragement and prayer when possible</p></div>
                </div>
              </div>
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