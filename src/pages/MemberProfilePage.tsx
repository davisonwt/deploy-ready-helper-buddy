import { useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, UserX } from 'lucide-react';
import SignedImg from '@/components/media/SignedImg';
import ReportButton from '@/components/moderation/ReportButton';

interface PublicProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

/**
 * /profile/:userId -- viewing ANOTHER member's profile (read-only). /profile
 * with no param is always "my own profile" (ProfilePage.jsx, full edit
 * form); this is the render path that was missing for every "view this
 * person's profile" link elsewhere in the app (BirthdayCelebration.tsx,
 * etc. -- they linked here before the route existed).
 *
 * Deliberately reads public_profiles, not profiles: it's the narrow,
 * RLS-safe view built exactly for "look up another user's public info"
 * (display_name/username/avatar_url only) -- no bio/location/email, so
 * there's nothing here beyond what this page is allowed to show.
 */
export default function MemberProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async (): Promise<PublicProfile | null> => {
      const { data, error } = await supabase
        .from('public_profiles' as any)
        .select('user_id, display_name, username, avatar_url')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!userId,
  });

  useEffect(() => { window.scrollTo(0, 0); }, [userId]);

  if (user?.id && userId === user.id) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: '#001f3f' }}>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="bg-white/5 border-white/20 text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="bg-white/5 border-white/10 text-white">
          {isLoading ? (
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-white/70" />
            </CardContent>
          ) : isError || !profile ? (
            <CardContent className="flex flex-col items-center gap-2 py-16 text-white/70">
              <UserX className="h-8 w-8" />
              <p>This member's profile isn't available.</p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-white/10 border border-white/20 shrink-0">
                    {profile.avatar_url ? (
                      <SignedImg
                        src={profile.avatar_url}
                        alt={profile.display_name || 'Member avatar'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-white/60">
                        {(profile.display_name || profile.username || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-white text-2xl">
                      {profile.display_name || profile.username || 'Tribe member'}
                    </CardTitle>
                    {profile.username && (
                      <p className="text-sm text-white/60">@{profile.username}</p>
                    )}
                  </div>
                </div>
                <ReportButton targetType="profile" targetId={profile.user_id} variant="outline" size="icon" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/60">
                  This is the public view of a fellow tribe member. Their bestowals, seeds, and orchards
                  live throughout the app -- this page just confirms who they are.
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
