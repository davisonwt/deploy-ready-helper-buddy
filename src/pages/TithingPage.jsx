import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBillingInfo } from '../hooks/useBillingInfo'
import { useBasket } from '../hooks/useBasket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import BillingInfoForm from '@/components/BillingInfoForm'
import PaymentModal from '@/components/PaymentModal'
import { 
  Heart, 
  DollarSign, 
  Calendar, 
  User,
  Gift,
  Star,
  Sparkles,
  HandHeart
} from "lucide-react"

export default function TithingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { billingInfo, hasCompleteBillingInfo } = useBillingInfo()
  const { addToBasket } = useBasket()
  const [amount, setAmount] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showBillingForm, setShowBillingForm] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pendingTithingData, setPendingTithingData] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const tithingItem = {
        orchardId: 'tithing',
        orchardTitle: 'Tithing Contribution',
        amount: parseFloat(amount),
        currency: 'USDC',
        pockets: [],
        type: 'tithing',
        frequency: frequency
      }
      
      addToBasket(tithingItem)
      setMessage("Tithing added to basket! Redirecting to checkout...")
      setAmount("")
      setTimeout(() => navigate('/products/basket'), 600)
    } catch (error) {
      setMessage("There was an error adding tithing to basket.")
    } finally {
      setLoading(false)
    }
  }

  const handleBillingInfoComplete = () => {
    setShowBillingForm(false)
    if (pendingTithingData) {
      setShowPaymentModal(true)
    }
  }

  const handlePaymentComplete = () => {
    setShowPaymentModal(false)
    setPendingTithingData(null)
    setAmount("")
    setMessage("Your tithing has been processed successfully!")
  }

  const suggestedAmounts = [50, 100, 200, 500, 1000]

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
              <h1 className="text-2xl font-bold text-amber-50">Tithing</h1>
              <p className="text-amber-300/70 text-sm">Honor elohim with your faithful giving</p>
              <p className="text-xs mt-1 text-amber-400/50">Payment Method: USDC (USD Coin)</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Scripture Header */}
          <div className="max-w-2xl mx-auto text-center mb-6 px-6 py-5 rounded-2xl border border-amber-700/30 shadow-lg" style={{ background: 'rgba(45, 24, 16, 0.7)' }}>
            <div className="flex items-center justify-center mb-3">
              <div className="p-2.5 bg-amber-600/20 rounded-full mr-3">
                <HandHeart className="h-8 w-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-amber-100">Faithful Tithing</h2>
            </div>
            <p className="max-w-2xl mx-auto text-amber-300/60 text-sm leading-relaxed">
              "Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this," says yhvh (the creator) Almighty, "and see if I will not throw open the floodgates of heaven and pour out so much blessing that there will not be room enough to store it." - Malachi 3:10
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tithing Form */}
            <Card className="border-amber-700/30 shadow-xl" style={{ background: 'rgba(45, 24, 16, 0.8)', backdropFilter: 'blur(12px)' }}>
              <CardHeader>
                <CardTitle className="flex items-center text-amber-100 text-base">
                  <HandHeart className="h-5 w-5 mr-2 text-amber-400" />
                  Set Up Your Tithe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="amount" className="text-amber-200/80 text-sm">
                      Tithe Amount (USDC)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="border-amber-700/40 bg-black/20 text-amber-50 placeholder:text-amber-500/30 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <Label className="text-amber-200/80 text-sm">Suggested Amounts</Label>
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
                    <Label className="text-amber-200/80 text-sm">Frequency</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {['weekly', 'monthly', 'yearly'].map((freq) => (
                        <Button
                          key={freq}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFrequency(freq)}
                          className={frequency === freq 
                            ? 'bg-amber-600 text-amber-50 border-amber-500 hover:bg-amber-500' 
                            : 'border-amber-700/40 text-amber-300 hover:bg-amber-800/30 bg-transparent'}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !amount}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-amber-50 font-bold shadow-lg"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-200 border-t-transparent mr-2" />
                        Processing Tithe...
                      </>
                    ) : (
                      <>
                        <Heart className="h-4 w-4 mr-2" />
                        Give Tithe
                      </>
                    )}
                  </Button>

                  {message && (
                    <div className="p-3 bg-amber-600/20 border border-amber-600/30 rounded-xl">
                      <p className="text-amber-200 text-center text-sm">{message}</p>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Information & Scripture */}
            <div className="space-y-5">
              <Card className="border-amber-700/30 shadow-xl" style={{ background: 'rgba(45, 24, 16, 0.7)' }}>
                <CardHeader>
                  <CardTitle className="flex items-center text-amber-100 text-base">
                    <Sparkles className="h-5 w-5 mr-2 text-amber-400" />
                    Why We Tithe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-2">
                      <Heart className="h-4 w-4 mt-0.5 text-rose-400 flex-shrink-0" />
                      <p className="text-amber-200/70">Tithing is an act of worship and obedience to elohim</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Gift className="h-4 w-4 mt-0.5 text-orange-400 flex-shrink-0" />
                      <p className="text-amber-200/70">It supports our community orchards</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Star className="h-4 w-4 mt-0.5 text-amber-400 flex-shrink-0" />
                      <p className="text-amber-200/70">elohim promises to bless faithful givers</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <HandHeart className="h-4 w-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                      <p className="text-amber-200/70">It helps build elohim's kingdom on earth</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-700/30 shadow-xl" style={{ background: 'rgba(45, 24, 16, 0.7)' }}>
                <CardHeader>
                  <CardTitle className="flex items-center text-amber-100 text-base">
                    <DollarSign className="h-5 w-5 mr-2 text-amber-400" />
                    Tithing Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-200/70 text-sm">This Month</span>
                      <Badge className="bg-amber-600/20 text-amber-300 border-amber-600/30">$0</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-amber-200/70 text-sm">This Year</span>
                      <Badge className="bg-amber-600/20 text-amber-300 border-amber-600/30">$0</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-amber-200/70 text-sm">Total Given</span>
                      <Badge className="bg-amber-600/20 text-amber-300 border-amber-600/30">$0</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-700/30 shadow-xl" style={{ background: 'rgba(45, 24, 16, 0.7)' }}>
                <CardContent className="p-5">
                  <blockquote className="text-amber-300/70 italic text-center text-sm leading-relaxed">
                    "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for elohim loves a cheerful giver."
                    <br />
                    <cite className="text-amber-400 font-semibold not-italic">- 2 Corinthians 9:7</cite>
                  </blockquote>
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
        {showPaymentModal && pendingTithingData && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            paymentDetails={{
              orchardTitle: 'Tithing Contribution',
              amount: pendingTithingData.amount,
              currency: 'USDC',
              pockets: [],
              type: 'tithing'
            }}
            onPaymentComplete={handlePaymentComplete}
          />
        )}
      </div>
    </div>
  )
}
