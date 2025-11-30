import React, { useState } from 'react';
import { MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useUserLocation } from '@/hooks/useUserLocation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LocationVerification() {
  const { location, loading, error, verifyLocation } = useUserLocation();
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await verifyLocation();
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
            {location.verified && (
              <p className="text-xs text-green-600">
                ✓ Your calendar times are synced to your location's sunrise
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

