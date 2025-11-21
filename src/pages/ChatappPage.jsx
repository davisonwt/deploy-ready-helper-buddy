import React, { useState, useEffect } from 'react';
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
  UserPlus,
  Sparkles,
  Radio
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat.jsx';
import { useCallManager } from '@/hooks/useCallManager';
import { useFileUpload } from '@/hooks/useFileUpload.jsx';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ChatRoomCard from '@/components/chat/ChatRoomCard';
import ChatMessage from '@/components/chat/ChatMessage';
import FileUploadArea from '@/components/chat/FileUploadArea';
import ChatFileManager from '@/components/chat/ChatFileManager';
import ChatInput from '@/components/chat/ChatInput';
import { RoomCreationForm } from '@/components/clubhouse/RoomCreationForm';
import { ClubhouseLiveSession } from '@/components/clubhouse/ClubhouseLiveSession';
import InviteModal from '@/components/chat/InviteModal';
import UserSelector from '@/components/chat/UserSelector';

import JitsiAudioCall from '@/components/jitsi/JitsiAudioCall';
import JitsiVideoCall from '@/components/jitsi/JitsiVideoCall';
import PublicRoomsBrowser from '@/components/chat/PublicRoomsBrowser';
import ChatModerationPanel from '@/components/chat/ChatModerationPanel';
import { UniversalLiveSessionInterface } from '@/components/live/UniversalLiveSessionInterface';
import { LiveSessionInterface } from '@/components/live/LiveSessionInterface';
import { ComprehensiveLiveSession } from '@/components/live/ComprehensiveLiveSession';
import PublicLiveSessionsBrowser from '@/components/live/PublicLiveSessionsBrowser';
import { QuickRoomCreator } from '@/components/chat/QuickRoomCreator';
import { UpcomingSessionsWidget } from '@/components/chat/UpcomingSessionsWidget';

