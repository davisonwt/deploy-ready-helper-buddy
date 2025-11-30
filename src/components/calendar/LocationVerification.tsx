import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle2, AlertCircle, Loader2, Globe } from 'lucide-react';
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

  return (
    <Card className="w-full max-w-md mx-auto mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4" />
          Calendar Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading location...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {location.verified ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <MapPin className="w-4 h-4 text-gray-400" />
                )}
                <div className="text-sm">
                  <div className="font-medium">
                    {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
                  </div>
                  <div className="text-xs text-gray-500">
                    {location.verified ? 'Verified' : 'Not verified'}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant={location.verified ? "outline" : "default"}
                onClick={handleVerify}
                disabled={verifying}
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
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                <Globe className="w-3 h-3" />
                <span>Timezone: {timezone}</span>
                {timezoneVerified && (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                )}
              </div>
            )}
            {location.verified && timezoneVerified && (
              <p className="text-xs text-green-600 mt-2">
                ✓ Your calendar times are synced to your location's sunrise and timezone
              </p>
            )}
            {(!location.verified || !timezoneVerified) && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠ Please verify your location to ensure accurate calendar times
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

