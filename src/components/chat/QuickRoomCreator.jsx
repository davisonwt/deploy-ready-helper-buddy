import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Users, 
  Megaphone, 
  BookOpen,
  Mic,
  GraduationCap,
  Video,
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

const QUICK_ROOM_TYPES = [
  { 
    value: 'group', 
    label: 'Group Chat', 
    icon: MessageSquare, 
    description: 'Casual conversation with friends',
    color: 'bg-blue-50 border-blue-200'
  },
  { 
    value: 'live_marketing', 
    label: 'Live Marketing', 
    icon: Megaphone, 
    description: 'Share and promote your business',
    color: 'bg-purple-50 border-purple-200'
  },
  { 
    value: 'live_study', 
    label: 'Study Session', 
    icon: BookOpen, 
    description: 'Learn together with others',
    color: 'bg-green-50 border-green-200'
  },
  { 
    value: 'live_podcast', 
    label: 'Live Podcast', 
    icon: Mic, 
    description: 'Host your own show',
    color: 'bg-orange-50 border-orange-200'
  },
  { 
    value: 'live_training', 
    label: 'Training Session', 
    icon: GraduationCap, 
    description: 'Teach skills and knowledge',
    color: 'bg-indigo-50 border-indigo-200'
  },
  { 
    value: 'live_conference', 
    label: 'Conference Call', 
    icon: Video, 
    description: 'Professional meetings and calls',
    color: 'bg-gray-50 border-gray-200'
  }
];

export function QuickRoomCreator({ onCreateRoom, onClose }) {
  const [step, setStep] = useState(1); // 1: Choose Type, 2: Room Details, 3: Ready!
  const [selectedType, setSelectedType] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('50');
  const [isCreating, setIsCreating] = useState(false);

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setStep(2);
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;
    
    setIsCreating(true);
    try {
      const roomData = {
        name: roomName.trim(),
        room_type: selectedType.value,
        max_participants: parseInt(maxParticipants),
        description: selectedType.description,
        category: selectedType.label
      };
      
      await onCreateRoom(roomData);
      setStep(3);
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Step 1: Choose Room Type
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a Room</h1>
            <p className="text-gray-600">Choose the perfect type for your conversation</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {QUICK_ROOM_TYPES.map((type) => {
              const IconComponent = type.icon;
              return (
                <Card 
                  key={type.value}
                  className={`${type.color} cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-lg`}
                  onClick={() => handleTypeSelect(type)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-md">
                      <IconComponent className="h-8 w-8 text-gray-700" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">{type.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-gray-600 text-sm">{type.description}</p>
                    <Button className="mt-4 w-full" variant="outline">
                      Choose This Type
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center">
            <Button onClick={onClose} variant="outline" size="lg">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Room Details
  if (step === 2) {
    const IconComponent = selectedType.icon;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
              <IconComponent className="h-10 w-10 text-gray-700" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Setup Your {selectedType.label}</h1>
            <p className="text-gray-600">{selectedType.description}</p>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
            <CardContent className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Room Name
                </label>
                <Input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder={`My ${selectedType.label}`}
                  className="text-center text-lg py-3"
                  maxLength={50}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Maximum Participants
                </label>
                <Select value={maxParticipants} onValueChange={setMaxParticipants}>
                  <SelectTrigger className="text-center">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 people</SelectItem>
                    <SelectItem value="25">25 people</SelectItem>
                    <SelectItem value="50">50 people</SelectItem>
                    <SelectItem value="100">100 people</SelectItem>
                    <SelectItem value="250">250 people</SelectItem>
                    <SelectItem value="500">500 people</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Features Included:</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">💬 Live Chat</Badge>
                  <Badge variant="secondary">📞 Voice Calls</Badge>
                  <Badge variant="secondary">📹 Video Calls</Badge>
                  <Badge variant="secondary">📎 File Sharing</Badge>
                  <Badge variant="secondary">🔒 Secure & Private</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 mt-8">
            <Button onClick={() => setStep(1)} variant="outline" size="lg" className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={handleCreateRoom} 
              disabled={!roomName.trim() || isCreating}
              size="lg" 
              className="flex-1"
            >
              {isCreating ? (
                <>Creating...</>
              ) : (
                <>
                  Create Room
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Success
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Room Created! 🎉</h1>
          <p className="text-xl text-gray-600 mb-6">
            Your <strong>{selectedType.label}</strong> "{roomName}" is ready for conversations!
          </p>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm shadow-xl mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <selectedType.icon className="h-8 w-8 text-gray-600" />
              <h3 className="text-2xl font-bold text-gray-900">{roomName}</h3>
            </div>
            <div className="flex justify-center gap-4">
              <Badge variant="secondary" className="text-sm">
                Max {maxParticipants} participants
              </Badge>
              <Badge variant="secondary" className="text-sm">
                {selectedType.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Button onClick={onClose} size="lg" className="px-8">
          Start Chatting!
        </Button>
      </div>
    </div>
  );
}