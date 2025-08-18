import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { loadOrchard } from "../lib/orchardLoader";

// 🛠️ BULLETPROOF BESTOW BUTTON COMPONENT
export default function BestowButton({ 
  orchardId, 
  orchardTitle, 
  className = "", 
  children = "Bestow Support",
  variant = "primary",
  onClick // Accept onClick prop but don't rely on it
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle, loading, error, success

  const handleClick = async (e) => {
    // Prevent default if it's a form submit or link
    e?.preventDefault();
    
    if (!orchardId) {
      console.error('💥 BestowButton: Missing orchardId');
      alert('Invalid orchard. Please refresh the page.');
      return;
    }

    setStatus('loading');

    try {
      console.log(`🌱 BestowButton: Loading orchard ${orchardId}`);

      // 🛠️ USE BULLETPROOF LOADER
      const orchard = await loadOrchard(orchardId);
      
      if (orchard._isFallback || orchard.status === 'unavailable') {
        console.warn(`⚠️ Orchard ${orchardId} is unavailable:`, orchard._error);
        setStatus('error');
        
        // Navigate to error page with orchard data
        navigate(`/orchard-error/${orchardId}`, {
          state: { 
            orchard,
            error: orchard._error,
            source: 'bestow-button'
          }
        });
        return;
      }

      console.log(`✅ BestowButton: Orchard loaded successfully`);
      setStatus('success');

      // 🛠️ NAVIGATE WITH PRELOADED DATA
      navigate(`/animated-orchard/${orchardId}`, {
        state: { 
          preloadedOrchard: orchard,
          source: 'bestow-button',
          timestamp: Date.now()
        }
      });

      // Call provided onClick if available (for additional handling)
      if (onClick) {
        onClick(orchardId);
      }

    } catch (error) {
      console.error(`💥 BestowButton: Failed to load ${orchardId}:`, error);
      setStatus('error');

      // 🛠️ NUCLEAR FALLBACK - HARD NAVIGATION
      console.log('🚨 BestowButton: Using nuclear fallback');
      setTimeout(() => {
        window.location.href = `/animated-orchard/${orchardId}?force=true&source=bestow-fallback&error=${encodeURIComponent(error.message)}`;
      }, 1000);
    }
  };

  const getButtonClass = () => {
    const baseClass = "inline-flex items-center justify-center transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed rounded-md px-4 py-2";
    
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg",
      secondary: "bg-background border border-primary text-primary hover:bg-accent",
      error: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
      success: "bg-success hover:bg-success/90 text-success-foreground"
    };

    const currentVariant = status === 'error' ? 'error' : 
                          status === 'success' ? 'success' : 
                          variant;
    
    return `${baseClass} ${variants[currentVariant]} ${className}`;
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'error':
        return <RefreshCw className="h-4 w-4" />;
      case 'success':
        return <Heart className="h-4 w-4 text-success-foreground/80" />;
      default:
        return <Heart className="h-4 w-4" />;
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'loading':
        return "Loading...";
      case 'error':
        return "Retry";
      case 'success':
        return "Success!";
      default:
        return children;
    }
  };

  const getAriaLabel = () => {
    switch (status) {
      case 'loading':
        return `Loading orchard ${orchardTitle || orchardId}`;
      case 'error':
        return `Retry loading orchard ${orchardTitle || orchardId}`;
      case 'success':
        return `Successfully loaded orchard ${orchardTitle || orchardId}`;
      default:
        return `Bestow support to ${orchardTitle || 'orchard'}`;
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      className={getButtonClass()}
      title={orchardTitle ? `Bestow support to ${orchardTitle}` : 'Bestow support'}
      aria-label={getAriaLabel()}
      data-orchard-id={orchardId}
      data-status={status}
    >
      {getIcon()}
      <span className="ml-2">{getButtonText()}</span>
      
      {/* Loading indicator */}
      {status === 'loading' && (
        <div className="absolute inset-0 bg-foreground/10 rounded-md animate-pulse" />
      )}
    </button>
  );
}