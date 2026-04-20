import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { WhispererProfileForm } from '@/components/whisperers/WhispererProfileForm';
import { WhispererInvitationsPanel } from '@/components/whisperers/WhispererInvitationsPanel';
import { WhispererReferralLinks } from '@/components/whisperers/WhispererReferralLinks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, TrendingUp, Users, DollarSign, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FormShell } from '@/components/forms';

interface WhispererProfile {
  id: string;
  display_name: string;
  bio: string | null;
  specialties: string[] | null;
  portfolio_url: string | null;
  social_links: Record<string, string> | null;
  wallet_address: string | null;
  is_verified: boolean;
  is_active: boolean;
  total_earnings: number;
  total_products_promoted: number;
  created_at: string;
}

// Transform database data to our interface
const transformWhispererData = (data: any): WhispererProfile => ({
  id: data.id,
  display_name: data.display_name,
  bio: data.bio,
  specialties: data.specialties,
  portfolio_url: data.portfolio_url || null,
  social_links: typeof data.social_links === 'object' ? data.social_links : null,
  wallet_address: data.wallet_address,
  is_verified: data.is_verified ?? false,
  is_active: data.is_active ?? true,
  total_earnings: data.total_earnings ?? 0,
  total_products_promoted: data.total_products_promoted ?? 0,
  created_at: data.created_at,
});

export default function BecomeWhispererPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [existingProfile, setExistingProfile] = useState<WhispererProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExistingProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('whisperers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching whisperer profile:', error);
        }

        if (data) {
          setExistingProfile(transformWhispererData(data));
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchExistingProfile();
    }
  }, [user?.id, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Megaphone className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>Become a Whisperer</CardTitle>
            <CardDescription>
              You need to be logged in to become a whisperer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login">
              <Button className="w-full">Log In to Continue</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FormShell
      icon={Megaphone}
      eyebrow={existingProfile ? 'your whisperer hub' : 'become a marketing seed-spreader'}
      title={existingProfile ? 'Your Whisperer Profile' : 'Become a Whisperer'}
      subtitle={
        existingProfile
          ? 'Manage your profile, track earnings, and grow your reach across the tribe.'
          : 'Join our community of marketing agents and help sowers spread their seeds to the world.'
      }
      backTo="/dashboard"
      backLabel="Back to dashboard"
      size="xl"
      benefits={
        existingProfile
          ? undefined
          : [
              { icon: DollarSign, label: 'Earn commissions' },
              { icon: Users, label: 'Build connections' },
              { icon: Sparkles, label: 'Get verified' },
            ]
      }
    >
      <div className="space-y-8">
        {/* Hero feature grid for new whisperers */}
        {!existingProfile && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-foreground/10 bg-card/60 p-4 text-center backdrop-blur-md">
              <div className="mx-auto mb-2 inline-flex rounded-full bg-primary/10 p-2">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium">Earn Commissions</h3>
              <p className="text-sm text-muted-foreground">Get paid for every bestowal on products you promote</p>
            </div>
            <div className="rounded-xl border border-foreground/10 bg-card/60 p-4 text-center backdrop-blur-md">
              <div className="mx-auto mb-2 inline-flex rounded-full bg-accent/10 p-2">
                <Users className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="font-medium">Build Connections</h3>
              <p className="text-sm text-muted-foreground">Partner with sowers and grow together</p>
            </div>
            <div className="rounded-xl border border-foreground/10 bg-card/60 p-4 text-center backdrop-blur-md">
              <div className="mx-auto mb-2 inline-flex rounded-full bg-secondary/50 p-2">
                <TrendingUp className="h-5 w-5 text-secondary-foreground" />
              </div>
              <h3 className="font-medium">Grow Your Brand</h3>
              <p className="text-sm text-muted-foreground">Showcase your skills and get verified</p>
            </div>
          </div>
        )}

        {/* Existing Profile Stats */}
        {existingProfile && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Megaphone className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Your Whisperer Profile
                      {existingProfile.is_verified && (
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Active since {new Date(existingProfile.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={existingProfile.is_active ? 'default' : 'secondary'}>
                  {existingProfile.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Products Promoted</div>
                  <div className="text-2xl font-bold">{existingProfile.total_products_promoted}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Total Earnings</div>
                  <div className="text-2xl font-bold text-primary">
                    ${existingProfile.total_earnings.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invitations Panel - only show for existing whisperers */}
        {existingProfile && (
          <div className="mb-8">
            <WhispererInvitationsPanel />
          </div>
        )}

        {/* Referral Links - only show for existing whisperers */}
        {existingProfile && (
          <div className="mb-8 space-y-4">
            <WhispererReferralLinks />
            <Link to="/whisperer-earnings">
              <Button variant="outline" className="w-full gap-2">
                <TrendingUp className="h-4 w-4" />
                View Full Earnings Dashboard
              </Button>
            </Link>
          </div>
        )}

        {/* Form */}
        <WhispererProfileForm 
          existingProfile={existingProfile} 
          onSuccess={() => {
            // Refresh profile after save
            window.location.reload();
          }}
        />
      </div>
    </FormShell>
  );
}
