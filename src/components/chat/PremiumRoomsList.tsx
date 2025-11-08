import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  BookOpen, 
  Plus, 
  Lock,
  Users,
  Clock,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const PremiumRoomsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPremiumRooms();
  }, [user?.id]);

  const fetchPremiumRooms = async () => {
    try {
      setLoading(true);
      
      // Fetch premium rooms that the user has access to (either as creator or member)
      const { data, error } = await supabase
        .from('premium_rooms')
        .select(`
          *,
          creator:created_by (
            display_name,
            avatar_url
          ),
          premium_room_members!inner (
            user_id,
            access_level
          )
        `)
        .eq('premium_room_members.user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching premium rooms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load premium rooms',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoomClick = (roomId: string) => {
    navigate(`/premium-room/${roomId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Premium Rooms & Courses</h2>
          <p className="text-sm text-muted-foreground">
            Access your enrolled courses and premium content
          </p>
        </div>
        <Button 
          className="bg-purple-600 hover:bg-purple-700"
          onClick={() => navigate('/create-premium-room')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Premium Room
        </Button>
      </div>

      {/* Premium Rooms Grid */}
      {rooms.length === 0 ? (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="py-12 text-center space-y-4">
            <div className="h-20 w-20 mx-auto rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <GraduationCap className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              No Premium Rooms Yet
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Create structured courses and classrooms with premium content. 
              Share knowledge through modules, documents, videos, and interactive discussions.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => navigate('/create-premium-room')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Room
              </Button>
              <Button 
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                onClick={() => navigate('/premium-rooms')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Browse All Courses
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className="hover:shadow-lg hover:border-purple-400 transition-all cursor-pointer border-2 border-purple-200 dark:border-purple-800"
              onClick={() => handleRoomClick(room.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="h-4 w-4 text-purple-600" />
                      <Badge className="bg-purple-600 text-white text-xs">
                        Premium
                      </Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-2">
                      {room.name}
                    </CardTitle>
                  </div>
                </div>
                
                {room.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {room.description}
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    {room.member_count && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{room.member_count} members</span>
                      </div>
                    )}
                    {room.price && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-purple-600">
                          ${room.price}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(room.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
