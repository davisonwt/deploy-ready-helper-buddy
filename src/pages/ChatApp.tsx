import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Radio, 
  GraduationCap, 
  Search,
  Plus,
  LogIn
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ChatList } from '@/components/chat/ChatList';
import { LiveRadioTab } from '@/components/chat/LiveRadioTab';
import { PremiumRoomsTab } from '@/components/chat/PremiumRoomsTab';

const ChatApp = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <MessageSquare className="h-16 w-16 mx-auto text-emerald-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome to ChatApp
              </h2>
              <p className="text-gray-600">
                Please log in to access chats, live radio, and premium rooms.
              </p>
              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Log In to Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-emerald-900">ChatApp</h1>
              <p className="text-sm text-emerald-700">
                Connect, collaborate, and grow together
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search chats, rooms, or radio shows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-emerald-200 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Main Content - Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-emerald-200">
            <TabsTrigger 
              value="chats"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chats
            </TabsTrigger>
            <TabsTrigger 
              value="radio"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <Radio className="h-4 w-4 mr-2" />
              Live Radio
            </TabsTrigger>
            <TabsTrigger 
              value="premium"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Premium Rooms
            </TabsTrigger>
          </TabsList>

          {/* Chats Tab */}
          <TabsContent value="chats" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Your Conversations
              </h2>
              <Button 
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <ChatList searchQuery={searchQuery} />
            </ScrollArea>
          </TabsContent>

          {/* Live Radio Tab */}
          <TabsContent value="radio" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Live Radio Shows
              </h2>
              <Button 
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => window.location.href = '/radio-slot-application'}
              >
                <Plus className="h-4 w-4 mr-2" />
                Apply for Slot
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <LiveRadioTab searchQuery={searchQuery} />
            </ScrollArea>
          </TabsContent>

          {/* Premium Rooms Tab */}
          <TabsContent value="premium" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Premium Rooms & Courses
              </h2>
              <Button 
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => window.location.href = '/create-premium-room'}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Room
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <PremiumRoomsTab searchQuery={searchQuery} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChatApp;
