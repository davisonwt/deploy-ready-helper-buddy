import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  X, 
  Crown, 
  UserPlus,
  Shield
} from 'lucide-react';

const ROOM_TYPES = [
  { value: 'group', label: 'Group Chat' },
  { value: 'live_marketing', label: 'Live Marketing' },
  { value: 'live_study', label: 'Live Study' },
  { value: 'live_podcast', label: 'Live Podcast' },
  { value: 'live_training', label: 'Live Training' },
  { value: 'live_conference', label: 'Live Conference' },
];

// Using the same categories as the seed submission page
const CATEGORIES = [
  'Agriculture & Farming',
  'Education & Training', 
  'Everything Bee\'s',
  'Technology & Innovation',
  'Technology & Hardware (Consumer Electronics)',
  'Healthcare & Wellness',
  'Arts & Culture',
  'Environment & Sustainability',
  'Community Development',
  'Business & Entrepreneurship',
  'Spiritual & Religious',
  'Social Impact',
  'Recreation & Sports',
  'Research & Development'
];

const CreateRoomModal = ({ isOpen, onClose, onCreateRoom }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    room_type: 'group',
    category: '',
    max_participants: 500,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedModerators, setSelectedModerators] = useState([]);
  const [searching, setSearching] = useState(false);

  // Search for users to add as moderators
  const searchUsers = async (searchTerm) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_user_profiles', {
        search_term: searchTerm
      });

      if (error) throw error;
      
      // Filter out already selected moderators
      const filteredResults = data?.filter(user => 
        !selectedModerators.some(mod => mod.user_id === user.user_id)
      ) || [];
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearch) {
        searchUsers(userSearch);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearch]);

  const addModerator = (user) => {
    setSelectedModerators(prev => [...prev, user]);
    setUserSearch('');
    setSearchResults([]);
  };

  const removeModerator = (userId) => {
    setSelectedModerators(prev => prev.filter(mod => mod.user_id !== userId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Room name is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const room = await onCreateRoom(formData, selectedModerators);
      if (room) {
        setFormData({
          name: '',
          description: '',
          room_type: 'group',
          category: '',
          max_participants: 500,
        });
        setSelectedModerators([]);
        setUserSearch('');
        setSearchResults([]);
        onClose();
      }
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Chat Room</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Room Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter room name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="room_type">Room Type</Label>
            <Select
              value={formData.room_type}
              onValueChange={(value) => handleChange('room_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe the purpose of this room..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_participants">Max Participants</Label>
            <Input
              id="max_participants"
              type="number"
              value={formData.max_participants}
              onChange={(e) => handleChange('max_participants', parseInt(e.target.value))}
              min="2"
              max="500"
            />
          </div>

          {/* Moderator Selection Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Room Moderators
            </Label>
            <p className="text-sm text-muted-foreground">
              Search and add users who will help moderate this room
            </p>
            
            {/* Selected Moderators */}
            {selectedModerators.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-md">
                {selectedModerators.map((mod) => (
                  <Badge key={mod.user_id} variant="secondary" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {mod.display_name}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeModerator(mod.user_id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {/* User Search */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users to add as moderators..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Search Results */}
              {(searchResults.length > 0 || searching) && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg">
                  <ScrollArea className="max-h-40">
                    {searching ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="p-1">
                        {searchResults.map((user) => (
                          <div
                            key={user.user_id}
                            className="flex items-center gap-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                            onClick={() => addModerator(user)}
                          >
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                              {user.display_name?.[0] || 'U'}
                            </div>
                            <span className="text-sm">{user.display_name || 'Unknown User'}</span>
                            <UserPlus className="h-4 w-4 ml-auto text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        No users found
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="flex-1"
            >
              {isCreating ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoomModal;