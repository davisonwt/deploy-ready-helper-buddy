import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  Sprout, 
  Heart, 
  Users, 
  Star, 
  ArrowRight, 
  Gift,
  TrendingUp,
  Shield,
  Sparkles,
  Crown,
  Zap,
  TreePine
} from "lucide-react";

const Index = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Video */}
      <div className="fixed inset-0 w-full h-full z-0">
        <video 
          autoPlay 
          muted 
          loop 
          className="w-full h-full object-cover"
        >
          <source src="/farm community background.mp4" type="video/mp4" />
          <div className="w-full h-full bg-gradient-to-br from-success/20 via-background to-harvest/20"></div>
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/30"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-success/20 to-success/10 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "4s" }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-harvest/20 to-harvest/10 rounded-full animate-bounce shadow-lg" style={{ animationDuration: "3s", animationDelay: "1s" }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-br from-warning/15 to-warning/5 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "5s", animationDelay: "2s" }}></div>
      </div>

      {/* Content */}
      <div className={`relative z-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Navigation */}
        <nav className="bg-card/80 backdrop-blur-sm border-b border-border/50 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center">
                  <Sprout className="h-6 w-6 text-success-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "Playfair Display, serif" }}>
                    sow2grow
                  </h1>
                  <p className="text-xs text-muted-foreground">364yhvh Community Farm</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="border-success/30 text-success hover:bg-success/5">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground">
                    Join Farm
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="bg-card/90 backdrop-blur-sm rounded-3xl p-12 mx-auto max-w-4xl border border-border/50 shadow-2xl">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-success to-harvest rounded-full flex items-center justify-center shadow-xl">
                    <Heart className="h-10 w-10 text-success-foreground animate-pulse" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-warning rounded-full flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-warning-foreground" />
                  </div>
                </div>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6" style={{ fontFamily: "Playfair Display, serif" }}>
                Plant Seeds of{" "}
                <span className="bg-gradient-to-r from-success to-harvest bg-clip-text text-transparent">
                  Blessing
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                Join the 364yhvh Community Farm where we sow seeds of hope, grow orchards of dreams, 
                and harvest blessings together. Your support can transform lives through faithful giving.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link to="/register">
                  <Button size="lg" className="bg-gradient-to-r from-success to-harvest hover:from-success/90 hover:to-harvest/90 text-success-foreground shadow-lg hover:shadow-xl transition-all duration-300">
                    <Sprout className="h-5 w-5 mr-2" />
                    Start Your Journey
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/browse-orchards">
                  <Button variant="outline" size="lg" className="border-success/30 text-success hover:bg-success/5">
                    <TreePine className="h-5 w-5 mr-2" />
                    Explore Orchards
                  </Button>
                </Link>
              </div>
              
              <div className="flex flex-wrap justify-center gap-3">
                <Badge className="bg-success/10 text-success border-success/20">
                  <Shield className="h-3 w-3 mr-1" />
                  Faithful Community
                </Badge>
                <Badge className="bg-warning/10 text-warning border-warning/20">
                  <Crown className="h-3 w-3 mr-1" />
                  Biblical Principles
                </Badge>
                <Badge className="bg-harvest/10 text-harvest border-harvest/20">
                  <Zap className="h-3 w-3 mr-1" />
                  Life Transformation
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "Playfair Display, serif" }}>
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Simple steps to join our community and start making a difference
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-card/90 backdrop-blur-sm border-success/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sprout className="h-8 w-8 text-success" />
                  </div>
                  <CardTitle className="text-success">Plant Your Seed</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Create your orchard and share your vision with our faithful community. 
                    Every dream starts with a single seed.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-card/90 backdrop-blur-sm border-warning/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-warning" />
                  </div>
                  <CardTitle className="text-warning">Grow Together</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Support each other through bestowals and faithful giving. 
                    Watch as your community grows stronger together.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-card/90 backdrop-blur-sm border-harvest/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-harvest/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gift className="h-8 w-8 text-harvest" />
                  </div>
                  <CardTitle className="text-harvest">Harvest Blessings</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Experience the joy of giving and receiving as ELOHIYM blesses 
                    your faithful stewardship and generosity.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <Card className="bg-gradient-to-r from-success/5 via-card to-harvest/5 backdrop-blur-sm border-success/20 shadow-2xl">
              <CardContent className="p-12">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-foreground mb-4" style={{ fontFamily: "Playfair Display, serif" }}>
                    Community Impact
                  </h3>
                  <p className="text-muted-foreground">See how we&apos;re growing together in faith and blessing</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-success mb-2">500+</div>
                    <div className="text-muted-foreground">Faithful Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-warning mb-2">150+</div>
                    <div className="text-muted-foreground">Active Orchards</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-harvest mb-2">R2.5M+</div>
                    <div className="text-muted-foreground">Bestowed Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-info mb-2">95%</div>
                    <div className="text-muted-foreground">Success Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="bg-gradient-to-br from-success/10 via-card to-harvest/10 backdrop-blur-sm rounded-3xl p-12 mx-auto max-w-4xl border border-success/20 shadow-2xl">
              <h2 className="text-4xl font-bold text-foreground mb-6" style={{ fontFamily: "Playfair Display, serif" }}>
                Ready to Join Our Community?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                &quot;Give, and it will be given to you...&quot; - Luke 6:38
              </p>
              <Link to="/register">
                <Button size="lg" className="bg-gradient-to-r from-success to-harvest hover:from-success/90 hover:to-harvest/90 text-success-foreground shadow-lg hover:shadow-xl transition-all duration-300 text-lg px-8 py-4">
                  <Heart className="h-6 w-6 mr-3" />
                  Join the 364yhvh Community Farm
                  <Sparkles className="h-6 w-6 ml-3" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-card/90 backdrop-blur-sm border-t border-border/50">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="flex justify-center items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center">
                  <Sprout className="h-4 w-4 text-success-foreground" />
                </div>
                <span className="text-lg font-semibold text-foreground">sow2grow</span>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                364yhvh Community Farm - Planting seeds of blessing, growing orchards of hope
              </p>
              <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
                <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
                <Link to="/register" className="hover:text-foreground transition-colors">Join Farm</Link>
                <Link to="/browse-orchards" className="hover:text-foreground transition-colors">Browse Orchards</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;