const ChatappPage = () => {
  const { user } = useAuth();
  const { uploadFile, uploading } = useFileUpload();
  const { toast } = useToast();
  const {
    rooms,
    currentRoom,
    setCurrentRoom,
    messages,
    participants,
    loading,
    sendMessage,
    deleteMessage,
    createRoom,
    createDirectRoom,
    joinRoom,
    deleteConversation,
  } = useChat();

  // Advanced WebRTC call management
  const {
    currentCall,
    incomingCall,
    outgoingCall,
    startCall,
    answerCall,
    declineCall,
    endCall
  } = useCallManager();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuickCreator, setShowQuickCreator] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  // Remove old activeCall state - now using useCallManager
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeLiveSession, setActiveLiveSession] = useState(null);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !currentRoom) return;

    try {
      let fileData = null;
      
      // Upload file if selected
      if (selectedFile) {
        console.log('Uploading file:', selectedFile.name, selectedFile.type, selectedFile.size);
        const uploadResult = await uploadFile(selectedFile, 'chat-files', 'attachments/');
        console.log('Upload result:', uploadResult);
        
        if (uploadResult.success) {
          // Convert MIME type to enum value
          let fileType = 'document'; // default
          if (selectedFile.type.startsWith('image/')) {
            fileType = 'image';
          } else if (selectedFile.type.startsWith('video/')) {
            fileType = 'video';
          } else if (selectedFile.type.startsWith('audio/')) {
            fileType = 'audio';
          }
          
          fileData = {
            url: uploadResult.data.url,
            name: selectedFile.name,
            type: fileType, // Use enum value instead of MIME type
            size: selectedFile.size
          };
          console.log('File data for message:', fileData);
        } else {
          console.error('File upload failed:', uploadResult.error);
          return;
        }
      }

      console.log('Sending message with content:', newMessage.trim(), 'and file data:', fileData);
      await sendMessage(currentRoom.id, newMessage.trim(), 'text', fileData);
      setNewMessage('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleAttachmentClick = () => {
    document.getElementById('file-input').click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    document.getElementById('file-input').value = '';
  };

  const isDirect = (r) => {
    const count = r?.chat_participants?.length ?? 0;
    return r?.room_type === 'direct' || r?.room_type_detailed === 'direct' || (count > 0 && count <= 2);
  };

  const filteredRooms = rooms.filter(room => {
    if (activeTab === 'all') return true;
    if (activeTab === 'discover') return false; // Discover tab shows different content
    if (activeTab === 'oneOnOne') return isDirect(room);
    if (activeTab === 'group') return !isDirect(room);
    return true;
  });

  const handleStartDirectChat = async (otherUserId) => {
    const room = await createDirectRoom(otherUserId);
    if (room) {
      setCurrentRoom(room);
      setShowUserSelector(false);
    }
  };

  const handleStartCall = async (otherUserId, callType) => {
    console.log('🔥 Starting call with new system:', { otherUserId, callType });
    
    try {
      // Fetch user profile for display name
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, first_name, last_name, verification_status')
        .eq('user_id', otherUserId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        toast({
          title: "Error",
          description: "Could not start call - user not found",
          variant: "destructive",
        });
        return;
      }

      const receiverName = userProfile.display_name || 
                         `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() ||
                         'Unknown User';

      // Use new call manager
      await startCall(otherUserId, receiverName, callType, currentRoom?.id);
      
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Error",
        description: "Failed to start call",
        variant: "destructive",
      });
    }
  };

  const handleEndCall = async (callId) => {
    console.log('🔚 Ending call with new system:', callId);
    if (callId) {
      await endCall(callId);
    } else {
      // Fallback for any active call
      const activeCallId = currentCall?.id || outgoingCall?.id || incomingCall?.id;
      if (activeCallId) {
        await endCall(activeCallId);
      }
    }
  };

  const handleJoinPublicRoom = async (roomId) => {
    try {
      await joinRoom(roomId);
      // The room should now appear in user's room list
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  const handleNavigateToOrchard = (orchardId) => {
    window.location.href = `/orchard/${orchardId}`;
  };

  const startLiveSession = async (sessionData, sessionType = 'chat') => {
    try {
      // If it's from the public browser, set it directly
      if (sessionType && sessionData) {
        setActiveLiveSession(sessionData);
        
        toast({
          title: "Joining Live Session",
          description: `Joining ${sessionType === 'radio' ? 'radio show' : 'live session'}`,
        });
        return;
      }

      // Legacy chat room handling
      const room = sessionData;
      const liveSessionData = {
        id: `chat-${room.id}`,
        title: room.name,
        room_id: room.id,
        type: 'chat',
        created_by: room.created_by,
        status: 'live',
        started_at: new Date().toISOString()
      };
      
      setActiveLiveSession(liveSessionData);
      
      toast({
        title: "Live Session Started",
        description: `Started live session for ${room.name}`,
      });
    } catch (error) {
      console.error('Error starting live session:', error);
      toast({
        title: "Error",
        description: "Failed to start live session",
        variant: "destructive"
      });
    }
  };

  const endLiveSession = () => {
    setActiveLiveSession(null)
    toast({
      title: "Live Session Ended",
      description: "Live session has been ended",
    })
  }

  const handleStartLiveVideo = (room) => {
    startLiveSession(room);
  };

  // Old real-time listeners removed - now handled by useCallManager

  // Old call handlers removed - now using useCallManager

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

  // Render Jitsi-powered call interfaces
  // NOTE: Don't render Jitsi component for incoming calls - let IncomingCallOverlay handle it
  const activeCallData = currentCall || outgoingCall;
  if (activeCallData) {
    const CallComponent = activeCallData.type === 'video' ? JitsiVideoCall : JitsiAudioCall;
    const callerInfo = {
      display_name: activeCallData.caller_name || activeCallData.receiver_name || 'Unknown User',
      avatar_url: null
    };

    return (
      <CallComponent
        callSession={activeCallData}
        currentUserId={user?.id || ''}
        callerInfo={callerInfo}
        onEndCall={() => handleEndCall(activeCallData.id)}
      />
    );
  }

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
              <Button 
                onClick={() => window.location.href = '/login'}
                style={{ backgroundColor: '#1E40AF', borderColor: '#1E40AF' }}
                className="text-white hover:shadow-lg transition-all duration-300"
              >
                Log In to Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If there's an active live session, show the beautiful Clubhouse interface
  if (activeLiveSession) {
    // Use the new beautiful ClubhouseLiveSession for clubhouse type rooms
    if (activeLiveSession.type === 'clubhouse') {
      return (
        <ClubhouseLiveSession
          roomData={activeLiveSession}
          onLeave={endLiveSession}
        />
      )
    }
    
    // Use ComprehensiveLiveSession for other types (radio, etc.)
    return (
      <ComprehensiveLiveSession
        sessionData={activeLiveSession}
        sessionType={activeLiveSession.type || 'chat'}
        onEndSession={endLiveSession}
        onLeaveSession={endLiveSession}
      />
    )
  }

  return (
    <div 
      className="min-h-screen" 
      style={{ 
        backgroundColor: '#001f3f',
        minHeight: '100vh'
      }}
    >
      <div className="container mx-auto p-6 flex flex-col min-h-screen pb-24">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8 p-6 rounded-2xl border border-white/20 shadow-2xl bg-white/10 backdrop-blur-md">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2 px-4 py-2 rounded-lg leading-tight" style={{ 
                  color: '#3B82F6', 
                  textShadow: '2px 2px 4px #1D4ED8'
                }}>Chatapp</h1>
                <p className="text-xs font-medium mb-2 px-4" style={{ 
                  color: '#87CEEB',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                  fontStyle: 'italic'
                }}>
                  chat or chutapp
                </p>
                <p style={{ color: '#b0e0e6' }} className="px-4">
                  Connect, collaborate, and grow together in our 364yhvh / sow2grow community
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => {
                    console.log('🎯 Direct Chat button clicked!');
                    console.log('Current showUserSelector state:', showUserSelector);
                    setShowUserSelector(!showUserSelector);
                    console.log('New showUserSelector state:', !showUserSelector);
                  }} 
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

            {/* Upcoming Sessions Widget */}
            <UpcomingSessionsWidget onJoinSession={setCurrentRoom} />

            {/* Featured Actions - Radio & Premium Rooms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card 
                className="group cursor-pointer transition-all duration-300 bg-white/90 backdrop-blur-sm border-primary/20 hover:border-primary/40 hover:shadow-lg"
                onClick={() => window.location.href = '/apply-radio-slot'}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-base">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Radio className="h-5 w-5 text-primary" />
                    </div>
                    Apply for Radio Slot
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Host your own 2-hour live radio show with Grove Station. Upload content, set playlists, and broadcast live.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="group cursor-pointer transition-all duration-300 bg-white/90 backdrop-blur-sm border-primary/20 hover:border-primary/40 hover:shadow-lg"
                onClick={() => window.location.href = '/create-premium-room'}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-base">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    Create Premium Room
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Launch interactive sessions & courses with document sharing, playlists, and monetization options.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
          {/* Sidebar - Room List */}
          <div className="lg:col-span-1 h-full">
            <Card className="h-[calc(100vh-300px)] flex flex-col bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-white">
                  <MessageSquare className="h-5 w-5" />
                  My Rooms
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  {/* Beautiful Tab Row */}
                  <div className="flex gap-2 mb-4 pb-4 border-b border-white/20 overflow-x-auto">
                    {[
                      { type: 'all', label: 'All', icon: MessageSquare, activeColor: 'rgba(59, 130, 246, 0.3)', inactiveColor: 'rgba(59, 130, 246, 0.1)' },
                      { type: 'oneOnOne', label: 'One-on-Ones', icon: MessageSquare, activeColor: 'rgba(236, 72, 153, 0.3)', inactiveColor: 'rgba(236, 72, 153, 0.1)' },
                      { type: 'group', label: 'Grove Circles', icon: Users, activeColor: 'rgba(34, 197, 94, 0.3)', inactiveColor: 'rgba(34, 197, 94, 0.1)' },
                      { type: 'discover', label: 'Discover', icon: Sparkles, activeColor: 'rgba(168, 85, 247, 0.3)', inactiveColor: 'rgba(168, 85, 247, 0.1)' }
                    ].map(({ type, label, icon: Icon, activeColor, inactiveColor }) => (
                      <button
                        key={type}
                        onClick={() => setActiveTab(type)}
                        style={{
                          backgroundColor: activeTab === type ? activeColor : inactiveColor,
                          backdropFilter: 'blur(8px)'
                        }}
                        className="relative flex-1 p-2 rounded-xl transition-all duration-300 border-2 hover:scale-105 hover:shadow-lg group border-white/30 min-w-[70px]"
                      >
                        <div className="flex flex-col items-center space-y-1">
                          <div className={`p-1.5 rounded-lg ${activeTab === type ? 'bg-white/30' : 'bg-white/10'}`}>
                            <Icon 
                              className="h-3.5 w-3.5 transition-all duration-300 text-white drop-shadow-lg" 
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
                  
                  {/* Room Content */}
                  <TabsContent value={activeTab} className="flex-1 overflow-hidden mt-0">
                    {activeTab !== 'discover' ? (
                      <ScrollArea className="h-full">
                        {activeTab === 'oneOnOne' && (
                          <div className="mb-3">
                            <Button size="sm" onClick={() => setShowUserSelector(true)}>
                              Start Direct Chat
                            </Button>
                          </div>
                        )}
                        <div className="space-y-3 pr-3">
                          {filteredRooms.map((room) => (
                            <ChatRoomCard
                              key={room.id}
                              room={room}
                              isActive={currentRoom?.id === room.id}
                              onClick={setCurrentRoom}
                              participantCount={room.chat_participants?.length || 0}
                              showInviteButton={true}
                              currentUserId={user?.id}
                              onDeleteConversation={deleteConversation}
                              onStartLiveVideo={handleStartLiveVideo}
                            />
                          ))}
                          {filteredRooms.length === 0 && (
                            <div className="text-center py-8">
                              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-white drop-shadow-lg" />
                              <p className="text-sm text-white font-semibold mb-4 px-3 py-2 rounded-lg bg-black/40 backdrop-blur-sm" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                                {activeTab === 'group' ? 'No Grove Circles yet' : activeTab === 'oneOnOne' ? 'No one-on-one chats yet' : 'No rooms found'}
                              </p>
                              <Button 
                                onClick={() => setShowCreateModal(true)}
                                style={{ background: 'linear-gradient(to right, #3B82F6, #1D4ED8)', borderColor: '#3B82F6' }}
                                className="mt-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                {activeTab === 'group' ? 'Create your first Grove Circle' : 'Create your first room'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    ) : null}
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
          <div className={`${showUserSelector ? 'lg:col-span-1' : 'lg:col-span-2'} flex flex-col gap-4`}>
            {currentRoom && (
              <ChatModerationPanel 
                currentRoom={currentRoom} 
                currentUser={user} 
              />
            )}
            <div className="h-[calc(100vh-300px)]">
              {/* Chat Interface */}
            {currentRoom ? (
              <Card className="h-full flex flex-col bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader 
                  className="border-b border-purple-400/50 text-purple-900 pb-3 pt-3"
                  style={{ backgroundColor: '#D8B4FE' }}
                >
                  {console.log('Header rendering with currentRoom:', currentRoom)}
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-purple-900">
                        {currentRoom.name}
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-300">
                          {currentRoom.room_type.replace('_', ' ')}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-purple-700">
                        {currentRoom.room_type === 'direct' && participants.length <= 2
                          ? 'Direct Message' 
                          : `${participants.length} participants${currentRoom.category ? ` • ${currentRoom.category}` : ''}`
                        }
                      </p>
                      {/* Show participant list for rooms with 3+ people */}
                      {participants.length > 2 && (
                        <div className="mt-2">
                          <p className="text-xs text-purple-600 mb-1">Participants:</p>
                          <div className="flex flex-wrap gap-1">
                            {participants.map((participant) => (
                              <Badge 
                                key={participant.user_id} 
                                variant="outline" 
                                className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                              >
                                {participant.profiles?.display_name || 
                                 `${participant.profiles?.first_name || ''} ${participant.profiles?.last_name || ''}`.trim() ||
                                 'Unknown User'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowInviteModal(true)}
                        style={{ borderColor: '#93C5FD', color: '#1D4ED8', backgroundColor: 'transparent' }}
                        className="gap-2 hover:bg-blue-50"
                      >
                        <UserPlus className="h-4 w-4" />
                        Invite
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        style={{ borderColor: '#60A5FA', color: '#2563EB', backgroundColor: 'transparent' }}
                        className="hover:bg-blue-50"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        style={{ borderColor: '#3B82F6', color: '#1E40AF', backgroundColor: 'transparent' }}
                        className="hover:bg-blue-50"
                      >
                        <VideoIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  <div className="p-4 border-b">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="messages">Messages</TabsTrigger>
                      <TabsTrigger value="files">Files</TabsTrigger>
                      <TabsTrigger value="participants">People</TabsTrigger>
                      <TabsTrigger value="info">Info</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <TabsContent value="messages" className="h-full m-0">
                      {/* Messages Area */}
                      <div className="h-full flex flex-col">
                        <div className="flex-1 bg-white/90 backdrop-blur-md border border-white/30 shadow-lg m-4 rounded-lg overflow-hidden">
                          <ScrollArea className="h-full p-6">
                            {loading ? (
                              <div className="text-center py-4">
                                <span className="text-gray-800 font-medium">Loading messages...</span>
                              </div>
                            ) : messages.length > 0 ? (
                              <div className="space-y-1">
                              {messages.map((message) => (
                                <ChatMessage
                                  key={message.id}
                                  message={message}
                                  isOwn={message.sender_id === user.id}
                                  onDelete={deleteMessage}
                                />
                              ))}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                                <p className="text-gray-700 font-medium">No messages yet. Start the conversation!</p>
                              </div>
                            )}
                          </ScrollArea>
                        </div>

                         {/* Message Input */}
                        <div className="border-t p-4 space-y-3">
                          {/* File Upload Area */}
                          {selectedFile ? (
                            <FileUploadArea
                              selectedFile={selectedFile}
                              onRemoveFile={removeSelectedFile}
                              uploading={uploading}
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                type="button"
                                onClick={handleAttachmentClick}
                                disabled={uploading}
                                className="px-3"
                              >
                                <Paperclip className="h-4 w-4 mr-2" />
                                Attach File
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                Images, videos, audio, documents up to 10MB
                              </span>
                            </div>
                          )}
                          
                          {/* Hidden file input */}
                          <input
                            id="file-input"
                            type="file"
                            onChange={handleFileSelect}
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                            className="hidden"
                          />
                          
                          {/* Message input form */}
                          <form onSubmit={handleSendMessage} className="flex gap-2">
                            <Input
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Type your message..."
                              className="flex-1"
                              disabled={uploading}
                            />
                            <Button 
                              type="submit" 
                              disabled={(!newMessage.trim() && !selectedFile) || uploading}
                              className="px-4"
                            >
                              {uploading ? (
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span className="text-xs">Uploading...</span>
                                </div>
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </form>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="files" className="h-full m-0 p-4">
                      <ChatFileManager roomId={currentRoom?.id} />
                    </TabsContent>
                    
                    <TabsContent value="participants" className="h-full m-0 p-4">
                      {/* ... keep existing participants content */}
                    </TabsContent>
                    
                    <TabsContent value="info" className="h-full m-0 p-4">
                      {/* ... keep existing room info content */}  
                    </TabsContent>
                  </div>
                </Tabs>
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
                      style={{ background: 'linear-gradient(to right, #3B82F6, #1D4ED8)', borderColor: '#3B82F6' }}
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
        </div>

        {/* Clubhouse Room Creation */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 to-black rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-black p-6 rounded-t-3xl border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                    Create Your Live Session Room
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                    className="text-white hover:bg-white/10"
                  >
                    ✕
                  </Button>
                </div>
              </div>
              <RoomCreationForm 
                onRoomCreated={(roomData) => {
                  setShowCreateModal(false);
                  // If this is a live session start (has is_active: true), show the ClubhouseLiveSession
                  if (roomData && roomData.is_active) {
                    setActiveLiveSession(roomData);
                  }
                }}
                onClose={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        )}

        {/* Invite Modal */}
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          room={currentRoom}
          currentParticipants={participants}
        />

        {/* Call Interface - Now handled by the activeCallData render at the top */}
        {/* Old call interface removed - now using new call manager system */}
      </div>
    </div>
  );
};

export default ChatappPage;