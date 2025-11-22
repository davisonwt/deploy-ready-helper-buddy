import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Phone, Video, Search, Users, Star, Heart, Sparkles, UserCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCallManager } from '@/hooks/useCallManager';
import { cn } from '@/lib/utils';

interface Contact {
  user_id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  bio: string;
  is_verified: boolean;
  category?: string;
}

type ContactCategory = 'all' | 'family' | 'community_364' | 's2g_sowers' | 's2g_bestowers' | 'favorites' | 'recent';

interface ContactsListProps {
  onStartDirectChat: (userId: string) => void;
  onStartCall?: (userId: string, callType: 'audio' | 'video') => void;
}

const ContactsList = ({ onStartDirectChat, onStartCall }: ContactsListProps) => {
  const { user } = useAuth();
  const { startCall } = useCallManager();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentContacts, setRecentContacts] = useState<string[]>([]);

  // Load contacts
  useEffect(() => {
    if (!user) return;
    loadContacts();
    loadFavorites();
    loadRecentContacts();
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, avatar_url, bio, is_verified')
        .neq('user_id', user.id)
        .not('display_name', 'is', null)
        .order('display_name', { ascending: true });

      if (error) throw error;
      
      // Filter out users with blank names
      const validContacts = (data || []).filter((c: any) => {
        const name = c.display_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
        return name && name.length > 1 && name !== ' ';
      });

      setContacts(validContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('favorite_user_id')
        .eq('user_id', user.id);
      
      if (error && error.code !== '42P01') { // Ignore "table doesn't exist" error
        console.error('Error loading favorites:', error);
        return;
      }
      
      if (data) {
        setFavorites(new Set(data.map((f: any) => f.favorite_user_id)));
      }
    } catch (error: any) {
      // Table might not exist yet - that's okay, favorites will be empty
      if (error.code !== '42P01') {
        console.error('Error loading favorites:', error);
      }
    }
  };

  const loadRecentContacts = async () => {
    if (!user) return;
    try {
      const recent = localStorage.getItem(`recent_contacts_${user.id}`);
      if (recent) {
        setRecentContacts(JSON.parse(recent));
      }
    } catch (error) {
      console.error('Error loading recent contacts:', error);
    }
  };

  const toggleFavorite = async (userId: string) => {
    if (!user) return;
    const isFavorite = favorites.has(userId);
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('favorite_user_id', userId);
        
        if (error && error.code !== '42P01') {
          throw error;
        }
        
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, favorite_user_id: userId });
        
        if (error && error.code !== '42P01') {
          throw error;
        }
        
        setFavorites(prev => new Set([...prev, userId]));
      }
    } catch (error: any) {
      // Table might not exist yet - use localStorage as fallback
      if (error.code === '42P01') {
        const favsKey = `favorites_${user.id}`;
        const stored = localStorage.getItem(favsKey);
        const favs = stored ? JSON.parse(stored) : [];
        
        if (isFavorite) {
          const updated = favs.filter((id: string) => id !== userId);
          localStorage.setItem(favsKey, JSON.stringify(updated));
          setFavorites(new Set(updated));
        } else {
          const updated = [...favs, userId];
          localStorage.setItem(favsKey, JSON.stringify(updated));
          setFavorites(new Set(updated));
        }
      } else {
        console.error('Error toggling favorite:', error);
      }
    }
  };

  const addToRecent = (userId: string) => {
    if (!user) return;
    setRecentContacts(prev => {
      const updated = [userId, ...prev.filter(id => id !== userId)].slice(0, 20);
      localStorage.setItem(`recent_contacts_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleMessage = (contact: Contact) => {
    addToRecent(contact.user_id);
    onStartDirectChat(contact.user_id);
  };

  const handleCall = async (contact: Contact, callType: 'audio' | 'video') => {
    if (!user) return;
    addToRecent(contact.user_id);
    
    const receiverName = contact.display_name || 
                        `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
                        'Unknown User';
    
    if (onStartCall) {
      onStartCall(contact.user_id, callType);
    } else if (startCall) {
      await startCall(contact.user_id, receiverName, callType);
    }
  };

  const getDisplayName = (contact: Contact) => {
    return contact.display_name || 
           `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 
           'Unknown User';
  };

  const categorizeContact = (contact: Contact): ContactCategory[] => {
    const categories: ContactCategory[] = [];
    
    // Check favorites
    if (favorites.has(contact.user_id)) {
      categories.push('favorites');
    }
    
    // Check recent
    if (recentContacts.includes(contact.user_id)) {
      categories.push('recent');
    }
    
    // TODO: Add logic to determine s2g_sowers and s2g_bestowers based on user roles
    // For now, we'll use a simple check - you can enhance this later
    // categories.push('s2g_sowers'); // if user is a sower
    // categories.push('s2g_bestowers'); // if user is a bestower
    
    return categories;
  };

  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'favorites') {
        filtered = filtered.filter(c => favorites.has(c.user_id));
      } else if (selectedCategory === 'recent') {
        filtered = filtered.filter(c => recentContacts.includes(c.user_id));
      }
      // Add more category filters as needed
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => {
        const name = getDisplayName(c).toLowerCase();
        const bio = (c.bio || '').toLowerCase();
        return name.includes(term) || bio.includes(term);
      });
    }

    // Sort: favorites first, then by name
    return filtered.sort((a, b) => {
      const aIsFavorite = favorites.has(a.user_id);
      const bIsFavorite = favorites.has(b.user_id);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return getDisplayName(a).localeCompare(getDisplayName(b));
    });
  }, [contacts, selectedCategory, searchTerm, favorites, recentContacts]);

  const categoryOptions = [
    { value: 'all', label: 'All Contacts', icon: Users },
    { value: 'favorites', label: 'Favorites', icon: Star },
    { value: 'recent', label: 'Recent', icon: Sparkles },
    { value: 'family', label: 'Family', icon: Heart },
    { value: 'community_364', label: '364 Community', icon: Users },
    { value: 's2g_sowers', label: 'S2G Sowers', icon: UserCheck },
    { value: 's2g_bestowers', label: 'S2G Bestowers', icon: Sparkles },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contacts
          </CardTitle>
          <Badge variant="secondary">{filteredContacts.length}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as ContactCategory)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => {
              const Icon = option.icon;
              return (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search contacts..."
            className="pl-10"
          />
        </div>

        {/* Contacts List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading contacts...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No contacts found' : 'No contacts available'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredContacts.map((contact) => {
                const displayName = getDisplayName(contact);
                const isFavorite = favorites.has(contact.user_id);
                const isRecent = recentContacts.includes(contact.user_id);

                return (
                  <div
                    key={contact.user_id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer group",
                      "hover:bg-accent hover:shadow-sm border border-transparent hover:border-border"
                    )}
                    onClick={() => handleMessage(contact)}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-background">
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {contact.is_verified && (
                        <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                          <UserCheck className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{displayName}</p>
                        {isFavorite && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                        {isRecent && (
                          <Badge variant="outline" className="text-xs">Recent</Badge>
                        )}
                      </div>
                      {contact.bio && (
                        <p className="text-sm text-muted-foreground truncate">{contact.bio}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(contact.user_id);
                        }}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-500 text-yellow-500")} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCall(contact, 'audio');
                        }}
                        title="Voice call"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCall(contact, 'video');
                        }}
                        title="Video call"
                      >
                        <Video className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ContactsList;

