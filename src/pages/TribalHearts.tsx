/**
 * TribalHearts — Ambassador-only dating garden.
 * Strict heterosexual matching, in-house ChatApp comms only, AI-moderated.
 */
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HeartsHeader } from '@/components/hearts/HeartsHeader';
import { SoulStoryStrip } from '@/components/hearts/SoulStoryStrip';
import { SafetyBanner } from '@/components/hearts/SafetyBanner';
import { MatchGarden } from '@/components/hearts/MatchGarden';
import { HeartsOnboardingWizard } from '@/components/hearts/HeartsOnboardingWizard';
import { ProfileEditor } from '@/components/hearts/ProfileEditor';
import { SafetyTab } from '@/components/hearts/SafetyTab';
import { useTribalHeartsAccess } from '@/hooks/useTribalHeartsAccess';
import { useTribalHeartsProfile } from '@/hooks/useTribalHeartsProfile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TribalHearts() {
  const { loading: accessLoading, hasAccess } = useTribalHeartsAccess();
  const { profile, loading: profileLoading, reload } = useTribalHeartsProfile();

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
            A safe, respectful dating haven exclusive to Ambassador Tribal Members ($5/month). Join the inner circle to enter the garden.
          </p>
          <Button asChild>
            <Link to="/tribe-ambassador"><Heart className="mr-2 h-4 w-4" fill="currentColor" />Become an Ambassador</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 animate-fade-in">
      <HeartsHeader />
      <SoulStoryStrip />
      <SafetyBanner />

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
        <Tabs defaultValue="garden" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="garden">🌸 Garden</TabsTrigger>
            <TabsTrigger value="profile">🌱 My Profile</TabsTrigger>
            <TabsTrigger value="safety">🛡️ Safety</TabsTrigger>
          </TabsList>
          <TabsContent value="garden"><MatchGarden /></TabsContent>
          <TabsContent value="profile"><ProfileEditor /></TabsContent>
          <TabsContent value="safety"><SafetyTab /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
