import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Phone, Video, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JitsiCall } from '@/components/JitsiCall';

const UserSelector = ({ onSelectUser, onStartDirectChat, onStartCall }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showJitsi, setShowJitsi] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      try {
        setLoading(true);
        if (!searchTerm || searchTerm.trim().length < 1) {
          setUsers([]);
          return;
        }
        const { data, error } = await supabase.rpc('search_user_profiles', {
          search_term: searchTerm.trim(),
        });
        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [searchTerm, user]);

  // Initial list for dropdown - get all users
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_all_user_profiles');
        if (error) throw error;
        setAllUsers(data || []);
      } catch (e) {
        console.error('Error loading users list:', e);
      }
    })();
  }, [user]);

  const getName = (p) => {
    if (p?.display_name) return p.display_name;
    const fullName = `${p?.first_name || ''} ${p?.last_name || ''}`.trim();
    if (fullName) return fullName;
    if (p?.username) return p.username;
    return 'Unknown User';
  };

  const dropdownOptions = useMemo(() => {
    const dedup = new Map();
    (allUsers || []).forEach((p) => {
      const id = p?.user_id;
      const name = getName(p).trim();
      const username = p?.username;
      // Filter out users with blank or missing names
      if (id && name && name !== 'Unknown User' && name.length > 1 && name !== ' ') {
        const displayText = username ? `${name} (${username})` : name;
        dedup.set(id, { id, name: displayText, sortName: name });
      }
    });
    return Array.from(dedup.values()).sort((a, b) => a.sortName.localeCompare(b.sortName));
  }, [allUsers]);

  const filteredUsers = users.filter((profile) => {
    const name = (profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim()).toLowerCase();
    return searchTerm ? name.includes(searchTerm.toLowerCase()) : true;
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          s2g sowers and bestowers
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Choose how to connect: chat, call, or video call
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropdown list (not transparent, high z-index) */}
        <div className="space-y-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a sower/bestower" />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground">
              {dropdownOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-4">
            <Button size="sm" onClick={() => selectedUserId && onStartDirectChat(selectedUserId)} disabled={!selectedUserId}>
              <MessageSquare className="h-4 w-4 mr-1" /> Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowJitsi(true)}
            >
              <Phone className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Or search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users..."
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-4">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                {(!searchTerm || searchTerm.trim().length < 1)
                  ? 'Type a name to search registered users'
                  : 'No users found'}
              </div>
            ) : (
              filteredUsers.map((profile) => {
                const displayName = profile.display_name || 
                  `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                  'Unknown User';

                return (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback>
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{displayName}</p>
                        {profile.bio && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {profile.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          console.log('💬 Direct chat clicked for:', displayName, profile.user_id);
                          onStartDirectChat(profile.user_id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowJitsi(true)}
                        className="h-8 w-8 p-0"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
      
      {/* Jitsi Call */}
      {showJitsi && (
        <div className="p-4 border-t">
          <JitsiCall
            roomName={crypto.randomUUID().slice(0, 12)}
            onLeave={() => setShowJitsi(false)}
          />
        </div>
      )}
    </Card>
  );
};

export default UserSelector;