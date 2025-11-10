import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { 
  CheckCircle, 
  Sprout, 
  Heart, 
  Eye, 
  Share2,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Star,
  Gift,
  Users,
  TrendingUp,
  Crown,
  Zap
} from "lucide-react"
import { fetchOrchard } from "../api/orchards"

export default function OrchardCreatedPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [orchard, setOrchard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  const orchardId = searchParams.get('id')
  const success = searchParams.get('success')

  useEffect(() => {
    setMounted(true)
    // Start celebration animation
    setTimeout(() => setCelebrating(true), 500)
  }, [])

  useEffect(() => {
    console.log("🎉 OrchardCreatedPage loaded", { orchardId, success });
    
    if (!orchardId || !success) {
      console.error("💥 Missing orchard ID or success flag");
      navigate("/my-orchards");
      return;
    }

    // Fetch orchard data directly from API
    const loadOrchardData = async () => {
      try {
        console.log("📡 Fetching orchard from API:", orchardId);
        const orchardData = await fetchOrchard(orchardId);
        console.log("✅ Orchard fetched successfully");
        setOrchard(orchardData);
      } catch (error) {
        console.error("💥 Error fetching orchard:", error);
        navigate("/browse-orchards");
      } finally {
        setLoading(false);
      }
    };

    loadOrchardData();
  }, [orchardId, success, navigate])

  const handleViewOrchard = () => {
    console.log("🔍 Navigating to view orchard");
    navigate(`/orchards/${orchard.id}`);
  }

  const handleViewMyOrchards = () => {
    console.log("🌱 Navigating to my orchards");
    window.location.href = "/my-orchards";
  }

  const handleShareOrchard = () => {
    const url = `${window.location.origin}/animated-orchard/${orchard.id}`;
    navigator.clipboard.writeText(url);
    // More elegant notification
    const originalText = event.target.textContent;
    event.target.textContent = "Copied! ✨";
    setTimeout(() => {
      event.target.textContent = originalText;
    }, 2000);
  }

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-amber-50">
        {/* Enhanced animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "4s" }}></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-amber-200/30 to-yellow-200/30 rounded-full animate-bounce shadow-lg" style={{ animationDuration: "3s", animationDelay: "1s" }}></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-br from-green-300/20 to-teal-300/20 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "5s", animationDelay: "2s" }}></div>
        </div>
        
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground animate-pulse">Loading your beautiful orchard...</p>
        </div>
      </div>
    );
  }

  if (!orchard) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50">
        <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm border-destructive/20 shadow-2xl animate-fade-in">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-destructive mb-2">Orchard Not Found</h2>
            <p className="text-muted-foreground mb-6">Unable to load your orchard details.</p>
            <Button onClick={handleViewMyOrchards} className="bg-primary hover:bg-primary/90">
              <Sprout className="h-4 w-4 mr-2" />
              Go to My Orchards
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#001f3f' }}>

      {/* Enhanced floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-5">
        {celebrating && (
          <>
            <div className="absolute top-20 left-10 w-6 h-6 bg-yellow-400 rounded-full animate-bounce opacity-80" style={{ animationDelay: "0.1s", animationDuration: "2s" }}></div>
            <div className="absolute top-32 right-20 w-4 h-4 bg-green-400 rounded-full animate-bounce opacity-80" style={{ animationDelay: "0.3s", animationDuration: "2.5s" }}></div>
            <div className="absolute bottom-40 left-1/4 w-5 h-5 bg-blue-400 rounded-full animate-bounce opacity-80" style={{ animationDelay: "0.5s", animationDuration: "3s" }}></div>
            <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-purple-400 rounded-full animate-bounce opacity-80" style={{ animationDelay: "0.7s", animationDuration: "2.2s" }}></div>
            <Star className="absolute top-16 right-32 h-6 w-6 text-yellow-400 animate-pulse opacity-80" style={{ animationDelay: "1s" }} />
            <Sparkles className="absolute bottom-20 right-16 h-5 w-5 text-green-400 animate-pulse opacity-80" style={{ animationDelay: "1.2s" }} />
            <Heart className="absolute top-2/3 left-16 h-4 w-4 text-red-400 animate-pulse opacity-80" style={{ animationDelay: "1.4s" }} />
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className={`w-full max-w-3xl bg-card/95 backdrop-blur-md border-border/50 shadow-2xl transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
          <CardHeader className="text-center pb-6 relative overflow-hidden">
            {/* Success icon with enhanced animation */}
            <div className="flex justify-center mb-6 relative">
              <div className={`w-24 h-24 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center shadow-xl relative transition-all duration-1000 ${celebrating ? 'scale-110' : 'scale-100'}`}>
                <CheckCircle className="h-12 w-12 text-success-foreground animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full opacity-0 animate-pulse" style={{ animationDelay: "0.5s" }}></div>
                {celebrating && (
                  <>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping"></div>
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-green-400 rounded-full animate-ping" style={{ animationDelay: "0.5s" }}></div>
                  </>
                )}
              </div>
            </div>
            
            <CardTitle className="text-3xl font-bold text-foreground mb-3" style={{ fontFamily: "Playfair Display, serif" }}>
              <span className="bg-gradient-to-r from-success via-primary to-success bg-clip-text text-transparent">
                🌱 Orchard Successfully Planted!
              </span>
            </CardTitle>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Your seed has taken root in the sacred soil of the 364yhvh Community Farm
            </p>
            
            {/* Decorative elements */}
            <div className="flex justify-center space-x-3 mt-4">
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                <Crown className="h-3 w-3 mr-1" />
                Grower Status
              </Badge>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Sparkles className="h-3 w-3 mr-1" />
                Community Blessed
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-8 px-8 pb-8">
            {/* Enhanced Orchard Details */}
            <div className="bg-gradient-to-br from-success/5 via-success/10 to-success/5 p-6 rounded-2xl border border-success/20 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-foreground flex items-center">
                  <Sprout className="h-5 w-5 mr-2 text-success" />
                  Your Beautiful Orchard
                </h3>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 mr-1 text-yellow-500" />
                  Live & Growing
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg">
                    <span className="text-muted-foreground font-medium">Title:</span>
                    <span className="font-semibold text-foreground text-right">{orchard.title}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg">
                    <span className="text-muted-foreground font-medium">Category:</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {orchard.category}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg">
                    <span className="text-muted-foreground font-medium">Seed Value:</span>
                    <span className="font-bold text-success text-lg">
                      {orchard.currency} {orchard.seed_value?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg">
                    <span className="text-muted-foreground font-medium">Total Pockets:</span>
                    <span className="font-semibold text-foreground">{(orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg">
                    <span className="text-muted-foreground font-medium">Pocket Price:</span>
                    <span className="font-semibold text-foreground">
                      {orchard.currency} {orchard.pocket_price?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg">
                    <span className="text-muted-foreground font-medium">Status:</span>
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                      ✨ Active & Flourishing
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Next Steps */}
            <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 p-6 rounded-2xl border border-primary/20 shadow-inner">
              <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <Gift className="h-5 w-5 mr-2 text-primary" />
                Your Orchard Journey Begins
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center p-4 bg-card/30 rounded-xl">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Live in Community</h4>
                  <p className="text-sm text-muted-foreground">Your orchard is now visible to all community members</p>
                </div>
                
                <div className="flex flex-col items-center text-center p-4 bg-card/30 rounded-xl">
                  <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-secondary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Bestower Support</h4>
                  <p className="text-sm text-muted-foreground">Community members can now rain blessings on your orchard</p>
                </div>
                
                <div className="flex flex-col items-center text-center p-4 bg-card/30 rounded-xl">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-3">
                    <Heart className="h-6 w-6 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Growth Notifications</h4>
                  <p className="text-sm text-muted-foreground">Receive updates when your orchard receives support</p>
                </div>
              </div>
            </div>

            {/* Enhanced Actions */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={handleViewOrchard}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 py-6"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  <span className="font-semibold">Experience Your Orchard</span>
                </Button>
                
                <Button 
                  onClick={handleShareOrchard}
                  variant="outline"
                  size="lg"
                  className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 py-6"
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  <span className="font-semibold">Share with Community</span>
                </Button>
              </div>

              <div className="text-center">
                <Button 
                  onClick={handleViewMyOrchards}
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300 hover:scale-105"
                >
                  <Sprout className="h-4 w-4 mr-2" />
                  View All My Orchards
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Inspirational Quote */}
            <div className="text-center py-6 border-t border-border/50">
              <blockquote className="text-lg font-medium text-foreground mb-2 italic" style={{ fontFamily: "Playfair Display, serif" }}>
                "From small seeds grow mighty trees, and from generous hearts flow endless blessings."
              </blockquote>
              <cite className="text-sm text-muted-foreground">— 364yhvh Community Wisdom</cite>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}