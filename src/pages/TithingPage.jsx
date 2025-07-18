import React, { useState } from "react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { 
  Church, 
  Heart, 
  DollarSign, 
  Calendar, 
  BookOpen, 
  Star,
  Gift,
  Sparkles,
  HandHeart
} from "lucide-react"

export default function TithingPage() {
  const [amount, setAmount] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate payment processing
    setTimeout(() => {
      setLoading(false)
      alert("Thank you for your faithful tithing! Your gift has been processed.")
    }, 2000)
  }
  
  const suggestedAmounts = [50, 100, 200, 500, 1000]
  
  return (
    <div className="relative min-h-screen">
      {/* Full Background Video */}
      <div className="fixed inset-0 w-full h-full z-0">
        <video 
          autoPlay 
          muted 
          loop 
          className="w-full h-full object-cover"
        >
          <source src="/tithing 1280x720.mp4" type="video/mp4" />
          <div className="w-full h-full bg-gradient-to-br from-warning/5 via-harvest/5 to-warning/10"></div>
        </video>
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>
      
      {/* Content over video */}
      <div className="relative z-10 py-8">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="bg-black/40 backdrop-blur-sm rounded-3xl p-8 mx-auto max-w-3xl border border-white/20 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-warning to-harvest rounded-full flex items-center justify-center shadow-lg">
                <HandHeart className="h-8 w-8 text-warning-foreground" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4 text-white" style={{ 
              fontFamily: "Playfair Display, serif",
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
            }}>
              Tithing
            </h1>
            <p className="text-lg max-w-2xl mx-auto text-white/90" style={{
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
            }}>
              Honor ELOHIYM with your first fruits and support YHVH364 GOSATs through faithful tithing
            </p>
            <Badge className="mt-4 bg-warning/80 text-warning-foreground border border-warning/50 backdrop-blur-sm">
              <HandHeart className="h-3 w-3 mr-1" />
              YHVH364 GOSATs Ministry
            </Badge>
          </div>
        </div>
        
        {/* Scripture Section */}
        <Card className="bg-card/90 backdrop-blur-sm border-warning/20 shadow-xl">
          <CardContent className="p-8 text-center">
            <BookOpen className="h-8 w-8 text-warning mx-auto mb-4" />
            <blockquote className="text-xl text-foreground italic mb-4 leading-relaxed">
              "Bring the whole tithe into the storehouse, that there may be food in my house. 
              Test me in this, says YHVH Almighty, and see if I will not throw open the floodgates of heaven 
              and pour out so much blessing that there will not be room enough to store it."
            </blockquote>
            <cite className="text-warning font-semibold">- Malachi 3:10</cite>
          </CardContent>
        </Card>
        
        {/* Tithing Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Your Tithing Gift
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <DollarSign className="inline h-4 w-4 mr-1" />
                    Amount (R)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-white/30 bg-white/10 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent text-lg text-white placeholder-white/70"
                    placeholder="Enter amount"
                    required
                  />
                  
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {suggestedAmounts.map((suggestedAmount) => (
                      <Button
                        key={suggestedAmount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(suggestedAmount.toString())}
                        className="border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                      >
                        R{suggestedAmount}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-4 py-3 border border-white/30 bg-white/10 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent text-white"
                  >
                    <option value="once" className="text-foreground bg-background">One-time gift</option>
                    <option value="weekly" className="text-foreground bg-background">Weekly</option>
                    <option value="monthly" className="text-foreground bg-background">Monthly</option>
                    <option value="quarterly" className="text-foreground bg-background">Quarterly</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Additional Message (Optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows="3"
                    className="w-full px-4 py-3 border border-white/30 bg-white/10 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent text-white placeholder-white/70"
                    placeholder="Share your heart with the ministry..."
                  />
                </div>
                
                {amount && (
                  <div className="bg-warning/20 border border-warning/50 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-sm text-white">
                      The biblical tithe is 10% of your income. This is a guideline, but ELOHIYM loves a cheerful giver
                    </p>
                  </div>
                )}
                
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-warning to-harvest hover:from-warning/90 hover:to-harvest/90 text-warning-foreground"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-warning-foreground mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Give Tithe ({frequency})
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {/* Tithing Info */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                The Blessing of Tithing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3 border border-white/10">
                  <Star className="h-5 w-5 text-warning mt-1" />
                  <div>
                    <h4 className="font-semibold text-white">Honoring ELOHIYM</h4>
                    <p className="text-sm text-white/90">Tithing is a way to honor ELOHIYM with our firstfruits and acknowledge His provision</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3 border border-white/10">
                  <Star className="h-5 w-5 text-warning mt-1" />
                  <div>
                    <h4 className="font-semibold text-white">Supporting Ministry</h4>
                    <p className="text-sm text-white/90">Your tithes support YHVH364 GOSATs ministry and help spread ELOHIYM&apos;s word</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3 border border-white/10">
                  <Star className="h-5 w-5 text-warning mt-1" />
                  <div>
                    <h4 className="font-semibold text-white">Receiving Blessing</h4>
                    <p className="text-sm text-white/90">ELOHIYM promises to bless those who faithfully tithe and give generously</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3 border border-white/10">
                  <Star className="h-5 w-5 text-warning mt-1" />
                  <div>
                    <h4 className="font-semibold text-white">Building Faith</h4>
                    <p className="text-sm text-white/90">Tithing helps build our faith and trust in ELOHIYM&apos;s provision</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-warning/10 border border-warning/20 p-4 rounded-lg">
                <h4 className="font-semibold text-warning mb-2">Traditional Tithe Amount</h4>
                <p className="text-sm text-white/80">
                  The biblical tithe is 10% of your income. This is a guideline, but ELOHIYM loves a cheerful giver 
                  regardless of the amount.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Ministry Information */}
        <Card className="bg-card/90 backdrop-blur-sm border-warning/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-warning text-center">
              About YHVH364 GOSATs Ministry
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-foreground mb-6">
              YHVH364 GOSATs ministry is dedicated to spreading ELOHIYM&apos;s word and supporting the community through 
              biblical teachings and practical help. Your tithes help fund ministry activities, community outreach, 
              and the growth of the 364YHVH Community Farm.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-warning/10 border border-warning/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="h-6 w-6 text-warning" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">Biblical Teaching</h4>
                <p className="text-sm text-muted-foreground">Spreading ELOHIYM&apos;s word through teaching and discipleship</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-warning/10 border border-warning/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Heart className="h-6 w-6 text-warning" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">Community Care</h4>
                <p className="text-sm text-muted-foreground">Supporting families and individuals in need</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-warning/10 border border-warning/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Church className="h-6 w-6 text-warning" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">Ministry Growth</h4>
                <p className="text-sm text-muted-foreground">Expanding the reach of ELOHIYM&apos;s love and grace</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  )
}