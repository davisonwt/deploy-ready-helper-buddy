import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Gift, 
  Heart, 
  Sparkles, 
  User,
  DollarSign,
  Send,
  Users,
  HandHeart
} from 'lucide-react'

export default function FreeWillGiftingPage() {
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [frequency, setFrequency] = useState('one-time')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // Handle free will gifting logic here
    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nav-gifting/20 via-background to-nav-gifting/10">
      {/* Welcome Section with Profile Picture */}
      <div className="bg-nav-gifting/20 backdrop-blur-sm p-8 rounded-2xl border border-nav-gifting/30 shadow-lg mb-8">
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
            <h1 className="text-3xl font-bold text-purple-700">
              Free-Will Gifting, {user?.first_name || 'Friend'}!
            </h1>
            <p className="text-purple-600 text-lg">
              Spread love and blessings through spontaneous giving
            </p>
            <p className="text-purple-500 text-sm mt-1">
              Preferred Currency: {user?.preferred_currency || 'USD'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-nav-gifting/30 rounded-full">
              <Gift className="h-12 w-12 text-purple-700" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-purple-700 mb-2">Free-Will Gifting</h2>
          <p className="text-purple-600 max-w-2xl mx-auto">
            "Give freely as you have received freely." Share your blessings with others in the community through spontaneous acts of generosity.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gifting Form */}
          <Card className="bg-nav-gifting/10 backdrop-blur-sm border-nav-gifting/30">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-700">
                <HandHeart className="h-5 w-5 mr-2" />
                Send a Gift
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
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

                <Button
                  type="submit"
                  disabled={loading || !amount || !recipient}
                  className="w-full bg-nav-gifting hover:bg-nav-gifting/90 text-purple-700"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-700 border-t-transparent mr-2" />
                      Sending Gift...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Gift
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Gifts & Community */}
          <div className="space-y-6">
            <Card className="bg-nav-gifting/10 backdrop-blur-sm border-nav-gifting/30">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-700">
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

            <Card className="bg-nav-gifting/10 backdrop-blur-sm border-nav-gifting/30">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-700">
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
  )
}