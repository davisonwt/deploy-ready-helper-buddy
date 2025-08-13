import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  const [amount, setAmount] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Handle tithing submission logic here
      console.log('Tithing submission:', { amount, frequency, message })
      setMessage("Thank you for your faithful tithing!")
    } catch (error) {
      setMessage("There was an error processing your tithing.")
    } finally {
      setLoading(false)
    }
  }

  const suggestedAmounts = [50, 100, 200, 500, 1000]

  return (
    <div className="min-h-screen" style={{ backgroundImage: 'linear-gradient(to bottom right, #ffadad20, #f8fafc, #ffadad10)' }}>
      {/* Welcome Section with Profile Picture */}
      <div className="bg-nav-tithing/20 backdrop-blur-sm p-8 rounded-2xl border border-nav-tithing/30 shadow-lg mb-8">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-nav-tithing shadow-lg">
            {user?.profile_picture ? (
              <img 
                src={user.profile_picture} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-nav-tithing to-nav-tithing/80 flex items-center justify-center">
                <User className="h-10 w-10 text-red-700" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-nav-tithing">
              Tithing, {user?.first_name || 'Friend'}!
            </h1>
            <p className="text-red-600 text-lg">
              Honor elohim with your faithful giving
            </p>
            <p className="text-red-500 text-sm mt-1">
              Preferred Currency: {user?.preferred_currency || 'USD'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-nav-tithing/30 rounded-full">
              <HandHeart className="h-12 w-12 text-red-700" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-red-700 mb-2">Faithful Tithing</h2>
          <p className="text-red-600 max-w-2xl mx-auto">
            "Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this," says yhvh (the creator) Almighty, "and see if I will not throw open the floodgates of heaven and pour out so much blessing that there will not be room enough to store it." - Malachi 3:10
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tithing Form */}
          <Card className="bg-nav-tithing/10 backdrop-blur-sm border-nav-tithing/30">
            <CardHeader>
              <CardTitle className="flex items-center text-red-700">
                <HandHeart className="h-5 w-5 mr-2" />
                Set Up Your Tithe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="amount" className="text-red-700">
                    Tithe Amount ({user?.preferred_currency || 'USD'})
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="border-nav-tithing/30 focus:border-nav-tithing"
                  />
                </div>

                <div>
                  <Label className="text-red-700">Suggested Amounts</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {suggestedAmounts.map((suggAmount) => (
                      <Button
                        key={suggAmount}
                        type="button"
                        variant={amount === suggAmount.toString() ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAmount(suggAmount.toString())}
                        className={amount === suggAmount.toString() ? 'bg-nav-tithing text-red-700' : 'border-nav-tithing/30 text-red-700'}
                      >
                        ${suggAmount}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-red-700">Frequency</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {['weekly', 'monthly', 'yearly'].map((freq) => (
                      <Button
                        key={freq}
                        type="button"
                        variant={frequency === freq ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFrequency(freq)}
                        className={frequency === freq ? 'bg-nav-tithing text-red-700' : 'border-nav-tithing/30 text-red-700'}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !amount}
                  className="w-full bg-nav-tithing hover:bg-nav-tithing/90 text-red-700"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-700 border-t-transparent mr-2" />
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
                  <div className="p-4 bg-nav-tithing/20 border border-nav-tithing/30 rounded-lg">
                    <p className="text-red-700 text-center">{message}</p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Information & Scripture */}
          <div className="space-y-6">
            <Card className="bg-nav-tithing/10 backdrop-blur-sm border-nav-tithing/30">
              <CardHeader>
                <CardTitle className="flex items-center text-red-700">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Why We Tithe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm text-red-600">
                  <div className="flex items-start space-x-2">
                    <Heart className="h-4 w-4 mt-0.5 text-red-500" />
                    <p>Tithing is an act of worship and obedience to elohim</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Gift className="h-4 w-4 mt-0.5 text-red-500" />
                    <p>It supports our community projects</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Star className="h-4 w-4 mt-0.5 text-red-500" />
                    <p>elohim promises to bless faithful givers</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <HandHeart className="h-4 w-4 mt-0.5 text-red-500" />
                    <p>It helps build elohim's kingdom on earth</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-nav-tithing/10 backdrop-blur-sm border-nav-tithing/30">
              <CardHeader>
                <CardTitle className="flex items-center text-red-700">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Tithing Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-red-600">This Month</span>
                    <Badge variant="secondary" className="bg-nav-tithing/30 text-red-700">
                      $0
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-600">This Year</span>
                    <Badge variant="secondary" className="bg-nav-tithing/30 text-red-700">
                      $0
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-600">Total Given</span>
                    <Badge variant="secondary" className="bg-nav-tithing/30 text-red-700">
                      $0
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-nav-tithing/10 backdrop-blur-sm border-nav-tithing/30">
              <CardContent className="p-6">
                <blockquote className="text-red-600 italic text-center">
                  "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for elohim loves a cheerful giver."
                  <br />
                  <cite className="text-red-700 font-semibold not-italic">- 2 Corinthians 9:7</cite>
                </blockquote>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}