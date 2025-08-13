import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  MessageSquare, 
  Users, 
  Megaphone, 
  BookOpen, 
  Mic, 
  GraduationCap,
  Video,
  Send,
  Paperclip,
  Phone,
  VideoIcon,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import ChatRoomCard from '@/components/chat/ChatRoomCard';
import ChatMessage from '@/components/chat/ChatMessage';
import CreateRoomModal from '@/components/chat/CreateRoomModal';
import InviteModal from '@/components/chat/InviteModal';
import UserSelector from '@/components/chat/UserSelector';
import CallInterface from '@/components/chat/CallInterface';

const ChatappPage = () => {
  const { user } = useAuth();
  const {
    rooms,
    currentRoom,
    setCurrentRoom,
    messages,
    participants,
    loading,
    sendMessage,
    createRoom,
    createDirectRoom,
  } = useChat();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeCall, setActiveCall] = useState(null);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentRoom) return;

    await sendMessage(currentRoom.id, newMessage.trim());
    setNewMessage('');
  };

  const filteredRooms = rooms.filter(room => {
    if (activeTab === 'all') return true;
    return room.room_type === activeTab;
  });

  const handleStartDirectChat = async (otherUserId) => {
    const room = await createDirectRoom(otherUserId);
    if (room) {
      setCurrentRoom(room);
      setShowUserSelector(false);
    }
  };

  const handleStartCall = (otherUserId, callType) => {
    // In a real implementation, you would initialize WebRTC here
    console.log(`Starting ${callType} call with user:`, otherUserId);
    setActiveCall({
      type: callType,
      isIncoming: false,
      callerInfo: { display_name: 'Test User' }
    });
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

  const getTabContent = (type) => {
    const configs = {
      all: { icon: MessageSquare, label: 'All Chats' },
      direct: { icon: MessageSquare, label: 'Direct' },
      group: { icon: Users, label: 'Groups' },
      live_marketing: { icon: Megaphone, label: 'Marketing' },
      live_study: { icon: BookOpen, label: 'Study' },
      live_podcast: { icon: Mic, label: 'Podcasts' },
      live_training: { icon: GraduationCap, label: 'Training' },
      live_conference: { icon: Video, label: 'Conference' },
    };
    return configs[type] || configs.all;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">Welcome to Chatapp</h2>
              <p className="text-muted-foreground mb-4">
                Please log in to access the chat features and connect with the community.
              </p>
              <Button onClick={() => window.location.href = '/login'}>
                Log In to Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundImage: 'linear-gradient(to bottom right, #b19cd920, #f8fafc, #b19cd910)' }}>
      <div className="container mx-auto p-4 h-screen max-h-screen flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">Chatapp</h1>
              <p className="text-muted-foreground">
                Connect, collaborate, and grow together in our farming community
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowUserSelector(!showUserSelector)} 
                variant="outline" 
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Direct Chat
              </Button>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Room
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
          {/* Sidebar - Room List */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat Rooms
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  {/* Beautiful Tab Row */}
                  <div className="flex gap-2 mb-4">
                    {[
                      { type: 'all', label: 'All Chats', icon: MessageSquare, color: '#3B82F6' }, // Blue
                      { type: 'group', label: 'Groups', icon: Users, color: '#10B981' }, // Green
                      { type: 'live_marketing', label: 'Marketing', icon: Megaphone, color: '#8B5CF6' }, // Purple
                      { type: 'live_study', label: 'Study', icon: BookOpen, color: '#F59E0B' } // Orange
                    ].map(({ type, label, icon: Icon, color }) => (
                      <button
                        key={type}
                        onClick={() => setActiveTab(type)}
                        style={{
                          backgroundColor: activeTab === type ? color + '20' : color + '10',
                          borderColor: activeTab === type ? color : '#e5e7eb',
                          color: activeTab === type ? color : '#6b7280'
                        }}
                        className="relative flex-1 p-3 rounded-xl transition-all duration-300 border-2 hover:scale-105 hover:shadow-lg group"
                      >
                        <div className="flex flex-col items-center space-y-1">
                          <div className="p-2 rounded-lg bg-white/20">
                            <Icon 
                              className="h-4 w-4 transition-all duration-300" 
                              style={{ color: activeTab === type ? color : '#6b7280' }}
                            />
                          </div>
                          <span 
                            className="text-xs font-medium transition-all duration-300"
                            style={{ color: activeTab === type ? color : '#6b7280' }}
                          >
                            {label}
                          </span>
                        </div>
                        {activeTab === type && (
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 pointer-events-none" />
                        )}
                      </button>
                    ))}
                  </div>
                  
                  <TabsContent value={activeTab} className="flex-1 min-h-0 mt-0">
                    <ScrollArea className="h-full pr-4">
                      <div className="space-y-3 pb-4">
                        {filteredRooms.map((room) => (
                          <ChatRoomCard
                            key={room.id}
                            room={room}
                            isActive={currentRoom?.id === room.id}
                            onClick={setCurrentRoom}
                            participantCount={participants.length}
                          />
                        ))}
                        {filteredRooms.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm">No rooms found</p>
                            <Button 
                              onClick={() => setShowCreateModal(true)}
                              style={{ background: 'linear-gradient(to right, #EC4899, #DC2626)' }}
                              className="mt-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create your first room
                            </Button>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* User Selector */}
          {showUserSelector && (
            <div className="lg:col-span-1">
              <UserSelector
                onStartDirectChat={handleStartDirectChat}
                onStartCall={handleStartCall}
              />
            </div>
          )}

          {/* Main Chat Area */}
          <div className={`${showUserSelector ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {currentRoom ? (
              <Card className="h-full flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {currentRoom.name}
                        <Badge variant="secondary">
                          {currentRoom.room_type.replace('_', ' ')}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {currentRoom.room_type === 'direct' 
                          ? 'Direct Message' 
                          : `${participants.length} participants${currentRoom.category ? ` • ${currentRoom.category}` : ''}`
                        }
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowInviteModal(true)}
                        className="gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        Invite
                      </Button>
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <VideoIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                  {/* Messages Area */}
                  <ScrollArea className="flex-1 p-4">
                    {loading ? (
                      <div className="text-center py-4">Loading messages...</div>
                    ) : messages.length > 0 ? (
                      <div className="space-y-1">
                        {messages.map((message) => (
                          <ChatMessage
                            key={message.id}
                            message={message}
                            isOwn={message.sender_id === user.id}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="border-t p-4">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Button variant="outline" size="sm" type="button">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1"
                      />
                      <Button type="submit" disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent>
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Welcome to Chatapp</h3>
                    <p className="text-muted-foreground mb-4">
                      Select a chat room to start messaging or create a new one to begin your conversation.
                    </p>
                    <Button 
                      onClick={() => setShowCreateModal(true)}
                      style={{ background: 'linear-gradient(to right, #10B981, #14B8A6)' }}
                      className="text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Room
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Create Room Modal */}
        <CreateRoomModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateRoom={createRoom}
        />

        {/* Invite Modal */}
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          room={currentRoom}
          currentParticipants={participants}
        />

        {/* Call Interface */}
        {activeCall && (
          <CallInterface
            callType={activeCall.type}
            isIncoming={activeCall.isIncoming}
            callerInfo={activeCall.callerInfo}
            onAccept={() => console.log('Call accepted')}
            onDecline={() => setActiveCall(null)}
            onEnd={handleEndCall}
            onToggleVideo={() => console.log('Toggle video')}
            onToggleMic={() => console.log('Toggle mic')}
          />
        )}
      </div>
    </div>
  );
};

export default ChatappPage;