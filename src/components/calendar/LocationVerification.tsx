import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle2, AlertCircle, Loader2, Globe, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export function LocationVerification() {
  const { location, loading, error, verifyLocation } = useUserLocation();
  const { user } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const [timezone, setTimezone] = useState<string>('');
  const [timezoneVerified, setTimezoneVerified] = useState(false);
  const [showVerificationCard, setShowVerificationCard] = useState(false);

  // Detect and load timezone
  useEffect(() => {
    const detectTimezone = async () => {
      // Get user's timezone from profile
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.timezone) {
          setTimezone(profile.timezone);
          setTimezoneVerified(true);
          return;
        }
      }
      
      // Fallback to browser timezone
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detectedTimezone);
      setTimezoneVerified(false);
    };
    
    detectTimezone();
  }, [user?.id]);

  // Close verification card when verified
  useEffect(() => {
    if (location.verified && timezoneVerified && !loading && showVerificationCard) {
      // Close the card after a short delay to show success
      const timer = setTimeout(() => {
        setShowVerificationCard(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [location.verified, timezoneVerified, loading, showVerificationCard]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await verifyLocation();
      
      // Also save timezone if not already saved
      if (user?.id && !timezoneVerified) {
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await supabase
          .from('profiles')
          .update({ timezone: detectedTimezone })
          .eq('user_id', user.id);
        setTimezone(detectedTimezone);
        setTimezoneVerified(true);
      }
    } finally {
      setVerifying(false);
    }
  };

  const isVerified = location.verified && timezoneVerified && !loading;

  return (
    <>
      {/* Button - Show when card is closed */}
      {!showVerificationCard && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md mx-auto mb-4 relative z-20"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowVerificationCard(true)}
            className="w-full px-6 py-4 rounded-xl shadow-2xl border-2 flex items-center justify-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.95) 0%, rgba(234, 179, 8, 0.95) 100%)',
              borderColor: 'rgba(251, 191, 36, 0.5)',
              boxShadow: '0 0 30px rgba(251, 191, 36, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.2)',
            }}
          >
            <MapPin className="w-5 h-5 text-black" />
            <span className="text-base font-bold text-black tracking-wide">
              Verify your calendar location
            </span>
            {isVerified && (
              <CheckCircle2 className="w-5 h-5 text-black" />
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Full Card - Show when button is clicked */}
      <AnimatePresence>
        {showVerificationCard && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md mx-auto mb-4 relative z-20"
          >
            <div 
              className="rounded-2xl shadow-2xl border-2 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 0, 60, 0.95) 0%, rgba(0, 0, 20, 0.95) 100%)',
                borderColor: 'rgba(251, 191, 36, 0.3)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'rgba(251, 191, 36, 0.2)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-bold bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">
                      Calendar Location
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowVerificationCard(false)}
                    className="text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-amber-200">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading location...
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {location.verified ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <MapPin className="w-5 h-5 text-amber-400" />
                        )}
                        <div className="text-sm">
                          <div className="font-medium text-amber-200">
                            {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
                          </div>
                          <div className="text-xs text-amber-300/70">
                            {location.verified ? 'Verified' : 'Not verified'}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleVerify}
                        disabled={verifying}
                        className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-bold border-2 border-amber-400 shadow-lg"
                      >
                        {verifying ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Verifying...
                          </>
                        ) : location.verified ? (
                          'Re-verify'
                        ) : (
                          'Verify Location'
                        )}
                      </Button>
                    </div>
                    {timezone && (
                      <div className="flex items-center gap-2 text-xs text-amber-300/80 mt-2">
                        <Globe className="w-3 h-3" />
                        <span>Timezone: {timezone}</span>
                        {timezoneVerified && (
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                        )}
                      </div>
                    )}
                    {isVerified && (
                      <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        ✓ Your calendar times are synced to your location's sunrise and timezone
                      </p>
                    )}
                    {!isVerified && (
                      <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Please verify your location to ensure accurate calendar times
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

