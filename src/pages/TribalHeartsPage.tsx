import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProfileCard } from '@/components/tribal-hearts/ProfileCard';
import { SparkModal } from '@/components/tribal-hearts/SparkModal';
import { BondingAnimation } from '@/components/tribal-hearts/BondingAnimation';
import { TribalHeartsOnboarding } from '@/components/tribal-hearts/TribalHeartsOnboarding';
import { MatchScreen } from '@/components/tribal-hearts/MatchScreen';
import { MatchesList } from '@/components/tribal-hearts/MatchesList';
import { WanderingHeartsChat } from '@/components/tribal-hearts/WanderingHeartsChat';
import { useTribalHearts } from '@/hooks/useTribalHearts';
import { useAuth } from '@/hooks/useAuth';
import { TribalAudio } from '@/hooks/useTribalHeartsAudio';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// public/wandering-hearts/ (not src/assets/, so referenced by public path).
const heroImg = '/wandering-hearts/hero-banner.jpg';
const logoImg = '/wandering-hearts/logo.png';

const TribalHeartsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const {
    profiles,
    myProfile,
    isMember,
    loading,
    sparksRemaining,
    sendSpark,
    passProfile,
    saveProfile,
  } = useTribalHearts();

  const [sparkOpen, setSparkOpen] = useState(false);
  const [bonding, setBonding] = useState<{ open: boolean; name?: string; high?: boolean }>({
    open: false,
  });
  const [soundOn, setSoundOn] = useState(true);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Wandering Hearts messaging (Phase 1): browse the deck, browse matches,
  // or be inside a single match's conversation. pendingMatchPartner carries
  // who we just matched with across the BondingAnimation, so the room can be
  // created (or found) once the animation finishes and MatchScreen shown.
  const [view, setView] = useState<'browse' | 'matches' | 'chat'>('browse');
  const [pendingMatchPartner, setPendingMatchPartner] = useState<{ id: string; name: string } | null>(null);
  const [matchScreen, setMatchScreen] = useState<{ partnerName: string; roomId: string } | null>(null);
  const [activeRoom, setActiveRoom] = useState<{ roomId: string; partnerName: string } | null>(null);

  const openChatWithPartner = async (partnerId: string, partnerName: string) => {
    if (!user?.id) return;
    const { data, error } = await supabase.rpc('get_or_create_wandering_hearts_room' as any, {
      user1_id: user.id,
      user2_id: partnerId,
    });
    if (error || !data) {
      toast({
        title: 'Could not open chat',
        description: error?.message || 'Please try again.',
        variant: 'destructive' as any,
      });
      return;
    }
    setActiveRoom({ roomId: data as string, partnerName });
    setView('chat');
  };

  // Unlock audio on first interaction
  useEffect(() => {
    const unlock = () => TribalAudio.unlock();
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    next ? TribalAudio.enable() : TribalAudio.disable();
  };

  const current = profiles[0];

  const handleSpark = async (message: string, voiceUrl?: string) => {
    if (!current) return;
    const res = await sendSpark(current.user_id, message, voiceUrl);
    if (!res.ok) {
      toast({
        title: 'Spark not sent',
        description: res.message || 'Please try again.',
        variant: 'destructive' as any,
      });
      return;
    }
    if (res.mutual) {
      setPendingMatchPartner({ id: current.user_id, name: current.display_first_name || 'your new bond' });
      setBonding({
        open: true,
        name: current.display_first_name || 'your new bond',
        high: (current.compatibility_score || 0) > 85,
      });
    } else {
      toast({
        title: 'Spark sent ✨',
        description: `${res.remaining_today} Sparks left today`,
      });
    }
  };

  // Background SEO
  useEffect(() => {
    document.title = 'Tribal Hearts — Find your tribe. Protect your heart.';
    const existing = document.querySelector('meta[name="description"]');
    const desc =
      'Tribal Hearts: a warm, respectful, safe dating space for the Sow2Grow tribe. Heart Circles, mutual Sparks, private chat with voice & video notes — no phone numbers, no emails.';
    if (existing) existing.setAttribute('content', desc);
    else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  const pageBg =
    'radial-gradient(ellipse at top, hsl(20 30% 12%) 0%, hsl(20 35% 7%) 60%, hsl(0 0% 4%) 100%)';

  // While we don't yet know if the user has a profile, render a neutral
  // background only — avoids the "Tribal Hearts shell flashes for a second
  // then jumps to onboarding" glitch.
  if (loading) {
    return <div className="min-h-screen" style={{ background: pageBg }} />;
  }

  // Not a member (not an approved Ambassador) → say so before they fill
  // in anything, instead of letting them complete onboarding and then
  // silently never see a candidate. Same check get_hearts_browse enforces.
  if (!myProfile && isMember === false) {
    return (
      <div className="min-h-screen" style={{ background: pageBg }}>
        <MembershipRequired heroImg={heroImg} onBack={() => navigate('/dashboard')} />
      </div>
    );
  }

  // No profile yet → go straight to onboarding (no shell behind it).
  if (!myProfile) {
    return (
      <div className="min-h-screen" style={{ background: pageBg }}>
        <TribalHeartsOnboarding
          onExit={() => navigate('/dashboard')}
          onComplete={() => window.location.reload()}
        />
      </div>
    );
  }

  // Standalone match/chat screens -- own header + back control, so they
  // render outside the browse shell rather than as an overlay on top of it.
  if (matchScreen) {
    return (
      <MatchScreen
        partnerName={matchScreen.partnerName}
        onStartChat={() => {
          setActiveRoom({ roomId: matchScreen.roomId, partnerName: matchScreen.partnerName });
          setMatchScreen(null);
          setView('chat');
        }}
        onBack={() => setMatchScreen(null)}
      />
    );
  }

  if (view === 'matches') {
    return <MatchesList onOpenChat={openChatWithPartner} onBack={() => setView('browse')} />;
  }

  if (view === 'chat' && activeRoom) {
    return (
      <WanderingHeartsChat
        roomId={activeRoom.roomId}
        partnerName={activeRoom.partnerName}
        onBack={() => setView('matches')}
      />
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: pageBg }}
    >
      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'hsl(38 50% 75%)' }}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Wandering Hearts" className="w-7 h-7 rounded-full object-cover" />
          <h1
            className="text-xl font-serif italic"
            style={{ color: 'hsl(38 95% 85%)' }}
          >
            Tribal Hearts
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('matches')}
            aria-label="Your Matches"
            className="p-2 rounded-full"
            style={{ color: 'hsl(38 40% 70%)' }}
          >
            <MessageCircle size={18} />
          </button>
          <button
            onClick={toggleSound}
            aria-label={soundOn ? 'Mute sounds' : 'Enable sounds'}
            className="p-2 rounded-full"
            style={{ color: 'hsl(38 40% 70%)' }}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </header>

      {/* Sparks remaining indicator */}
      <div className="relative z-10 px-5">
        <div
          className="mx-auto max-w-sm flex items-center justify-between text-xs px-4 py-2 rounded-full"
          style={{
            background: 'hsl(20 25% 12% / 0.7)',
            border: '1px solid hsl(25 35% 22%)',
            color: 'hsl(38 35% 70%)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} />
            All comms stay inside the tribe
          </span>
          <span style={{ color: 'hsl(38 80% 70%)' }}>
            {sparksRemaining} ✨ left today
          </span>
        </div>
      </div>

      {/* Main content */}
      <main className="relative z-10 px-4 py-8 flex flex-col items-center min-h-[70vh]">
        {editProfileOpen ? (
          <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain">
            <TribalHeartsOnboarding
              onExit={() => setEditProfileOpen(false)}
              onComplete={() => {
                setEditProfileOpen(false);
                window.location.reload();
              }}
            />
          </div>
        ) : profiles.length === 0 && isMember === false ? (
          <EmptyState
            heroImg={heroImg}
            title="You won't see candidates yet."
            body="Wandering Hearts browsing is currently limited to approved Ambassadors of the tribe. Your account doesn't have that status, so no one will show up here regardless of your profile."
            cta="Back to Dashboard"
            onCta={() => navigate('/dashboard')}
          />
        ) : profiles.length === 0 ? (
          <EmptyState
            heroImg={heroImg}
            title="The fire rests for now."
            body="Complete (or refine) your Wandering Heart profile so the tribe can find you. The more your heart speaks, the warmer the circle around you grows."
            cta="Complete my Wandering Heart profile"
            onCta={() => setEditProfileOpen(true)}
          />

        ) : (
          <AnimatePresence mode="wait">
            {current && (
              <ProfileCard
                key={current.user_id}
                profile={current}
                onSpark={() => {
                  if (sparksRemaining <= 0) {
                    toast({
                      title: 'Take your time',
                      description: "Real connections don't rush. (8/8 today)",
                    });
                    return;
                  }
                  setSparkOpen(true);
                }}
                onPass={() => passProfile(current.user_id)}
                onSave={() => saveProfile(current.user_id)}
              />
            )}
          </AnimatePresence>
        )}
      </main>

      <SparkModal
        open={sparkOpen}
        recipientName={current?.display_first_name || undefined}
        recipientPhoto={current?.photos?.[0]}
        onClose={() => setSparkOpen(false)}
        onSend={handleSpark}
      />

      <BondingAnimation
        open={bonding.open}
        otherName={bonding.name}
        highCompatibility={bonding.high}
        onComplete={() =>
          setTimeout(async () => {
            setBonding({ open: false });
            const partner = pendingMatchPartner;
            setPendingMatchPartner(null);
            if (!partner || !user?.id) return;
            const { data, error } = await supabase.rpc('get_or_create_wandering_hearts_room' as any, {
              user1_id: user.id,
              user2_id: partner.id,
            });
            if (error || !data) {
              toast({
                title: 'Could not open your conversation',
                description: error?.message || 'You can still find this match under Matches.',
                variant: 'destructive' as any,
              });
              return;
            }
            setMatchScreen({ partnerName: partner.name, roomId: data as string });
          }, 600)
        }
      />
    </div>
  );
};

