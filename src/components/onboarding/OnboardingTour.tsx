import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const steps: Step[] = [
  {
    target: '.dashboard-tour',
    content: 'Welcome to Sow2Grow! Click the logo to return to your dashboard at any time.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.create-orchard-tour', 
    content: '"Sow New Seed" - Click here to create a new orchard (project) and start raising support for your vision.',
    placement: 'bottom',
  },
  {
    target: '.browse-orchards-tour',
    content: '"My Content" - Access your orchards, browse community projects, view marketing videos, and visit 364yhvh orchards.',
    placement: 'bottom',
  },
  {
    target: '.chatapp-tour',
    content: '"Chatapp" - Connect with the community through chat, listen to radio stations, and access live broadcasts.',
    placement: 'bottom',
  },
  {
    target: '.tithing-tour',
    content: '"Let It Rain" - Support the community through tithing and free-will gifting to help the platform grow.',
    placement: 'bottom',
  },
  {
    target: '.support-tour',
    content: '"Support" - Learn how to support the platform and contribute to its mission.',
    placement: 'bottom',
  },
  {
    target: '.profile-tour',
    content: 'Your Profile - Manage your account settings, update your information, and view your profile details.',
    placement: 'left',
  },
];

const OnboardingTour = () => {
  const [run, setRun] = useState(false);
  const user = useUser();
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  // Check if user has completed onboarding
  const { data: preferences } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_preferences')
        .select('onboarding_complete')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Mark onboarding as complete
  const completeTourMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ 
          user_id: user.id, 
          onboarding_complete: true,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      toast({
        title: 'Welcome aboard!',
        description: 'You can always restart the tour from your profile settings.',
      });
    },
  });

  // Auto-start tour for new users
  useEffect(() => {
    if (preferences && !preferences.onboarding_complete) {
      const timer = setTimeout(() => setRun(true), 1000); // Delay to let page load
      return () => clearTimeout(timer);
    }
  }, [preferences]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      completeTourMutation.mutate();
    }
  };

  const startTour = () => {
    setRun(true);
  };

  const skipTour = () => {
    setRun(false);
    completeTourMutation.mutate();
  };

  // Don't show anything if user has completed onboarding
  if (preferences?.onboarding_complete && !run) {
    return (
      <Button 
        onClick={startTour}
        variant="outline"
        size="sm"
        className="fixed top-52 right-6 z-50 shadow-lg"
      >
        Take Tour Again
      </Button>
    );
  }

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        continuous={true}
        showSkipButton={true}
        showProgress={true}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: 'hsl(var(--primary))',
            backgroundColor: 'hsl(var(--background))',
            textColor: 'hsl(var(--foreground))',
            arrowColor: 'hsl(var(--background))',
          },
          buttonNext: {
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
          },
          buttonBack: {
            color: 'hsl(var(--muted-foreground))',
          },
          buttonSkip: {
            color: 'hsl(var(--muted-foreground))',
          },
        }}
        locale={{
          back: 'Previous',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          open: 'Open',
          skip: 'Skip Tour',
        }}
      />
      
      {!run && !preferences?.onboarding_complete && (
        <Button onClick={startTour} className="fixed top-52 right-6 z-50 shadow-lg bg-green-600 hover:bg-green-700 text-white">
          Start Tour
        </Button>
      )}
    </>
  );
};

export default OnboardingTour;