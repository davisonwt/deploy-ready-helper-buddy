import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, Download, Users, MousePointerClick, UserPlus, Share2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReferralStats } from '@/components/referral/ReferralStats';
import { ReferralCircleList } from '@/components/referral/ReferralCircleList';
import { ReferralShareTools } from '@/components/referral/ReferralShareTools';
import { getCurrentTheme } from '@/utils/dashboardThemes';

export default function MyReferralCirclePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralData, setReferralData] = useState<any>(null);
  const [circleMembers, setCircleMembers] = useState<any[]>([]);
  const [myReferrer, setMyReferrer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const theme = getCurrentTheme();

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch user's referral data
      const { data: refData } = await supabase
        .from('user_referrals')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      setReferralData(refData);

      // Fetch circle members (people I referred)
      const { data: circle } = await supabase
        .from('referral_circle')
        .select('referred_user_id, referred_at, status')
        .eq('referrer_id', user!.id)
        .order('referred_at', { ascending: false });

      if (circle && circle.length > 0) {
        const userIds = circle.map(c => c.referred_user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, avatar_url')
          .in('user_id', userIds);

        const merged = circle.map(c => ({
          ...c,
          profile: profiles?.find(p => p.user_id === c.referred_user_id),
        }));
        setCircleMembers(merged);
      }

      // Fetch who referred me
      const { data: myRef } = await supabase
        .from('referral_circle')
        .select('referrer_id, referred_at')
        .eq('referred_user_id', user!.id)
        .single();

      if (myRef) {
        const { data: referrerProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('user_id', myRef.referrer_id)
          .single();
        setMyReferrer({ ...myRef, profile: referrerProfile });
      }
    } catch (e) {
      console.error('Error fetching referral data:', e);
    } finally {
      setLoading(false);
    }
  };

  const referralLink = referralData?.referral_code
    ? `https://sow2growapp.com/?ref=${referralData.referral_code}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: 'Ripple sent! 🌊', description: 'Share it to grow your tribe' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.background }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: theme.background }}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" style={{ color: theme.textPrimary }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: theme.textPrimary }}>
              🌊 My S2G Tribe
            </h1>
            <p className="text-sm" style={{ color: theme.textSecondary }}>
              Send a ripple — start a wave. Grow your tribe.
            </p>
          </div>
        </div>

        {/* Referral Code & Link */}
        <Card className="border shadow-xl backdrop-blur-xl" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}>
          <CardHeader>
            <CardTitle className="text-lg" style={{ color: theme.textPrimary }}>
              Your Tribe Invitation Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 rounded-xl font-mono text-lg font-bold text-center tracking-widest" style={{ backgroundColor: theme.secondaryButton, color: theme.accent }}>
                {referralData?.referral_code || 'Loading...'}
              </div>
              <Button onClick={copyLink} size="sm" style={{ background: theme.primaryButton, color: theme.textPrimary }}>
                <Copy className="h-4 w-4 mr-1" /> Copy Link
              </Button>
            </div>
            <p className="text-xs break-all" style={{ color: theme.textSecondary }}>
              {referralLink}
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <ReferralStats
          totalClicks={referralData?.total_clicks || 0}
          totalSignups={referralData?.total_signups || 0}
          circleSize={circleMembers.length}
          theme={theme}
        />

        {/* Share Tools */}
        <ReferralShareTools
          referralLink={referralLink}
          referralCode={referralData?.referral_code || ''}
          theme={theme}
        />

        {/* Circle Members */}
        <ReferralCircleList
          members={circleMembers}
          myReferrer={myReferrer}
          theme={theme}
        />
      </div>
    </div>
  );
}