const MembershipRequired: React.FC<{ heroImg: string; onBack: () => void }> = ({
  heroImg,
  onBack,
}) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center">
    <button
      onClick={onBack}
      className="absolute top-6 left-5 flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
      style={{ color: 'hsl(38 50% 75%)' }}
    >
      <ArrowLeft size={16} />
      Back to Dashboard
    </button>
    <motion.div
      className="max-w-md mx-auto"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <img
        src={heroImg}
        alt="Tribal Hearts circle"
        className="w-full max-w-xs mx-auto rounded-3xl mb-6"
        style={{ boxShadow: '0 20px 60px hsl(15 80% 25% / 0.5)' }}
      />
      <h2 className="text-3xl font-serif italic mb-3" style={{ color: 'hsl(38 95% 85%)' }}>
        Wandering Hearts is limited right now.
      </h2>
      <p style={{ color: 'hsl(38 35% 70%)' }} className="text-sm">
        Browsing and matching is currently open only to approved Ambassadors
        of the tribe. Your account doesn't have that status yet, so there's
        nothing to set up here for you at the moment.
      </p>
    </motion.div>
  </div>
);

const EmptyState: React.FC<{
  heroImg: string;
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
}> = ({ heroImg, title, body, cta, onCta }) => (
  <motion.div
    className="text-center max-w-md mx-auto mt-8"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
  >
    <img
      src={heroImg}
      alt="Tribal Hearts circle"
      className="w-full max-w-xs mx-auto rounded-3xl mb-6"
      style={{ boxShadow: '0 20px 60px hsl(15 80% 25% / 0.5)' }}
    />
    <h2
      className="text-3xl font-serif italic mb-3"
      style={{ color: 'hsl(38 95% 85%)' }}
    >
      {title}
    </h2>
    <p style={{ color: 'hsl(38 35% 70%)' }} className="text-sm mb-6">
      {body}
    </p>
    <button
      onClick={onCta}
      className="px-8 py-3 rounded-full font-medium transition-all hover:scale-105"
      style={{
        background:
          'linear-gradient(135deg, hsl(15 85% 55%) 0%, hsl(25 95% 60%) 100%)',
        color: 'hsl(20 30% 12%)',
        boxShadow: '0 8px 30px hsl(15 80% 50% / 0.5)',
      }}
    >
      {cta}
    </button>
  </motion.div>
);

export default TribalHeartsPage;
