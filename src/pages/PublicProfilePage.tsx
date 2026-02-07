import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  TreePine, 
  Award, 
  Calendar, 
  Sprout,
  Users,
  MapPin
} from 'lucide-react';

interface PublicProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string | null;
}

interface UserPoints {
  total_points: number;
  level: number;
}

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProfile(id);
    }
  }, [id]);

  const loadProfile = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get public profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, bio, location, created_at')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        setError('Profile not found');
        return;
      }

      setProfile(profileData);

      // Get user points/level
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('total_points, level')
        .eq('user_id', userId)
        .single();

      setPoints(pointsData || { total_points: 0, level: 1 });

    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const getTreeEmoji = (level: number) => {
    if (level >= 30) return '🌳';
    if (level >= 20) return '🌲';
    if (level >= 10) return '🌴';
    if (level >= 5) return '🌿';
    return '🌱';
  };

  const getLevelTitle = (level: number) => {
    if (level >= 30) return 'Ancient Oak';
    if (level >= 20) return 'Mighty Pine';
    if (level >= 10) return 'Growing Tree';
    if (level >= 5) return 'Young Sapling';
    return 'Seedling';
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardHeader className="text-center pb-4">
            <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This user's profile could not be found or may be private.
            </p>
            <Button onClick={() => navigate('/eternal-forest')}>
              <TreePine className="h-4 w-4 mr-2" />
              Return to Eternal Forest
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const level = points?.level || 1;
  const totalXP = points?.total_points || 0;
  const memberSince = profile.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card className="overflow-hidden">
        {/* Header with gradient */}
        <div className="h-24 bg-gradient-to-r from-primary/30 via-primary/20 to-secondary/30" />
        
        <CardHeader className="text-center pb-4 -mt-12">
          <Avatar className="h-24 w-24 mx-auto border-4 border-background shadow-lg">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || 'User'} />
            <AvatarFallback className="text-2xl bg-primary/20">
              {(profile.display_name || profile.username || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="mt-4">
            <h1 className="text-2xl font-bold">
              {profile.display_name || profile.username || 'Anonymous Sower'}
            </h1>
            {profile.username && profile.display_name && (
              <p className="text-muted-foreground">@{profile.username}</p>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              <span className="mr-1">{getTreeEmoji(level)}</span>
              Level {level} • {getLevelTitle(level)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Bio */}
          {profile.bio && (
            <div className="text-center">
              <p className="text-muted-foreground italic">"{profile.bio}"</p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <Sprout className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{totalXP.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total XP</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{level}</div>
                <div className="text-sm text-muted-foreground">Current Level</div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="space-y-3 pt-4 border-t">
            {profile.location && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{profile.location}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Member since {memberSince}</span>
            </div>
          </div>

          {/* Return to Forest Button */}
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => navigate('/eternal-forest')}
          >
            <TreePine className="h-4 w-4 mr-2" />
            Return to Eternal Forest
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
