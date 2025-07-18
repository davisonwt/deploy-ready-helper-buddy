import React, { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Search, 
  Clock,
  Database,
  Wifi,
  Settings,
  Sprout,
  Heart,
  ArrowLeft,
  Zap,
  Shield,
  Loader2,
  TreePine
} from "lucide-react";
import { loadOrchard, clearOrchardCache } from "../lib/orchardLoader";

export default function OrchardErrorPage() {
  const { orchardId } = useParams();
  const location = useLocation();
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  // Get error info from navigation state
  const initialError = location.state?.error;
  const orchardData = location.state?.orchard;
  const source = location.state?.source;

  useEffect(() => {
    setMounted(true);
    // Collect debug information
    setDebugInfo({
      orchardId,
      initialError,
      source,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      cacheStats: window.__orchardLoader?.stats(),
      localStorageSize: localStorage.length
    });
  }, [orchardId, initialError, source]);

  const handleRetry = async () => {
    setLoading(true);
    setRetryCount(c => c + 1);
    
    try {
      console.log(`🔄 Retry attempt ${retryCount + 1} for orchard ${orchardId}`);
      
      // Clear cache before retry
      clearOrchardCache(orchardId);
      
      // Try to load orchard again
      const orchard = await loadOrchard(orchardId);
      
      if (!orchard._isFallback && orchard.status !== 'unavailable') {
        console.log('✅ Retry successful, redirecting...');
        window.location.href = `/orchards/${orchardId}?retry=${retryCount + 1}&success=true`;
      } else {
        console.warn('⚠️ Retry failed, still getting fallback data');
        setLoading(false);
      }
    } catch (error) {
      console.error('💥 Retry failed:', error);
      setLoading(false);
    }
  };

  const handleClearCacheAndRetry = () => {
    console.log('🗑️ Clearing all orchard cache');
    clearOrchardCache(); // Clear all cache
    localStorage.removeItem('orchardCache');
    sessionStorage.clear();
    handleRetry();
  };

  const handleForceNavigation = () => {
    console.log('🚨 Force navigation activated');
    window.location.href = `/orchards/${orchardId}?force=true&cache_cleared=true&timestamp=${Date.now()}`;
  };

  const getErrorType = () => {
    if (initialError?.includes('404')) return 'NOT_FOUND';
    if (initialError?.includes('500')) return 'SERVER_ERROR';
    if (initialError?.includes('timeout')) return 'TIMEOUT';
    if (initialError?.includes('network')) return 'NETWORK';
    return 'UNKNOWN';
  };

  const getErrorMessage = () => {
    switch (getErrorType()) {
      case 'NOT_FOUND':
        return 'This orchard seems to have been moved or is taking a seasonal rest. The seed may have been relocated within our community farm.';
      case 'SERVER_ERROR':
        return 'Our farm servers are experiencing some growing pains. The harvest systems are being tended to by our gardeners.';
      case 'TIMEOUT':
        return 'The orchard connection is taking longer than usual to grow. Please water your connection and try again.';
      case 'NETWORK':
        return 'Unable to reach the community farm. Please check that your digital soil is properly connected.';
      default:
        return 'An unexpected storm has passed through this orchard. Our farm hands are working to clear the path.';
    }
  };

  const getRetryStrategy = () => {
    if (retryCount === 0) return 'Gentle replanting';
    if (retryCount === 1) return 'Deep soil refresh';
    if (retryCount === 2) return 'Force cultivation';
    return 'Master gardener assist';
  };

  const getErrorIcon = () => {
    switch (getErrorType()) {
      case 'NOT_FOUND': return TreePine;
      case 'SERVER_ERROR': return Settings;
      case 'TIMEOUT': return Clock;
      case 'NETWORK': return Wifi;
      default: return AlertTriangle;
    }
  };

  const ErrorIcon = getErrorIcon();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Enhanced Background Video */}
      <div className="fixed inset-0 w-full h-full z-0">
        <video 
          autoPlay 
          muted 
          loop 
          className="w-full h-full object-cover opacity-30"
        >
          <source src="/orchards main mp4.mp4" type="video/mp4" />
          <div className="w-full h-full bg-gradient-to-br from-red-50 via-orange-50 to-amber-50"></div>
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-red-100/80 via-orange-50/60 to-amber-100/80"></div>
      </div>

      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-red-200/30 to-orange-200/30 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "4s" }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-amber-200/30 to-yellow-200/30 rounded-full animate-bounce shadow-lg" style={{ animationDuration: "3s", animationDelay: "1s" }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-br from-orange-300/20 to-red-300/20 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "5s", animationDelay: "2s" }}></div>
      </div>
      
      <div className={`relative z-10 container mx-auto px-4 py-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Back Navigation */}
        <div className="mb-6">
          <Link 
            to="/browse-orchards" 
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 font-medium group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Community Orchards
          </Link>
        </div>

        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-destructive/10 to-destructive/20 rounded-full flex items-center justify-center mb-6 shadow-xl">
            <ErrorIcon className="h-12 w-12 text-destructive animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3" style={{ fontFamily: "Playfair Display, serif" }}>
            Orchard Temporarily Unavailable
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            We're experiencing some difficulty reaching orchard <Badge variant="secondary" className="mx-1">{orchardId}</Badge> in our community farm
          </p>
          
          {/* Status Badge */}
          <div className="flex justify-center mt-4">
            <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
              <Shield className="h-3 w-3 mr-1" />
              Farm Systems Alert
            </Badge>
          </div>
        </div>

        {/* Enhanced Error Details */}
        <Card className="max-w-3xl mx-auto mb-8 border-destructive/20 bg-card/95 backdrop-blur-sm shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-foreground">
              <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
                <ErrorIcon className="h-5 w-5 text-destructive" />
              </div>
              What's Happening in the Orchard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-br from-destructive/5 to-destructive/10 p-6 rounded-xl border border-destructive/20">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Heart className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-foreground font-medium mb-2">
                    <strong>Issue Type:</strong> {getErrorType().replace('_', ' ')}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {getErrorMessage()}
                  </p>
                </div>
              </div>
            </div>
            
            {initialError && (
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <p className="text-foreground font-medium mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Technical Garden Notes:
                </p>
                <code className="text-xs text-muted-foreground bg-muted p-3 rounded-lg block break-all">
                  {initialError}
                </code>
              </div>
            )}
            
            {orchardData && (
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                <p className="text-foreground font-medium mb-3 flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-primary" />
                  Cached Orchard Information:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-card/50 p-3 rounded-lg">
                    <span className="text-muted-foreground">Title:</span>
                    <p className="font-medium text-foreground">{orchardData.title}</p>
                  </div>
                  <div className="bg-card/50 p-3 rounded-lg">
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium text-foreground">{orchardData.status}</p>
                  </div>
                  <div className="bg-card/50 p-3 rounded-lg">
                    <span className="text-muted-foreground">Last Seen:</span>
                    <p className="font-medium text-foreground">{orchardData._lastSeen}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Action Buttons */}
        <Card className="max-w-3xl mx-auto mb-8 bg-card/95 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-foreground">
              <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                <Zap className="h-5 w-5 text-success" />
              </div>
              Recovery Options
            </CardTitle>
            <p className="text-muted-foreground">Choose how you'd like to tend to this orchard</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Actions */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  Gentle Cultivation
                </h4>
                
                <Button
                  onClick={handleRetry}
                  disabled={loading}
                  size="lg"
                  className="w-full bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success text-success-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Nurturing Growth...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Try Again ({getRetryStrategy()})
                    </>
                  )}
                </Button>
                
                <Link to="/browse-orchards" className="block">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="w-full border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <Search className="h-5 w-5 mr-2" />
                    Explore Other Orchards
                  </Button>
                </Link>
              </div>

              {/* Advanced Actions */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Settings className="h-4 w-4 text-secondary" />
                  Advanced Garden Care
                </h4>
                
                {retryCount > 1 && (
                  <Button
                    onClick={handleClearCacheAndRetry}
                    variant="outline"
                    size="lg"
                    className="w-full border-warning/30 text-warning hover:bg-warning/5 hover:border-warning/50 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <Database className="h-5 w-5 mr-2" />
                    Clear Soil Cache & Replant
                  </Button>
                )}
                
                {retryCount > 2 && (
                  <Button
                    onClick={handleForceNavigation}
                    variant="outline"
                    size="lg"
                    className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:border-destructive/50 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <Wifi className="h-5 w-5 mr-2" />
                    Force Cultivation Path
                  </Button>
                )}
                
                <Link to="/" className="block">
                  <Button 
                    variant="ghost" 
                    size="lg"
                    className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300 hover:scale-105"
                  >
                    <Home className="h-5 w-5 mr-2" />
                    Return to Farm Home
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Retry Counter */}
            {retryCount > 0 && (
              <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Cultivation attempts: <strong className="text-foreground">{retryCount}</strong></span>
                  </div>
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    {retryCount > 2 ? 'Advanced Care Mode' : 'Standard Care'}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Debug Information */}
        {retryCount > 2 && debugInfo && (
          <Card className="max-w-3xl mx-auto border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Garden Master's Technical Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors font-medium py-2">
                  🔍 Show Advanced Cultivation Details
                </summary>
                <div className="mt-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                  <pre className="text-xs overflow-auto text-muted-foreground leading-relaxed">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              </details>
            </CardContent>
          </Card>
        )}

        {/* Inspirational Footer */}
        <div className="text-center mt-12 max-w-2xl mx-auto">
          <blockquote className="text-lg font-medium text-foreground mb-3 italic" style={{ fontFamily: "Playfair Display, serif" }}>
            "Even in the strongest storms, the deepest roots find their way to water."
          </blockquote>
          <cite className="text-sm text-muted-foreground">— 364yhvh Community Wisdom</cite>
          
          <div className="mt-6 flex justify-center space-x-4">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Heart className="h-3 w-3 mr-1" />
              Community Support
            </Badge>
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
              <Shield className="h-3 w-3 mr-1" />
              Farm Protected
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}