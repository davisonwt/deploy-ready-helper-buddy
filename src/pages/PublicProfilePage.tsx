import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  MapPin,
  ShoppingBag,
  Package,
  ChevronLeft,
  ChevronRight
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

interface SeedProduct {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  cover_image_url: string | null;
  image_urls: string[] | null;
  type: string | null;
  category: string | null;
  status: string | null;
}

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [seeds, setSeeds] = useState<SeedProduct[]>([]);
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

      // Fetch profile, points, and sower record in parallel
      const [profileRes, pointsRes, sowerRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url, bio, location, created_at')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('user_points')
          .select('total_points, level')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('sowers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (profileRes.error) {
        console.error('Profile error:', profileRes.error);
        setError('Profile not found');
        return;
      }

      setProfile(profileRes.data);
      setPoints(pointsRes.data || { total_points: 0, level: 1 });

      // If user is a sower, fetch their products and books using sowers.id
      const sowerId = sowerRes.data?.id;
      if (sowerId) {
        const [seedsRes, booksRes] = await Promise.all([
          supabase
            .from('products')
            .select('id, title, description, price, cover_image_url, image_urls, type, category, status')
            .eq('sower_id', sowerId)
            .eq('status', 'active')
            .order('created_at', { ascending: false }),
          supabase
            .from('sower_books')
            .select('id, title, description, bestowal_value, cover_image_url, image_urls, category, status')
            .eq('sower_id', sowerId)
            .eq('status', 'active')
            .order('created_at', { ascending: false }),
        ]);

        const productSeeds: SeedProduct[] = (seedsRes.data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          price: p.price,
          cover_image_url: p.cover_image_url,
          image_urls: p.image_urls,
          type: p.type,
          category: p.category,
          status: p.status,
        }));
        const bookSeeds: SeedProduct[] = (booksRes.data || []).map((b: any) => ({
          id: b.id,
          title: b.title,
          description: b.description,
          price: b.bestowal_value,
          cover_image_url: b.cover_image_url,
          image_urls: b.image_urls,
          type: 'Book',
          category: b.category,
          status: b.status,
        }));
        setSeeds([...productSeeds, ...bookSeeds]);
      }

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

          {/* Sower's Seeds - Horizontal Slider */}
          {seeds.length > 0 && (
            <div className="pt-4 border-t">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Seeds Sowed ({seeds.length})
              </h2>
              <div className="relative group">
                {/* Left Arrow */}
                <button
                  onClick={() => {
                    const el = document.getElementById('seeds-slider');
                    if (el) el.scrollBy({ left: -200, behavior: 'smooth' });
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {/* Right Arrow */}
                <button
                  onClick={() => {
                    const el = document.getElementById('seeds-slider');
                    if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                {/* Scrollable container */}
                <div
                  id="seeds-slider"
                  className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {seeds.map((seed) => (
                    <Link key={seed.id} to={`/products/${seed.id}`} className="no-underline flex-shrink-0 w-40 snap-start">
                      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                        <div className="aspect-square bg-muted relative">
                          {(seed.cover_image_url || seed.image_urls?.[0]) ? (
                            <img
                              src={seed.cover_image_url || seed.image_urls?.[0]}
                              alt={seed.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          {seed.type && (
                            <Badge className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5">
                              {seed.type}
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-2">
                          <p className="text-sm font-semibold truncate">{seed.title}</p>
                          {seed.price != null && (
                            <p className="text-xs text-muted-foreground">
                              ${seed.price.toFixed(2)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {seeds.length === 0 && !loading && (
            <div className="pt-4 border-t text-center py-6">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No seeds sowed yet</p>
            </div>
          )}

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
