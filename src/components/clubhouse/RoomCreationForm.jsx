import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
  Mic,
  X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

export function RoomCreationForm({ onRoomCreated, onClose }) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Layout configurations
  const layouts = {
    standard: {
      name: 'Standard Discussion',
      description: '8 visible boxes: 1 Host + 1 Co-host + 6 Audience (Unlimited guests in chat/queue)',
      hostSlots: 1,
      coHostSlots: 1,
      inviteSlots: 6,
      grid: 'grid-cols-4',
      icon: Users,
      color: 'bg-blue-50 border-blue-200'
    },
    panel: {
      name: 'Panel Discussion',
      description: '8 visible boxes: 1 Host + 3 Panelists + 4 Audience (Unlimited guests in chat/queue)',
      hostSlots: 1,
      coHostSlots: 3,
      inviteSlots: 4,
      grid: 'grid-cols-3',
      icon: Crown, 
      color: 'bg-purple-50 border-purple-200'
    },
    interview: {
      name: 'Interview Style',
      description: '8 visible boxes: 1 Host + 1 Guest + 2 Co-hosts + 4 Audience (Unlimited guests in chat/queue)',
      hostSlots: 1,
      coHostSlots: 3, // Guest + 2 co-hosts
      inviteSlots: 4,
      grid: 'grid-cols-4',
      icon: Mic,
      color: 'bg-green-50 border-green-200'
    },
    townhall: {
      name: 'Town Hall',
      description: '8 visible boxes: 1 Host + 2 Moderators + 5 Audience (Unlimited guests in chat/queue)',
      hostSlots: 1,
      coHostSlots: 2,
      inviteSlots: 5,
      grid: 'grid-cols-4',
      icon: Users,
      color: 'bg-yellow-50 border-yellow-200'
    },
    intimate: {
      name: 'Intimate Circle',
      description: '8 visible boxes: 1 Host + 7 Participants (Unlimited guests in chat/queue)',
      hostSlots: 1,
      coHostSlots: 0,
      inviteSlots: 7,
      grid: 'grid-cols-4',
      icon: Crown,
      color: 'bg-pink-50 border-pink-200'
    },
    large: {
      name: 'Large Audience',
      description: '8 visible boxes: 1 Host + 1 Co-host + 6 Audience (Unlimited guests in chat/queue)',
      hostSlots: 1,
      coHostSlots: 1,
      inviteSlots: 6,
      grid: 'grid-cols-4',
      icon: Users,
      color: 'bg-indigo-50 border-indigo-200'
    }
  }
  
  const [currentStep, setCurrentStep] = useState('layout') // 'layout', 'gifting', 'form'
  const [selectedLayout, setSelectedLayout] = useState('')
  const [liveTopic, setLiveTopic] = useState('')
  const [sessionType, setSessionType] = useState('free')
  const [entryFee, setEntryFee] = useState(0)
  const [hostSlot, setHostSlot] = useState(null)
  const [coHostSlots, setCoHostSlots] = useState([])
  const [inviteSlots, setInviteSlots] = useState([])
  
  // Gifting configuration state
  const [giftingEnabled, setGiftingEnabled] = useState(true)
  const [minGiftAmount, setMinGiftAmount] = useState(1)
  const [maxGiftAmount, setMaxGiftAmount] = useState(100)
  const [allowedRecipients, setAllowedRecipients] = useState(['host', 'cohosts'])
  
  // Initialize slots when layout changes
  useEffect(() => {
    if (selectedLayout && layouts[selectedLayout]) {
      const layout = layouts[selectedLayout]
      setCoHostSlots(Array(layout.coHostSlots).fill(null))
      setInviteSlots(Array(layout.inviteSlots).fill(null))
    }
  }, [selectedLayout])

  const handleLayoutSelect = (layoutKey) => {
    console.log('🔍 Layout selected:', layoutKey)
    setSelectedLayout(layoutKey)
    console.log('🔍 Setting step to gifting')
    setCurrentStep('gifting')
  }

  const SlotCard = ({ title, user, onClick, className = '' }) => (
    <Card 
      className={`cursor-pointer hover:bg-gray-50 transition-colors border-2 ${className}`}
      onClick={onClick}
    >
      <CardContent className="p-3 h-full flex flex-col items-center justify-center">
        {user ? (
          <>
            <Avatar className="w-8 h-8 mb-2">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-center">{user.name}</span>
          </>
        ) : (
          <>
            <UserPlus className="w-6 h-6 text-gray-400 mb-2" />
            <span className="text-xs text-gray-500 text-center">{title}</span>
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
    } else if (slotType === 'cohost' && index !== null) {
      const newSlots = [...coHostSlots]
      newSlots[index] = newSlots[index] ? null : placeholderUser
      setCoHostSlots(newSlots)
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
        layout: selectedLayout,
        host_user: hostSlot,
        co_host_users: coHostSlots,
        invite_slots: inviteSlots,
        is_active: false,
        creator_id: user.id,
        // Gifting configuration
        gifting_enabled: giftingEnabled,
        min_gift_amount: minGiftAmount,
        max_gift_amount: maxGiftAmount,
        allowed_recipients: allowedRecipients
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
    if (!liveTopic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a live topic",
        variant: "destructive"
      })
      return
    }
    
    // Automatically set current user as host
    const currentUserAsHost = {
      id: user.id,
      name: user.email || 'Host',
      email: user.email,
      avatar: user.avatar_url || null
    }

    const sessionData = {
      name: liveTopic.trim(),
      type: 'clubhouse',
      session_type: sessionType,
      entry_fee: sessionType === 'paid' ? entryFee : 0,
      layout: selectedLayout,
      creator_name: user?.email || 'Host',
      is_active: true,
      host_user: currentUserAsHost, // Automatically set current user as host
      co_host_users: coHostSlots,
      invite_slots: inviteSlots,
      creator_id: user.id,
      // Gifting configuration
      gifting_enabled: giftingEnabled,
      min_gift_amount: minGiftAmount,
      max_gift_amount: maxGiftAmount,
      allowed_recipients: allowedRecipients
    }
    
    // Save to database first
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert(sessionData)
        .select()
        .single()

      if (error) throw error

      onRoomCreated?.(data)
      
      toast({
        title: "🚀 Going Live!",
        description: "Your clubhouse session is now live as the host",
      })
    } catch (error) {
      console.error('Error going live:', error)
      toast({
        title: "Error",
        description: "Failed to start live session",
        variant: "destructive"
      })
    }
  }

  console.log('🔍 RoomCreationForm render - currentStep:', currentStep, 'selectedLayout:', selectedLayout)

  // Gifting Configuration Step
  if (currentStep === 'gifting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col rounded-3xl m-4 shadow-2xl">
        
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-md border-b border-white/20 px-6 py-4 flex-shrink-0 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Configure Gifting</h1>
            <Button variant="ghost" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-gray-600 mt-2">Set up listener gifting options for hosts and co-hosts</p>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-6xl mx-auto pb-4">
            
            {/* All sections side by side */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              
              {/* Enable Gifting Toggle */}
              <Card className="bg-white/80 backdrop-blur-sm flex-1">
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Enable Listener Gifting</h3>
                  <div className="flex items-center justify-center mb-3">
                    <Switch
                      checked={giftingEnabled}
                      onCheckedChange={setGiftingEnabled}
                    />
                  </div>
                  <p className="text-xs text-gray-600 text-center">
                    Allow listeners to send gifts during live session
                  </p>
                </CardContent>
              </Card>

              {/* Gift Amount Limits */}
              <Card className={`backdrop-blur-sm flex-1 ${giftingEnabled ? 'bg-white/80' : 'bg-gray-100/80'}`}>
                <CardContent className="p-4">
                  <h3 className={`text-lg font-semibold mb-3 ${giftingEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                    Gift Amount Limits
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="minGift" className="text-sm">Minimum ($USDC)</Label>
                      <Input
                        id="minGift"
                        type="number"
                        min="0.1"
                        max="50"
                        step="0.1"
                        value={minGiftAmount}
                        onChange={(e) => setMinGiftAmount(parseFloat(e.target.value) || 1)}
                        className="mt-1"
                        disabled={!giftingEnabled}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxGift" className="text-sm">Maximum ($USDC)</Label>
                      <Input
                        id="maxGift"
                        type="number"
                        min="1"
                        max="1000"
                        step="1"
                        value={maxGiftAmount}
                        onChange={(e) => setMaxGiftAmount(parseFloat(e.target.value) || 100)}
                        className="mt-1"
                        disabled={!giftingEnabled}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Allowed Recipients */}
              <Card className={`backdrop-blur-sm flex-1 ${giftingEnabled ? 'bg-white/80' : 'bg-gray-100/80'}`}>
                <CardContent className="p-4">
                  <h3 className={`text-lg font-semibold mb-3 ${giftingEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                    Who Can Receive Gifts?
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="host-gifts"
                        checked={allowedRecipients.includes('host')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAllowedRecipients(prev => [...prev, 'host'])
                          } else {
                            setAllowedRecipients(prev => prev.filter(r => r !== 'host'))
                          }
                        }}
                        disabled={!giftingEnabled}
                      />
                      <Label htmlFor="host-gifts" className="flex items-center gap-2 text-sm">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        Host
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="cohost-gifts"
                        checked={allowedRecipients.includes('cohosts')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAllowedRecipients(prev => [...prev, 'cohosts'])
                          } else {
                            setAllowedRecipients(prev => prev.filter(r => r !== 'cohosts'))
                          }
                        }}
                        disabled={!giftingEnabled}
                      />
                      <Label htmlFor="cohost-gifts" className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-blue-600" />
                        Co-hosts
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gift Preview */}
              <Card className={`border-purple-200 flex-1 ${giftingEnabled ? 'bg-gradient-to-r from-purple-50 to-pink-50' : 'bg-gray-100/80'}`}>
                <CardContent className="p-4">
                  <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${giftingEnabled ? 'text-purple-900' : 'text-gray-500'}`}>
                    <DollarSign className="w-4 h-4" />
                    Preview
                  </h3>
                  <div className={`rounded-lg p-3 space-y-2 ${giftingEnabled ? 'bg-white/80' : 'bg-gray-200/50'}`}>
                    <p className={`text-sm ${giftingEnabled ? 'text-gray-700' : 'text-gray-500'}`}>
                      <strong>Range:</strong> ${minGiftAmount} - ${maxGiftAmount}
                    </p>
                    <p className={`text-sm ${giftingEnabled ? 'text-gray-700' : 'text-gray-500'}`}>
                      <strong>Recipients:</strong> {giftingEnabled && allowedRecipients.length > 0 ? allowedRecipients.join(', ') : 'None'}
                    </p>
                    <p className={`text-xs ${giftingEnabled ? 'text-gray-500' : 'text-gray-400'}`}>
                      {giftingEnabled ? 'Gift buttons will appear during live session' : 'Enable gifting to configure'}
                    </p>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>

        {/* Footer Actions - Fixed at bottom */}
        <div className="bg-white/90 backdrop-blur-md border-t border-white/20 px-6 py-4 flex-shrink-0 rounded-b-3xl sticky bottom-0">
          <div className="flex justify-between gap-4 max-w-2xl mx-auto">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('layout')}
              className="flex-1"
            >
              ← Back to Layout
            </Button>
            <Button 
              onClick={() => setCurrentStep('form')}
              className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
            >
              Continue to Room Setup →
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Layout Selection Step
  if (currentStep === 'layout') {
    return (
      <div className="h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col rounded-3xl m-4 overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-md border-b border-white/20 px-6 py-4 flex-shrink-0 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Choose Your Clubhouse Layout</h1>
            <Button variant="ghost" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-gray-600 mt-2">Select the perfect layout for your live session</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Object.entries(layouts).map(([key, layout]) => {
                const IconComponent = layout.icon
                
                // Color schemes with inline styles for hex colors with transparency
                const colorSchemes = {
                  standard: {
                    bg: '#D5AAFF', // Light Purple with transparency
                    text: '#2A2A2A', // Dark Gray
                    buttonBg: '#FFE156', // Bright Yellow
                    buttonText: '#2A2A2A',
                    opacity: 0.85
                  },
                  panel: {
                    bg: '#E0BBE4', // Lavender with transparency
                    text: '#2A2A2A', // Dark Gray
                    buttonBg: '#957DAD', // Dusty Purple
                    buttonText: '#FFFFFF',
                    opacity: 0.85
                  },
                  interview: {
                    bg: '#957DAD', // Dusty Purple with transparency
                    text: '#FFFFFF', // White text for dark background
                    buttonBg: '#FFE156', // Bright Yellow
                    buttonText: '#2A2A2A',
                    opacity: 0.9
                  },
                  townhall: {
                    bg: '#B9FBC0', // Mint Green with transparency
                    text: '#2A2A2A', // Dark Gray
                    buttonBg: '#957DAD', // Dusty Purple
                    buttonText: '#FFFFFF',
                    opacity: 0.85
                  },
                  intimate: {
                    bg: '#FFE156', // Bright Yellow with transparency
                    text: '#2A2A2A', // Dark Gray
                    buttonBg: '#957DAD', // Dusty Purple
                    buttonText: '#FFFFFF',
                    opacity: 0.85
                  },
                  large: {
                    bg: '#FFB7B7', // Soft Peach with transparency
                    text: '#2A2A2A', // Dark Gray
                    buttonBg: '#957DAD', // Dusty Purple
                    buttonText: '#FFFFFF',
                    opacity: 0.85
                  }
                }
                
                const colors = colorSchemes[key]
                
                return (
                  <Card 
                    key={key}
                    className="cursor-pointer hover:shadow-xl transition-all duration-200 border-2 hover:scale-[1.02] backdrop-blur-sm rounded-3xl"
                    style={{ 
                      backgroundColor: `${colors.bg}${Math.round(colors.opacity * 255).toString(16).padStart(2, '0')}`,
                      borderColor: colors.bg,
                      color: colors.text,
                      boxShadow: `0 8px 32px ${colors.bg}40`
                    }}
                    onClick={() => handleLayoutSelect(key)}
                  >
                    <CardContent className="p-6">
                      
                      {/* Header with Layout Name */}
                      <div className="text-center mb-4">
                        <IconComponent 
                          className="w-10 h-10 mx-auto mb-3" 
                          style={{ color: colors.text }}
                        />
                        <h3 
                          className="text-xl font-bold" 
                          style={{ color: colors.text }}
                        >
                          {layout.name}
                        </h3>
                      </div>
                      
                      {/* Layout Preview */}
                      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/70 shadow-sm">
                        <div className="flex gap-3 mb-3">
                          
                          {/* Speaking Area */}
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-gray-700 mb-3 text-center">SPEAKERS</div>
                            
                            {/* Host */}
                            <div className="flex justify-center mb-3">
                              <div className="bg-yellow-100 border border-yellow-300 rounded-xl px-3 py-2 text-center">
                                <Crown className="w-4 h-4 mx-auto mb-1 text-yellow-600" />
                                <div className="text-xs font-bold text-yellow-800">HOST</div>
                              </div>
                            </div>
                            
                            {/* Co-hosts/Panelists - Different layouts */}
                            {layout.coHostSlots > 0 && (
                              <div className="flex justify-center gap-2 mb-3">
                                {key === 'interview' ? (
                                  // Interview: 1 Guest + 2 Co-hosts
                                  <>
                                    <div className="bg-emerald-100 border border-emerald-300 rounded-xl px-2 py-1 text-center">
                                      <div className="text-xs font-bold text-emerald-800">GUEST</div>
                                    </div>
                                    {Array(2).fill(0).map((_, i) => (
                                      <div key={i} className="bg-blue-100 border border-blue-300 rounded-xl px-2 py-1 text-center">
                                        <div className="text-xs font-bold text-blue-800">CO</div>
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  // Other layouts: Regular co-hosts/panelists
                                  Array(Math.min(layout.coHostSlots, 4)).fill(0).map((_, i) => (
                                    <div key={i} className="bg-blue-100 border border-blue-300 rounded-xl px-2 py-1 text-center">
                                      <div className="text-xs font-bold text-blue-800">
                                        {key === 'panel' ? 'PAN' : 'CO'}
                                      </div>
                                    </div>
                                  ))
                                )}
                                {layout.coHostSlots > 4 && <span className="text-xs text-gray-500">+{layout.coHostSlots - 4}</span>}
                              </div>
                            )}
                            
                            {/* Audience grid - Proper arrangements */}
                            <div className={`grid gap-1 justify-center ${
                              layout.inviteSlots <= 4 ? 'grid-cols-2' : 
                              layout.inviteSlots <= 6 ? 'grid-cols-3' : 
                              'grid-cols-4'
                            } max-w-40 mx-auto`}>
                              {Array(Math.min(layout.inviteSlots, 8)).fill(0).map((_, i) => (
                                <div key={i} className="bg-green-100 border border-green-300 rounded-lg h-7 w-7 flex items-center justify-center">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                              ))}
                            </div>
                            {layout.inviteSlots > 8 && (
                              <div className="text-xs text-center text-gray-500 mt-1">+{layout.inviteSlots - 8} more</div>
                            )}
                            <div className="text-xs text-center text-gray-600 mt-2">
                              {layout.inviteSlots} audience can speak
                            </div>
                          </div>
                          
                          {/* Messages/Queue Area */}
                          <div className="w-1/3 bg-gray-50 rounded-xl border border-gray-200 p-2">
                            <div className="text-xs font-semibold text-gray-700 mb-2 text-center flex items-center justify-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              CHAT & QUEUE
                            </div>
                             <div className="space-y-1">
                               <div className="bg-white rounded-lg p-1 text-xs text-gray-600">Hi everyone! 👋</div>
                               <div className="bg-white rounded-lg p-1 text-xs text-gray-600">Can I join to speak?</div>
                               <div className="bg-orange-100 rounded-lg p-1 text-xs text-orange-700">🎤 Voice recording sent</div>
                               <div className="bg-yellow-100 rounded-lg p-1 text-xs text-yellow-700">⏳ Awaiting host approval</div>
                               <div className="bg-green-100 rounded-lg p-1 text-xs text-green-700">✅ Recording approved</div>
                               <div className="bg-blue-100 rounded-lg p-1 text-xs text-blue-700">🙋 In queue to speak</div>
                             </div>
                            <div className="text-xs text-center text-gray-500 mt-2">Unlimited listeners</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Description */}
                      <p 
                        className="text-sm text-center mb-4 leading-relaxed" 
                        style={{ color: colors.text }}
                      >
                        {layout.description}
                      </p>
                      
                      {/* Action Button */}
                      <Button 
                        className="w-full shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl"
                        style={{
                          backgroundColor: colors.buttonBg,
                          color: colors.buttonText,
                          border: 'none'
                        }}
                        onClick={() => handleLayoutSelect(key)}
                      >
                        Choose This Layout
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Form Step - SIMPLE AND WORKING
  if (currentStep === 'form') {
    const layout = layouts[selectedLayout]
    const colorSchemes = {
      standard: { bg: '#D5AAFF', text: '#1A1A1A', buttonBg: '#FFE156', buttonText: '#1A1A1A', cardText: '#1A1A1A' },
      panel: { bg: '#E0BBE4', text: '#1A1A1A', buttonBg: '#957DAD', buttonText: '#FFFFFF', cardText: '#1A1A1A' },
      interview: { bg: '#957DAD', text: '#FFFFFF', buttonBg: '#FFE156', buttonText: '#1A1A1A', cardText: '#1A1A1A' },
      townhall: { bg: '#B9FBC0', text: '#1A1A1A', buttonBg: '#957DAD', buttonText: '#FFFFFF', cardText: '#1A1A1A' },
      intimate: { bg: '#FFE156', text: '#1A1A1A', buttonBg: '#957DAD', buttonText: '#FFFFFF', cardText: '#1A1A1A' },
      large: { bg: '#FFB7B7', text: '#1A1A1A', buttonBg: '#957DAD', buttonText: '#FFFFFF', cardText: '#1A1A1A' }
    }
    const colors = colorSchemes[selectedLayout] || colorSchemes.standard

    return (
      <div 
        className="h-screen flex flex-col rounded-2xl m-4 overflow-hidden shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${colors.bg}40, ${colors.bg}20)`,
          maxHeight: '95vh'
        }}
      >
        
        {/* Header */}
        <div 
          className="px-4 py-2 flex-shrink-0 border-b rounded-t-2xl backdrop-blur-md"
          style={{
            backgroundColor: `${colors.bg}95`,
            borderBottomColor: `${colors.bg}60`
          }}
        >
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('layout')} 
              className="rounded-full bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
            >
              ← Back
            </Button>
            <h1 className="text-lg font-bold text-gray-900 bg-white/90 px-4 py-1 rounded-full">
              Configure & Go Live: {layout.name}
            </h1>
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="hover:bg-white/20 rounded-full bg-white text-gray-900"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main Content - FITS ON SCREEN */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-5xl mx-auto space-y-4">
            
            {/* 1. TOPIC INPUT - FIRST AND PROMINENT */}
            <Card className="rounded-xl shadow-lg" style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
              <CardContent className="p-4">
                <Label className="text-lg font-bold mb-3 block text-center text-gray-900">📢 Live Topic</Label>
                <Input
                  value={liveTopic}
                  onChange={(e) => setLiveTopic(e.target.value)}
                  placeholder="Enter your live topic here..."
                  className="text-center font-semibold h-12 text-lg rounded-xl border-2 text-gray-900 placeholder:text-gray-500"
                  style={{
                    borderColor: colors.buttonBg,
                    backgroundColor: 'white'
                  }}
                />
              </CardContent>
            </Card>

            {/* 2. CO-HOST & GUEST ASSIGNMENTS */}
            <Card className="rounded-xl shadow-lg" style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
              <CardContent className="p-4">
                <h3 className="text-lg font-bold mb-3 text-center text-gray-900">👥 Assign Co-Speakers</h3>
                
                {/* Host Info */}
                <div className="mb-4 p-3 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                  <div className="flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-600" />
                    <span className="font-bold text-yellow-800">You will be the HOST when you go live</span>
                  </div>
                </div>

                {/* Co-hosts */}
                {layout.coHostSlots > 0 && (
                  <div>
                    <Label className="font-semibold mb-2 block text-gray-900">
                      {selectedLayout === 'panel' ? '🎤 Panelists' : 
                       selectedLayout === 'interview' ? '🤝 Guest & Co-hosts' :
                       selectedLayout === 'townhall' ? '⚖️ Moderators' : '🤝 Co-hosts'} 
                      ({layout.coHostSlots} slots available)
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {coHostSlots.map((slot, index) => (
                        <SlotCard
                          key={index}
                          title={`Click to invite ${selectedLayout === 'interview' && index === 0 ? 'guest' : 
                                 selectedLayout === 'panel' ? 'panelist' :
                                 selectedLayout === 'townhall' ? 'moderator' : 'co-host'}`}
                          user={slot}
                          onClick={() => handleSlotClick('cohost', index)}
                          className="border-blue-300 bg-blue-50 h-12 rounded-xl hover:shadow-md transition-all"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. AUDIENCE QUEUE */}
            <Card className="rounded-xl shadow-lg" style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
              <CardContent className="p-4">
                <h3 className="text-lg font-bold mb-3 text-center text-gray-900">
                  {selectedLayout === 'intimate' ? '👥 Participants' : '🎭 Audience Queue'} 
                  ({layout.inviteSlots} slots)
                </h3>
                <div className="grid grid-cols-6 md:grid-cols-8 gap-2 max-h-24 overflow-y-auto">
                  {inviteSlots.map((slot, index) => (
                    <Card 
                      key={index}
                      className="cursor-pointer hover:shadow-md transition-all border border-green-300 bg-green-50 h-10 rounded-lg"
                      onClick={() => handleSlotClick('invite', index)}
                    >
                      <CardContent className="p-1 h-full flex items-center justify-center">
                        {slot ? (
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={slot.avatar} />
                            <AvatarFallback className="text-xs text-gray-900">{slot.name?.[0] || 'A'}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <UserPlus className="w-4 h-4 text-gray-400" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 4. SESSION SETTINGS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Session Type */}
              <Card className="rounded-xl shadow-lg" style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
                <CardContent className="p-4">
                  <h4 className="font-bold mb-3 text-gray-900">💰 Session Settings</h4>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-semibold text-gray-900">Session Type</Label>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={sessionType === 'paid'} 
                        onCheckedChange={(checked) => setSessionType(checked ? 'paid' : 'free')}
                      />
                      <span className="font-medium text-gray-900">
                        {sessionType === 'free' ? '🆓 Free' : '💳 Paid'}
                      </span>
                    </div>
                  </div>
                  
                  {sessionType === 'paid' && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-900" />
                      <Input
                        type="number"
                        step="0.01"
                        value={entryFee}
                        onChange={(e) => setEntryFee(parseFloat(e.target.value) || 0)}
                        placeholder="1.00"
                        className="flex-1 rounded-lg text-gray-900 placeholder:text-gray-500"
                        style={{ backgroundColor: 'white' }}
                      />
                      <span className="text-sm font-medium text-gray-900">USD</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Features */}
              <Card className="rounded-xl shadow-lg" style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
                <CardContent className="p-4">
                  <h4 className="font-bold mb-3 text-gray-900">✨ Features Included</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-900">📹 Video for hosts & guests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-900">🎙️ Voice recordings in chat</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-900">📄 Document sharing</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 5. ACTION BUTTONS - ALWAYS VISIBLE AT BOTTOM */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sticky bottom-0 bg-transparent pt-4">
              <Button 
                onClick={saveRoom} 
                variant="outline" 
                size="lg" 
                className="h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-bold text-gray-900"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  borderColor: colors.buttonBg,
                  color: '#1A1A1A'
                }}
              >
                <Save className="w-5 h-5 mr-2" />
                💾 Save Configuration
              </Button>
              <Button 
                onClick={goLive} 
                size="lg" 
                className="h-14 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 animate-pulse font-bold text-lg"
                style={{
                  backgroundColor: colors.buttonBg,
                  color: colors.buttonText,
                  border: `3px solid ${colors.buttonBg}`
                }}
              >
                <Play className="w-6 h-6 mr-2" />
                🚀 GO LIVE NOW!
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If no matching step, return null or default view
  return null
}
