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
    return <div className="p-6 text-sm text-muted-foreground">Opening the garden gate…</div>;
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <HeartsHeader />
        <Card className="space-y-3 p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-primary" />
          <h2 className="text-xl font-semibold">Tribal Hearts is for Ambassadors</h2>
          <p className="text-sm text-muted-foreground">
            A safe, sacred garden where only Tribe Ambassadors come to sow real connection.
            Join the inner circle to enter the garden.
          </p>
          <Button asChild>
            <Link to="/tribe-ambassador"><Heart className="mr-2 h-4 w-4" fill="currentColor" />Become an Ambassador</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (showAbout) return <WelcomeAbout onEnter={enterGarden} />;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <HeartsHeader />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <SafetyBanner />
      </div>
      <div className="flex justify-end">
        <Button onClick={() => setShowAbout(true)} size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
          <Info className="mr-1.5 h-3.5 w-3.5" /> About Tribal Hearts
        </Button>
      </div>

      {profileLoading ? (
        <div className="text-sm text-muted-foreground">Loading your profile…</div>
      ) : !profile ? (
        <Card className="overflow-hidden border-primary/20 p-5 shadow-xl backdrop-blur-md"
              style={{ background: 'linear-gradient(160deg, hsl(var(--card)), hsl(var(--primary) / 0.06))' }}>
          <div className="mb-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
              <Heart className="h-3 w-3" fill="currentColor" /> Begin your journey
            </div>
            <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-foreground">
              Plant your Tribal Hearts story
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A short, warm conversation — Gentoo will weave your answers into something beautiful, then you make it your own.
            </p>
          </div>
          <HeartsOnboardingWizard onDone={reload} />
        </Card>
      ) : (
        <Tabs defaultValue="sparks" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sparks">✨ Sparks</TabsTrigger>
            <TabsTrigger value="garden">🌸 Garden</TabsTrigger>
            <TabsTrigger value="profile">🌱 Profile</TabsTrigger>
            <TabsTrigger value="safety">🛡️ Safety</TabsTrigger>
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
  );
}
