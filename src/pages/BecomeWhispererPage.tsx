import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { WhispererProfileForm } from '@/components/whisperers/WhispererProfileForm';
import { WhispererInvitationsPanel } from '@/components/whisperers/WhispererInvitationsPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, TrendingUp, Users, DollarSign, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        {/* Hero Section */}
        {!existingProfile && (
          <Card className="mb-8 bg-gradient-to-br from-primary/10 via-accent/5 to-background border-primary/20">
            <CardContent className="pt-8 pb-6">
              <div className="text-center mb-6">
                <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                  <Megaphone className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Become a Whisperer</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Join our community of marketing agents and help sowers spread their seeds to the world
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 mt-8">
                <div className="text-center p-4">
                  <div className="inline-flex p-2 rounded-full bg-primary/10 mb-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-medium">Earn Commissions</h3>
                  <p className="text-sm text-muted-foreground">Get paid for every bestowal on products you promote</p>
                </div>
                <div className="text-center p-4">
                  <div className="inline-flex p-2 rounded-full bg-accent/10 mb-2">
                    <Users className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="font-medium">Build Connections</h3>
                  <p className="text-sm text-muted-foreground">Partner with sowers and grow together</p>
                </div>
                <div className="text-center p-4">
                  <div className="inline-flex p-2 rounded-full bg-secondary/50 mb-2">
                    <TrendingUp className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <h3 className="font-medium">Grow Your Brand</h3>
                  <p className="text-sm text-muted-foreground">Showcase your skills and get verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* Form */}
        <WhispererProfileForm 
          existingProfile={existingProfile} 
          onSuccess={() => {
            // Refresh profile after save
            window.location.reload();
          }}
        />
      </div>
    </div>
  );
}
