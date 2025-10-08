import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const steps: Step[] = [
  {
    target: '.dashboard-tour',
    content: 'Welcome to Sow2Grow! This is your main dashboard where you can see all your activities and navigate through the platform.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.stats-tour',
    content: 'Here are your key statistics at a glance - track your orchards, donations raised, active community members, and your support contributions.',
    placement: 'bottom',
  },
  {
    target: '.my-orchards-stat-tour',
    content: 'This shows the total number of orchards (projects) you have created.',
    placement: 'bottom',
  },
  {
    target: '.wallet-tour',
    content: 'Your USDC Wallet - Connect your Solana wallet here to make and receive payments. You can top up your balance and see transaction details.',
    placement: 'top',
  },
  {
    target: '.timezone-tour',
    content: 'Global Time Zones - See the current time in different zones and access the radio schedule for live broadcasts.',
    placement: 'top',
  },
  {
    target: '.my-orchards-section-tour',
    content: 'My Orchards section - View and manage all your active orchards. Click "View All" to see your complete orchard list.',
    placement: 'top',
  },
  {
    target: '.bestowals-tour',
    content: 'Recent Bestowals - Track the orchards you\'ve supported with donations. Click "Explore More" to find more projects to support.',
    placement: 'top',
  },
  {
    target: '.quick-actions-tour',
    content: 'Quick Actions - Fast access to common tasks: Plant a new seed (create orchard), browse community orchards, and manage your profile.',
    placement: 'top',
  },
  {
    target: '.create-orchard-tour', 
    content: 'Ready to plant your first seed? Click here to create your own orchard and start your project.',
    placement: 'bottom',
  },
  {
    target: '.browse-orchards-tour',
    content: 'Browse and discover orchards created by other users in the community. Support projects that align with your values.',
    placement: 'right',
  },
  {
    target: '.tithing-tour',
    content: 'Support the community through tithing and free-will gifting - give back to help the platform grow.',
    placement: 'right',
  },
  {
    target: '.profile-tour',
    content: 'Manage your profile and account settings here. Update your information and preferences.',
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
        className="fixed bottom-4 left-4 z-50 shadow-lg"
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
        <div className="fixed bottom-4 left-4 z-50 flex gap-2">
          <Button onClick={startTour} className="shadow-lg">
            Start Tour
          </Button>
          <Button onClick={skipTour} variant="outline" className="shadow-lg">
            Skip
          </Button>
        </div>
      )}
    </>
  );
};

export default OnboardingTour;