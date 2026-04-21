/**
 * TribalHearts — Ambassador-only sacred dating garden.
 * Flow:
 *   1. Gate (must be Ambassador)
 *   2. WelcomeAbout (first visit OR via About button)
 *   3. Onboarding wizard if no profile
 *   4. Tabs: Sparks · Garden · My Profile · Safety
 */
import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, Lock, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

import { HeartsHeader } from '@/components/hearts/HeartsHeader';
import { SafetyBanner } from '@/components/hearts/SafetyBanner';
import { MatchGarden } from '@/components/hearts/MatchGarden';
import { HeartsOnboardingWizard } from '@/components/hearts/HeartsOnboardingWizard';
import { ProfileEditor } from '@/components/hearts/ProfileEditor';
import { SafetyTab } from '@/components/hearts/SafetyTab';
import { WelcomeAbout } from '@/components/hearts/WelcomeAbout';
import { MeetTheTribe } from '@/components/hearts/MeetTheTribe';
import { DailySparks } from '@/components/hearts/DailySparks';
import { HeartsMediaUpload } from '@/components/hearts/HeartsMediaUpload';
import { HeartsLanding } from '@/components/hearts/HeartsLanding';

import { useTribalHeartsAccess } from '@/hooks/useTribalHeartsAccess';
import { useTribalHeartsProfile } from '@/hooks/useTribalHeartsProfile';

export default function TribalHearts() {
  const { loading: accessLoading, hasAccess } = useTribalHeartsAccess();
  const { profile, loading: profileLoading, reload, save } = useTribalHeartsProfile();
  const [showAbout, setShowAbout] = useState(false);
  const [aboutDecided, setAboutDecided] = useState(false);

  // First-visit welcome: show About if profile exists but about_seen_at is null,
  // OR if no profile yet (onboarding hidden behind Welcome).
  useEffect(() => {
    if (profileLoading) return;
    if (aboutDecided) return;
    if (!profile) { setShowAbout(true); setAboutDecided(true); return; }
    if (!profile.about_seen_at) { setShowAbout(true); setAboutDecided(true); return; }
    setAboutDecided(true);
  }, [profile, profileLoading, aboutDecided]);

  async function enterGarden() {
    setShowAbout(false);
    if (profile && !profile.about_seen_at) {
      try { await save({ about_seen_at: new Date().toISOString() } as any); } catch {}
    }
  }

  if (accessLoading) {
    return (
      <div className="tribal-hearts-sanctuary min-h-[60vh] p-6 text-sm text-[hsl(var(--th-gold)/0.8)]">
        Lighting the sanctuary fire…
      </div>
    );
  }

  if (!hasAccess) {
    return <HeartsLanding />;
  }

  if (showAbout) return <WelcomeAbout onEnter={enterGarden} />;

  return (
    <div className="tribal-hearts-sanctuary min-h-[calc(100vh-4rem)]">
      <div className="relative mx-auto max-w-4xl space-y-5 p-4 animate-fade-in">
        <HeartsHeader />

        <div className="flex items-center justify-between gap-2">
          <SafetyBanner />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => setShowAbout(true)}
            size="sm"
            variant="ghost"
            className="text-xs text-[hsl(var(--th-gold)/0.7)] hover:bg-[hsl(var(--th-walnut-dark)/0.4)] hover:text-[hsl(var(--th-gold-bright))]"
          >
            <Info className="mr-1.5 h-3.5 w-3.5" /> About Tribal Hearts
          </Button>
        </div>

        {profileLoading ? (
          <div className="text-sm text-[hsl(var(--th-cream)/0.7)]">Loading your flame…</div>
        ) : !profile ? (
          <Card
            className="overflow-hidden border-0 p-5 shadow-2xl backdrop-blur-md"
            style={{
              background: 'var(--th-wood-gradient-soft)',
              border: '1px solid hsl(var(--th-gold) / 0.35)',
              boxShadow: 'var(--th-inner-shadow), var(--th-glow-soft)',
            }}
          >
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--th-gold)/0.4)] bg-[hsl(var(--th-walnut-dark)/0.5)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--th-gold-bright))]">
                <Heart className="h-3 w-3" fill="currentColor" /> Begin your journey
              </div>
              <h2 className="th-serif mt-2 text-3xl font-semibold leading-tight th-gold-text">
                Plant your flame in the fireside
              </h2>
              <p className="mt-1 text-sm text-[hsl(var(--th-cream)/0.78)]">
                A short, warm conversation by the fire — Gentoo will weave your answers into a sacred story, then you make it your own.
              </p>
            </div>
            <HeartsOnboardingWizard onDone={reload} />
          </Card>
        ) : (
          <Tabs defaultValue="sparks" className="space-y-4">
            <TabsList
              className="grid w-full grid-cols-4 border"
              style={{
                background: 'var(--th-wood-gradient-soft)',
                borderColor: 'hsl(var(--th-gold) / 0.3)',
              }}
            >
              <TabsTrigger value="sparks" className="data-[state=active]:bg-[hsl(var(--th-gold)/0.2)] data-[state=active]:text-[hsl(var(--th-gold-bright))]">✨ Sparks</TabsTrigger>
              <TabsTrigger value="garden" className="data-[state=active]:bg-[hsl(var(--th-gold)/0.2)] data-[state=active]:text-[hsl(var(--th-gold-bright))]">🔥 Fireside</TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-[hsl(var(--th-gold)/0.2)] data-[state=active]:text-[hsl(var(--th-gold-bright))]">🌱 Flame</TabsTrigger>
              <TabsTrigger value="safety" className="data-[state=active]:bg-[hsl(var(--th-gold)/0.2)] data-[state=active]:text-[hsl(var(--th-gold-bright))]">🛡️ Safety</TabsTrigger>
            </TabsList>
            <TabsContent value="sparks" className="space-y-5">
              <DailySparks />
              <MatchGarden />
            </TabsContent>
            <TabsContent value="garden">
              <MeetTheTribe />
            </TabsContent>
            <TabsContent value="profile" className="space-y-5">
              <HeartsMediaUpload />
              <ProfileEditor />
            </TabsContent>
            <TabsContent value="safety"><SafetyTab /></TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
