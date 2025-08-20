import { useState } from 'react';
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
import { useChat } from '@/hooks/useChat.jsx';
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
        <Card className="w-96 bg-white/10 backdrop-blur-md border-white/20">
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
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed" 
      style={{ 
        backgroundImage: 'url(/chatapp-background.jpg)',
        minHeight: '100vh'
      }}
    >
      <div className="container mx-auto p-4 h-screen max-h-screen flex flex-col pb-20">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-6 p-8 rounded-2xl border border-white/20 shadow-2xl bg-white/10 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 px-8 py-4 rounded-lg" style={{ 
                color: '#3B82F6', 
                textShadow: '2px 2px 4px #1D4ED8'
              }}>Chatapp</h1>
              <p style={{ color: '#b0e0e6' }}>
                Connect, collaborate, and grow together in our farming community
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowUserSelector(!showUserSelector)} 
                style={{ backgroundColor: '#60A5FA', color: 'white', borderColor: '#60A5FA' }}
                className="gap-2 hover:shadow-lg transition-all duration-300"
              >
                <MessageSquare className="h-4 w-4" />
                Direct Chat
              </Button>
              <Button 
                onClick={() => setShowCreateModal(true)} 
                style={{ backgroundColor: '#1D4ED8', color: 'white' }}
                className="gap-2 hover:shadow-lg transition-all duration-300"
              >
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
            <Card className="h-full flex flex-col bg-white/10 backdrop-blur-md border-white/20">
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
                      { type: 'all', label: 'All Chats', icon: MessageSquare, activeColor: 'rgba(59, 130, 246, 0.3)', inactiveColor: 'rgba(59, 130, 246, 0.1)' }, // Blue
                      { type: 'group', label: 'Groups', icon: Users, activeColor: 'rgba(34, 197, 94, 0.3)', inactiveColor: 'rgba(34, 197, 94, 0.1)' }, // Green
                      { type: 'live_marketing', label: 'Marketing', icon: Megaphone, activeColor: 'rgba(168, 85, 247, 0.3)', inactiveColor: 'rgba(168, 85, 247, 0.1)' }, // Purple
                      { type: 'live_study', label: 'Study', icon: BookOpen, activeColor: 'rgba(249, 115, 22, 0.3)', inactiveColor: 'rgba(249, 115, 22, 0.1)' } // Orange
                    ].map(({ type, label, icon: Icon, activeColor, inactiveColor }) => (
                      <button
                        key={type}
                        onClick={() => setActiveTab(type)}
                        style={{
                          backgroundColor: activeTab === type ? activeColor : inactiveColor,
                          backdropFilter: 'blur(8px)'
                        }}
                        className="relative flex-1 p-3 rounded-xl transition-all duration-300 border-2 hover:scale-105 hover:shadow-lg group border-white/30"
                      >
                        <div className="flex flex-col items-center space-y-1">
                          <div className={`p-2 rounded-lg ${activeTab === type ? 'bg-white/30' : 'bg-white/10'}`}>
                            <Icon 
                              className="h-4 w-4 transition-all duration-300 text-white drop-shadow-lg" 
                            />
                          </div>
                          <span 
                            className="text-xs font-bold text-white transition-all duration-300"
                            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                          >
                            {label}
                          </span>
                        </div>
                        {activeTab === type && (
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-white/5 pointer-events-none" />
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
                          <div className="text-center py-8">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-white drop-shadow-lg" />
                            <p className="text-sm text-white font-semibold mb-4 px-3 py-2 rounded-lg bg-black/40 backdrop-blur-sm" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>No rooms found</p>
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
              <Card className="h-full flex flex-col bg-white/10 backdrop-blur-md border-white/20">
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
              <Card className="h-full flex items-center justify-center bg-white/10 backdrop-blur-md border-white/20">
                <CardContent>
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 text-white drop-shadow-lg" />
                    <h3 className="text-lg font-semibold mb-2 text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>Welcome to Chatapp</h3>
                    <p className="text-white mb-4 px-4 py-2 rounded-lg bg-black/30 backdrop-blur-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
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