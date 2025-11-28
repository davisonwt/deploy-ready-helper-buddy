import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, BarChart3, MapPin, Sparkles } from 'lucide-react';
import { analytics } from '@/lib/analytics/sow2grow';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsConsentScreenProps {
  onComplete: () => void;
}

export function AnalyticsConsentScreen({ onComplete }: AnalyticsConsentScreenProps) {
  const { user } = useAuth();
  const [analyticsConsent, setAnalyticsConsent] = useState(true); // Required, default true
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [locationConsent, setLocationConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const consent = {
        analytics: analyticsConsent,
        marketingAttribution: marketingConsent,
        preciseLocation: locationConsent,
      };

      // Save to Supabase (user_consent table not yet created - storing locally for now)
      if (user?.id) {
        // TODO: Uncomment when user_consent table is created via migration
        // const { error } = await supabase
        //   .from('user_consent')
        //   .upsert({
        //     user_id: user.id,
        //     analytics: analyticsConsent,
        //     marketing_attribution: marketingConsent,
        //     precise_location: locationConsent,
        //     updated_at: new Date().toISOString(),
        //   }, {
        //     onConflict: 'user_id'
        //   });
        // if (error) throw error;
        console.log('Consent saved locally (user_consent table not yet created)');
      }

      // Save to localStorage and SDK
      analytics.setConsent(consent);
      if (user?.id) {
        analytics.setUserId(user.id);
      }

      // Track consent event
      analytics.track('consent_granted', {
        analytics: analyticsConsent,
        marketingAttribution: marketingConsent,
        preciseLocation: locationConsent,
      });

      onComplete();
    } catch (error) {
      console.error('Failed to save consent:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-yellow-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-amber-500/20 rounded-full">
              <Shield className="h-12 w-12 text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-white mb-2">
            Help Us Show You Better Content & Earnings
          </CardTitle>
          <CardDescription className="text-amber-300/80 text-lg">
            We respect your privacy. Choose what data you'd like to share to improve your experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Analytics (Required) */}
          <div className="p-4 rounded-xl bg-amber-900/20 border border-amber-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-amber-400" />
                <div>
                  <Label htmlFor="analytics" className="text-white font-semibold text-lg">
                    Analytics (Required)
                  </Label>
                  <p className="text-sm text-amber-300/70 mt-1">
                    Essential for core features like tracking your earnings and stats
                  </p>
                </div>
              </div>
              <Switch
                id="analytics"
                checked={analyticsConsent}
                onCheckedChange={setAnalyticsConsent}
                disabled
                className="opacity-50"
              />
            </div>
          </div>

          {/* Marketing Attribution (Optional) */}
          <div className="p-4 rounded-xl bg-amber-900/20 border border-amber-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <div>
                  <Label htmlFor="marketing" className="text-white font-semibold text-lg">
                    Marketing Attribution (Optional)
                  </Label>
                  <p className="text-sm text-amber-300/70 mt-1">
                    Helps us show you relevant content. <span className="text-emerald-400 font-semibold">Doubles your XP!</span>
                  </p>
                </div>
              </div>
              <Switch
                id="marketing"
                checked={marketingConsent}
                onCheckedChange={setMarketingConsent}
              />
            </div>
          </div>

          {/* Precise Location (Optional) */}
          <div className="p-4 rounded-xl bg-amber-900/20 border border-amber-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-amber-400" />
                <div>
                  <Label htmlFor="location" className="text-white font-semibold text-lg">
                    Precise Location (Optional)
                  </Label>
                  <p className="text-sm text-amber-300/70 mt-1">
                    Improves local matches and recommendations
                  </p>
                </div>
              </div>
              <Switch
                id="location"
                checked={locationConsent}
                onCheckedChange={setLocationConsent}
              />
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/50">
            <p className="text-xs text-gray-400 leading-relaxed">
              <strong className="text-gray-300">GDPR & CCPA Compliant:</strong> Your data is encrypted and never sold. 
              You can change these settings anytime in your profile. Analytics data helps us improve the platform 
              and show you personalized content. Marketing attribution helps us understand which channels bring 
              the best users. Location data is only used for matching and recommendations.
            </p>
          </div>

          {/* CTA */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-6 text-lg"
          >
            {saving ? 'Saving...' : 'Continue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

