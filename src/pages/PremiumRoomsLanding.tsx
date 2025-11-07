import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Search, Plus, BookOpen, Users, Music, FileText, Image } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PremiumRoom {
  id: string;
  title: string;
  description: string;
  room_type: string;
  max_participants: number;
  price: number;
  is_public: boolean;
  creator_id: string;
  created_at: string;
  documents: any[];
  artwork: any[];
  music: any[];
}

const PremiumRoomsLanding: React.FC = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [rooms, setRooms] = React.useState<PremiumRoom[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { user } = useAuth();

  // Fetch premium rooms
  React.useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('premium_rooms')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRooms((data || []) as PremiumRoom[]);
      } catch (error: any) {
        console.error('Error fetching premium rooms:', error);
        toast.error('Failed to load premium rooms');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  // Filter rooms based on search
  const filteredRooms = React.useMemo(() => {
    if (!searchQuery.trim()) return rooms;
    const query = searchQuery.toLowerCase();
    return rooms.filter(
      (room) =>
        room.title.toLowerCase().includes(query) ||
        room.description.toLowerCase().includes(query) ||
        room.room_type.toLowerCase().includes(query)
    );
  }, [rooms, searchQuery]);

  // Basic SEO tags for this page
  React.useEffect(() => {
    document.title = 'Premium Rooms & Courses | sow2grow';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Create premium rooms and courses: classroom, seminar, training, podcast, marketing demo, or general discussion.'
      );
    }
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Premium Rooms & Courses</h1>
            <p className="text-sm text-muted-foreground">
              Create structured courses and classrooms with premium content
            </p>
          </div>
          <Button asChild>
            <Link to="/create-premium-room">
              <Plus className="h-4 w-4 mr-2" />
              Create Room
            </Link>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search premium rooms and courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search premium rooms"
          />
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="h-[calc(100vh-300px)]">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading rooms...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-12 text-center space-y-4">
              <div className="h-20 w-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">
                {searchQuery ? 'No rooms found' : 'Premium Rooms & Courses'}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Create structured courses and classrooms with premium content. Share knowledge through modules, documents, videos, and interactive discussions.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button asChild>
                  <Link to="/create-premium-room">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Premium Room
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => (
              <Card key={room.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{room.title}</CardTitle>
                    <Badge variant="secondary">{room.room_type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {room.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{room.max_participants} max</span>
                    </div>
                    {room.documents.length > 0 && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{room.documents.length} docs</span>
                      </div>
                    )}
                    {room.artwork.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Image className="h-3 w-3" />
                        <span>{room.artwork.length} images</span>
                      </div>
                    )}
                    {room.music.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Music className="h-3 w-3" />
                        <span>{room.music.length} tracks</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-semibold">
                      {room.price > 0 ? `$${room.price}` : 'Free'}
                    </span>
                    <Button size="sm" asChild>
                      <Link to={`/premium-room/${room.id}`}>View Room</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default PremiumRoomsLanding;
