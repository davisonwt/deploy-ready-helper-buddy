import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Phone, Video, Search, Star, UserCheck, CheckCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCallManager } from '@/hooks/useCallManager';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Contact {
  user_id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  bio: string;
  is_verified: boolean;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
  has_one_on_one?: boolean;
  has_group_chat?: boolean;
}

type ContactCategory = 'all' | 'unread' | 'favorites' | 'family' | 'community_364' | 's2g_sowers' | 's2g_bestowers' | 's2g_whisperers' | 'one_on_one' | 'group';

interface ContactsListProps {
  onStartDirectChat: (userId: string) => void;
  onStartCall?: (userId: string, callType: 'audio' | 'video') => void;
  selectedContactId?: string;
}

const ContactsList = ({ onStartDirectChat, onStartCall, selectedContactId }: ContactsListProps) => {
  const { user } = useAuth();
  const { startCall } = useCallManager();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ContactCategory>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentContacts, setRecentContacts] = useState<string[]>([]);
  const [whisperers, setWhisperers] = useState<Set<string>>(new Set());
  const [oneOnOneContacts, setOneOnOneContacts] = useState<Set<string>>(new Set());
  const [groupChatContacts, setGroupChatContacts] = useState<Set<string>>(new Set());

  // Load contacts
  useEffect(() => {
    if (!user) return;
    loadContacts();
    loadFavorites();
    loadRecentContacts();
    loadLastMessages();
    loadWhisperers();
    // Chat rooms loading removed - using circles instead
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, first_name, last_name, avatar_url, bio')
        .neq('user_id', user.id)
        .not('username', 'is', null)
        .order('username', { ascending: true });

      if (error) throw error;
      
      const validContacts = (data || []).filter((c: any) => {
        const name = c.username || `${c.first_name || ''} ${c.last_name || ''}`.trim();
        return name && name.length > 1 && name !== ' ';
      }).map((c: any) => ({
        ...c,
        display_name: c.username || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        is_verified: false
      }));

      setContacts(validContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLastMessages = async () => {
    if (!user) return;
    try {
      // Get last messages for each contact
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id, content, sender_id, room_id, created_at, chat_rooms!inner(room_type, chat_participants!inner(user_id))')
        .eq('chat_rooms.chat_participants.user_id', user.id)
        .eq('chat_rooms.room_type', 'direct')
        .order('created_at', { ascending: false });

      if (messages) {
        // Group by contact and get latest message
        const contactMessages = new Map<string, { content: string; time: string }>();
        messages.forEach((msg: any) => {
          const participants = msg.chat_rooms?.chat_participants || [];
          const otherUser = participants.find((p: any) => p.user_id !== user.id);
          if (otherUser && !contactMessages.has(otherUser.user_id)) {
            contactMessages.set(otherUser.user_id, {
              content: msg.content || '',
              time: msg.created_at
            });
          }
        });

        // Update contacts with last messages
        setContacts(prev => prev.map(contact => {
          const lastMsg = contactMessages.get(contact.user_id);
          return lastMsg ? {
            ...contact,
            last_message: lastMsg.content,
            last_message_time: lastMsg.time
          } : contact;
        }));
      }
    } catch (error) {
      console.error('Error loading last messages:', error);
    }
  };

  const loadFavorites = async () => {
    // Favorites feature not needed in circles UI
    setFavorites(new Set());
  };
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

  const loadWhisperers = async () => {
    if (!user) return;
    try {
      // Load users who are content marketing members (whisperers)
      // Check if they have marketing videos or are in sowers table
      const { data: sowersData } = await supabase
        .from('sowers')
        .select('user_id');
      
      // Also check for users who have uploaded marketing videos
      const { data: marketingVideos } = await supabase
        .from('ai_creations')
        .select('user_id')
        .eq('content_type', 'marketing_tip')
        .not('user_id', 'is', null);
      
      const whispererIds = new Set<string>();
      
      if (sowersData) {
        sowersData.forEach((sower: any) => {
          if (sower.user_id) whispererIds.add(sower.user_id);
        });
      }
      
      if (marketingVideos) {
        marketingVideos.forEach((video: any) => {
          if (video.user_id) whispererIds.add(video.user_id);
        });
      }
      
      setWhisperers(whispererIds);
    } catch (error) {
      console.error('Error loading whisperers:', error);
    }
  };

  const toggleFavorite = async (userId: string) => {
    // Favorites feature not needed in circles UI
    console.log('Favorites not implemented in circles UI');
  };
    } catch (error: any) {
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

  const handleContactClick = (contact: Contact) => {
    addToRecent(contact.user_id);
    onStartDirectChat(contact.user_id);
  };

  const handleCall = async (contact: Contact, callType: 'audio' | 'video', e: React.MouseEvent) => {
    e.stopPropagation();
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

  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    // Filter by tab
    if (activeTab === 'unread') {
      filtered = filtered.filter(c => (c.unread_count || 0) > 0);
    } else if (activeTab === 'favorites') {
      filtered = filtered.filter(c => favorites.has(c.user_id));
    } else if (activeTab === 's2g_whisperers') {
      filtered = filtered.filter(c => whisperers.has(c.user_id));
    } else if (activeTab === 'one_on_one') {
      filtered = filtered.filter(c => oneOnOneContacts.has(c.user_id));
    } else if (activeTab === 'group') {
      filtered = filtered.filter(c => groupChatContacts.has(c.user_id));
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => {
        const name = getDisplayName(c).toLowerCase();
        const bio = (c.bio || '').toLowerCase();
        const lastMsg = (c.last_message || '').toLowerCase();
        return name.includes(term) || bio.includes(term) || lastMsg.includes(term);
      });
    }

    // Sort: unread first, then favorites, then by last message time or name
    return filtered.sort((a, b) => {
      const aUnread = (a.unread_count || 0) > 0;
      const bUnread = (b.unread_count || 0) > 0;
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      
      const aIsFavorite = favorites.has(a.user_id);
      const bIsFavorite = favorites.has(b.user_id);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      
      if (a.last_message_time && b.last_message_time) {
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      }
      
      return getDisplayName(a).localeCompare(getDisplayName(b));
    });
  }, [contacts, activeTab, searchTerm, favorites, oneOnOneContacts, groupChatContacts]);

  const unreadCount = contacts.filter(c => (c.unread_count || 0) > 0).length;

  return (
    <div className="h-full flex flex-col bg-background border-r">
      {/* Search Bar */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="pl-10 bg-muted/50"
          />
        </div>
      </div>

      {/* Category Dropdown */}
      <div className="px-3 pt-3 border-b">
        <Select value={activeTab} onValueChange={(v) => setActiveTab(v as ContactCategory)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Contacts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contacts</SelectItem>
            <SelectItem value="unread">Unread ({unreadCount})</SelectItem>
            <SelectItem value="favorites">Favorites</SelectItem>
            <SelectItem value="one_on_one">1-1 Chats</SelectItem>
            <SelectItem value="group">Group Chats</SelectItem>
            <SelectItem value="s2g_sowers">S2G Sowers</SelectItem>
            <SelectItem value="s2g_bestowers">S2G Bestowers</SelectItem>
            <SelectItem value="s2g_whisperers">S2G Whisperers</SelectItem>
            <SelectItem value="family">Family</SelectItem>
            <SelectItem value="community_364">364 Community</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick Tabs for 1-1 vs Group */}
      <div className="px-3 pt-2 border-b">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContactCategory)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="one_on_one" className="relative">
              1-1
            </TabsTrigger>
            <TabsTrigger value="group" className="relative">
              Group
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
          <div className="divide-y">
            {filteredContacts.map((contact) => {
              const displayName = getDisplayName(contact);
              const isFavorite = favorites.has(contact.user_id);
              const isSelected = selectedContactId === contact.user_id;
              const hasUnread = (contact.unread_count || 0) > 0;

              return (
                <div
                  key={contact.user_id}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer transition-colors group",
                    "hover:bg-accent/50",
                    isSelected && "bg-primary/10 border-l-2 border-l-primary"
                  )}
                  onClick={() => handleContactClick(contact)}
                >
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={contact.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={cn(
                          "font-medium truncate",
                          hasUnread && "font-semibold"
                        )}>
                          {displayName}
                        </p>
                        {contact.is_verified && (
                          <UserCheck className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                        {isFavorite && (
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      {contact.last_message_time && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDistanceToNow(new Date(contact.last_message_time), { addSuffix: true })
                            .replace('about ', '')
                            .replace(' ago', '')}
                        </span>
                      )}
                    </div>
                    
                    {contact.last_message ? (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground truncate flex-1">
                          {contact.last_message}
                        </p>
                        {hasUnread && (
                          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs flex-shrink-0">
                            {contact.unread_count}
                          </Badge>
                        )}
                        {!hasUnread && contact.last_message && (
                          <CheckCheck className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No messages yet
                      </p>
                    )}
                  </div>

                  {/* Action buttons on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(contact.user_id);
                      }}
                      className="p-1.5 rounded hover:bg-accent transition-colors"
                      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-500 text-yellow-500")} />
                    </button>
                    <button
                      onClick={(e) => handleCall(contact, 'audio', e)}
                      className="p-1.5 rounded hover:bg-accent transition-colors"
                      title="Voice call"
                    >
                      <Phone className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleCall(contact, 'video', e)}
                      className="p-1.5 rounded hover:bg-accent transition-colors"
                      title="Video call"
                    >
                      <Video className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ContactsList;
