import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  ArrowLeft, 
  Sprout, 
  MapPin, 
  Calendar, 
  Users, 
  Eye, 
  Heart, 
  Star,
  Target,
  Clock,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Gift,
  Share2,
  Bookmark
} from "lucide-react";
import BestowalUI from '../components/BestowalUI';
import { fetchOrchard } from '../api/orchards';

const OrchardPage = () => {
  const { orchardId } = useParams();
  const navigate = useNavigate();
  const [orchard, setOrchard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadOrchard = async () => {
      try {
        const data = await fetchOrchard(orchardId);
        setOrchard(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadOrchard();
  }, [orchardId]);

  const handleBestow = async (amount, currency) => {
    // Your bestowal logic here
    console.log(`Bestowing ${amount} ${currency} upon orchard ${orchard.title}`);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/orchard/${orchardId}`;
    navigator.clipboard.writeText(url);
    // Could add a toast notification here
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-success/10 text-success border-success/20";
      case "completed": return "bg-primary/10 text-primary border-primary/20";
      case "paused": return "bg-warning/10 text-warning border-warning/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCompletionColor = (rate) => {
    if (rate >= 80) return "bg-success";
    if (rate >= 60) return "bg-warning";
    if (rate >= 40) return "bg-destructive/60";
    return "bg-destructive";
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-green-50 via-white to-amber-50">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "4s" }}></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-amber-200/30 to-yellow-200/30 rounded-full animate-bounce shadow-lg" style={{ animationDuration: "3s", animationDelay: "1s" }}></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading Orchard</h2>
            <p className="text-muted-foreground">Preparing your garden view...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm border-destructive/20 shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-destructive mb-2">Orchard Unavailable</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <div className="space-y-3">
                <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Farm
                </Button>
                <Link to="/browse-orchards">
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    <Sprout className="h-4 w-4 mr-2" />
                    Browse Other Orchards
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Enhanced Background Video */}
      <div className="fixed inset-0 w-full h-full z-0">
        <video 
          autoPlay 
          muted 
          loop 
          className="w-full h-full object-cover"
        >
          <source src="/orchards main mp4.mp4" type="video/mp4" />
          <div className="w-full h-full bg-gradient-to-br from-green-100 to-amber-100"></div>
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/10"></div>
      </div>

      {/* Enhanced floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-green-200/20 to-emerald-200/20 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "6s" }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-amber-200/20 to-yellow-200/20 rounded-full animate-bounce shadow-lg" style={{ animationDuration: "4s", animationDelay: "1s" }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-br from-green-300/15 to-teal-300/15 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "8s", animationDelay: "2s" }}></div>
      </div>

      {/* Content */}
      <div className={`relative z-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Navigation Header */}
        <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button 
                onClick={() => navigate(-1)}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Farm
              </Button>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  size="sm"
                  className="border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Orchard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-secondary/30 text-secondary hover:bg-secondary/5"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Orchard Header */}
          <Card className="bg-card/95 backdrop-blur-sm border-border/50 shadow-2xl overflow-hidden">
            <div className="relative">
              {/* Orchard Images */}
              {orchard.images && orchard.images.length > 0 && (
                <div className="relative h-64 md:h-80 overflow-hidden">
                  <img
                    src={orchard.images[0]}
                    alt={orchard.title}
                    className={`w-full h-full object-cover transition-all duration-1000 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}
                    onLoad={() => setImageLoaded(true)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  
                  {/* Floating Status Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge className={getStatusColor(orchard.status)}>
                      <Sprout className="h-3 w-3 mr-1" />
                      {orchard.status?.charAt(0).toUpperCase() + orchard.status?.slice(1)}
                    </Badge>
                  </div>
                  
                  {/* Image Counter */}
                  {orchard.images.length > 1 && (
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary" className="bg-black/20 text-white border-white/20">
                        1 / {orchard.images.length}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
              
              <CardHeader className="relative">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-3xl md:text-4xl font-bold text-foreground mb-3" style={{ fontFamily: "Playfair Display, serif" }}>
                      {orchard.title}
                    </CardTitle>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                      {orchard.description}
                    </p>
                    
                    {/* Orchard Meta Information */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {orchard.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{orchard.location}</span>
                        </div>
                      )}
                      {orchard.created_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Planted {new Date(orchard.created_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{orchard.supporters || 0} supporters</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{orchard.views || 0} views</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 min-w-[240px]">
                    <div className="text-center mb-3">
                      <div className="text-2xl font-bold text-primary">
                        {orchard.currency} {orchard.filled_pockets * orchard.pocket_price || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        of {orchard.currency} {orchard.seed_value} raised
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{Math.round((orchard.filled_pockets / orchard.total_pockets) * 100) || 0}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-1000 ${getCompletionColor((orchard.filled_pockets / orchard.total_pockets) * 100)}`}
                          style={{ width: `${Math.min((orchard.filled_pockets / orchard.total_pockets) * 100, 100) || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground text-center">
                      {orchard.filled_pockets || 0} / {orchard.total_pockets} pockets filled
                    </div>
                  </div>
                </div>
              </CardHeader>
            </div>
          </Card>

          {/* Orchard Details & Bestowal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Orchard Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Why This Orchard */}
              {orchard.why_needed && (
                <Card className="bg-card/95 backdrop-blur-sm border-border/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Heart className="h-5 w-5 text-destructive" />
                      Why This Orchard Matters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{orchard.why_needed}</p>
                  </CardContent>
                </Card>
              )}
              
              {/* How It Helps */}
              {orchard.how_it_helps && (
                <Card className="bg-card/95 backdrop-blur-sm border-border/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <TrendingUp className="h-5 w-5 text-success" />
                      How Your Support Helps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{orchard.how_it_helps}</p>
                  </CardContent>
                </Card>
              )}
              
              {/* Community Impact */}
              {orchard.community_impact && (
                <Card className="bg-card/95 backdrop-blur-sm border-border/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Users className="h-5 w-5 text-primary" />
                      Community Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{orchard.community_impact}</p>
                  </CardContent>
                </Card>
              )}
              
              {/* Timeline */}
              {orchard.expected_completion && (
                <Card className="bg-card/95 backdrop-blur-sm border-border/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Clock className="h-5 w-5 text-warning" />
                      Expected Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{orchard.expected_completion}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Bestowal Panel */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <Card className="bg-gradient-to-br from-primary/5 via-card to-secondary/5 backdrop-blur-sm border-primary/20 shadow-xl">
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2 text-foreground">
                      <Gift className="h-5 w-5 text-primary" />
                      Make It Rain
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Support this orchard with your bestowal</p>
                  </CardHeader>
                  <CardContent>
                    <BestowalUI 
                      orchard={orchard}
                      onBestow={handleBestow}
                    />
                  </CardContent>
                </Card>
                
                {/* Grower Info */}
                <Card className="mt-6 bg-card/95 backdrop-blur-sm border-border/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                      <Sprout className="h-5 w-5 text-success" />
                      About the Grower
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="font-semibold text-foreground mb-2">Community Member</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Part of the 364yhvh Community Farm
                      </p>
                      <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                        <Star className="h-3 w-3 mr-1" />
                        Verified Grower
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrchardPage;