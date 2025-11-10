import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Video } from 'lucide-react';

export default function CreateLiveRoomPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxParticipants: 10,
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please login to create a live room',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      const slug = generateSlug(formData.name);

      // Check if slug already exists
      const { data: existingRoom } = await supabase
        .from('live_rooms')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existingRoom) {
        toast({
          title: 'Room name taken',
          description: 'A room with this name already exists. Please choose a different name.',
          variant: 'destructive',
        });
        setIsCreating(false);
        return;
      }

      // Create the room
      const { data: room, error } = await supabase
        .from('live_rooms')
        .insert({
          name: formData.name,
          slug,
          description: formData.description,
          max_participants: formData.maxParticipants,
          created_by: user.id,
          is_active: true,
          current_participants: 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Room created!',
        description: 'Your live room is now active',
      });

      navigate(`/live-rooms?join=${slug}`);
    } catch (error: unknown) {
      console.error('Error creating room:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create room';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/live-rooms')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Live Rooms
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Video className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl">Create Live Room</CardTitle>
            </div>
            <CardDescription>Set up a new video room for live conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Room Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Gaming Lounge, Music Chat, Tech Talk"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  maxLength={50}
                />
                <p className="text-sm text-muted-foreground">
                  Room URL: {generateSlug(formData.name) || 'your-room-name'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what your room is about..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Maximum Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min={2}
                  max={50}
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Set the maximum number of people who can join (2-50)
                </p>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={isCreating} className="flex-1">
                  {isCreating ? 'Creating...' : 'Create Room'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/live-rooms')}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Room Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>✓ HD video and audio quality</p>
            <p>✓ Screen sharing capability</p>
            <p>✓ Chat messaging</p>
            <p>✓ Raise hand for audience participation</p>
            <p>✓ Moderator controls (mute, kick)</p>
            <p>✓ Mobile-responsive design</p>
            <p>✓ Recording option (if enabled)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
