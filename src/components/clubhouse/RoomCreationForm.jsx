import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { 
  Crown, 
  Users, 
  UserPlus, 
  Play,
  Save,
  DollarSign,
  MessageSquare,
  Camera,
  FileText,
  Mic
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

export function RoomCreationForm({ onRoomCreated }) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [liveTopic, setLiveTopic] = useState('')
  const [sessionType, setSessionType] = useState('free')
  const [entryFee, setEntryFee] = useState(0)
  const [hostSlot, setHostSlot] = useState(null)
  const [coHostSlot, setCoHostSlot] = useState(null)
  const [inviteSlots, setInviteSlots] = useState(Array(8).fill(null))
  const [messages] = useState([
    'messages show here (guests name and icon image also show) - this is the queueing line',
    'messages show here (guests name and icon image also show) - this is the queueing line',
    'messages show here (guests name and icon image also show) - this is the queueing line',
    'messages show here (guests name and icon image also show) - this is the queueing line',
    'messages show here (guests name and icon image also show) - this is the queueing line',
    'messages show here (guests name and icon image also show) - this is the queueing line',
    'messages show here (guests name and icon image also show) - this is the queueing line',
  ])

  const SlotCard = ({ title, user, onClick, className = '' }) => (
    <Card 
      className={`h-32 cursor-pointer hover:bg-gray-50 transition-colors border-2 ${className}`}
      onClick={onClick}
    >
      <CardContent className="p-4 h-full flex flex-col items-center justify-center">
        {user ? (
          <>
            <Avatar className="w-12 h-12 mb-2">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-center">{user.name}</span>
          </>
        ) : (
          <>
            <UserPlus className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500 text-center">{title}</span>
          </>
        )}
      </CardContent>
    </Card>
  )

  const handleSlotClick = (slotType, index = null) => {
    // For now, just add a placeholder user
    const placeholderUser = { name: 'User ' + Math.random().toString(36).substr(2, 5), avatar: null }
    
    if (slotType === 'host') {
      setHostSlot(hostSlot ? null : placeholderUser)
    } else if (slotType === 'cohost') {
      setCoHostSlot(coHostSlot ? null : placeholderUser)
    } else if (slotType === 'invite' && index !== null) {
      const newSlots = [...inviteSlots]
      newSlots[index] = newSlots[index] ? null : placeholderUser
      setInviteSlots(newSlots)
    }
  }

  const saveRoom = async () => {
    if (!liveTopic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a live topic",
        variant: "destructive"
      })
      return
    }

    try {
      const roomData = {
        name: liveTopic.trim(),
        type: 'clubhouse',
        session_type: sessionType,
        entry_fee: sessionType === 'paid' ? entryFee : 0,
        host_user: hostSlot,
        co_host_user: coHostSlot,
        invite_slots: inviteSlots,
        is_active: false,
        creator_id: user.id
      }

      const { data, error } = await supabase
        .from('rooms')
        .insert(roomData)
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Room saved!",
        description: `${liveTopic} has been configured successfully`,
      })

      onRoomCreated?.(data)
    } catch (error) {
      console.error('Error saving room:', error)
      toast({
        title: "Error",
        description: "Failed to save room configuration",
        variant: "destructive"
      })
    }
  }

  const goLive = async () => {
    await saveRoom()
    
    const sessionData = {
      name: liveTopic.trim(),
      type: 'clubhouse',
      session_type: sessionType,
      entry_fee: sessionType === 'paid' ? entryFee : 0,
      creator_name: user?.email || 'Host',
      is_active: true,
      host_user: hostSlot,
      co_host_user: coHostSlot,
      invite_slots: inviteSlots
    }
    
    onRoomCreated?.(sessionData)
    
    toast({
      title: "Going Live!",
      description: "Your clubhouse session is now live",
    })
  }

  return (
    <div className="min-h-screen bg-white p-6">
      
      {/* Header with Live Topic */}
      <div className="mb-8 text-center">
        <div className="mb-4">
          <Label className="text-2xl font-bold text-gray-800">live: topic</Label>
        </div>
        <Input
          value={liveTopic}
          onChange={(e) => setLiveTopic(e.target.value)}
          placeholder="Enter your live topic here..."
          className="text-xl text-center font-semibold h-14 max-w-2xl mx-auto"
        />
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Session Layout - Left Side */}
        <div className="lg:col-span-3">
          
          {/* Host and Co-host Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SlotCard
              title="host"
              user={hostSlot}
              onClick={() => handleSlotClick('host')}
              className="border-yellow-300 bg-yellow-50"
            />
            <SlotCard
              title="co-host"
              user={coHostSlot}
              onClick={() => handleSlotClick('cohost')}
              className="border-blue-300 bg-blue-50"
            />
          </div>

          {/* Invite/Request Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {inviteSlots.map((slot, index) => (
              <SlotCard
                key={index}
                title="invite / request"
                user={slot}
                onClick={() => handleSlotClick('invite', index)}
                className="border-green-300 bg-green-50"
              />
            ))}
          </div>

          {/* Session Settings */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Label className="text-lg font-semibold">Session Type:</Label>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={sessionType === 'paid'} 
                      onCheckedChange={(checked) => setSessionType(checked ? 'paid' : 'free')}
                    />
                    <span className="font-medium">
                      {sessionType === 'free' ? 'Free Session' : 'Paid Session'}
                    </span>
                  </div>
                </div>
                
                {sessionType === 'paid' && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <Input
                      type="number"
                      value={entryFee}
                      onChange={(e) => setEntryFee(parseFloat(e.target.value) || 0)}
                      placeholder="Entry fee"
                      className="w-32"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  <span>Camera can be on/off for hosts, co-host or guest</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Documents shareable for studies</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  <span>Voice recordings in messages</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button onClick={saveRoom} variant="outline" size="lg" className="px-8">
              <Save className="w-5 h-5 mr-2" />
              Save Configuration
            </Button>
            <Button onClick={goLive} size="lg" className="px-8 bg-red-600 hover:bg-red-700">
              <Play className="w-5 h-5 mr-2" />
              Go Live
            </Button>
          </div>
        </div>

        {/* Messages Sidebar - Right Side */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5" />
                <h3 className="font-semibold">Messages & Queue</h3>
              </div>
              
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded text-sm border-l-4 border-blue-400">
                      {message}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400 text-sm">
                <strong>Notes:</strong>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• Messages scroll as typed</li>
                  <li>• Voice recordings need approval</li>
                  <li>• Each section hoverable to assign users</li>
                  <li>• Complete form before going live</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}