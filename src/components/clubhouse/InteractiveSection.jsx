import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, X, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function InteractiveSection({ 
  title, 
  description, 
  icon: Icon, 
  color, 
  users = [], 
  role, 
  onAdd, 
  onRemove, 
  allUsers = [], 
  getUserInfo, 
  position = 0,
  isHostSection = false,
  sessionType,
  bestowedAmount
}) {
  const { user } = useAuth()
  const [showPopover, setShowPopover] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Get the user assigned to this specific position
  const assignedUser = users[position]
  const userInfo = assignedUser ? getUserInfo(assignedUser) : null
  
  // Available users (not assigned to any role)
  const availableUsers = allUsers.filter(u => 
    !users.includes(u.user_id)
  )

  const handleUserSelect = (userId) => {
    if (onAdd) {
      onAdd(userId, role)
    }
    setShowPopover(false)
  }

  const handleRemoveUser = () => {
    if (onRemove && assignedUser) {
      onRemove(assignedUser, role)
    }
  }

  const handleCardClick = () => {
    if (isMobile) {
      if (assignedUser) {
        handleRemoveUser()
      } else {
        setShowPopover(true)
      }
    }
  }

  if (isHostSection) {
    return (
      <Card className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 ${color} transition-all duration-200 cursor-default mx-auto`}>
        <CardContent className="p-1 sm:p-2 h-full flex flex-col items-center justify-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-yellow-500/20 border-2 border-yellow-500/50 rounded-full flex items-center justify-center mb-1">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-400" />
          </div>
          <div className="text-center">
            <div className="text-xs font-semibold text-white">Host</div>
            <div className="text-xs text-white/60">You</div>
            {sessionType === 'paid' && bestowedAmount > 0 && (
              <div className="text-xs text-green-400 mt-1">
                ${(bestowedAmount - (bestowedAmount * 0.105)).toFixed(2)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div
      className="relative mx-auto"
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
    >
      <Card 
        className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 ${color} transition-all duration-200 ${
          (isHovered && !isMobile) ? 'scale-105 shadow-lg' : ''
        } ${assignedUser ? 'cursor-pointer' : 'cursor-pointer border-dashed'}`}
        onClick={handleCardClick}
      >
        <CardContent className="p-1 sm:p-2 h-full flex flex-col items-center justify-center">
          {assignedUser && userInfo ? (
            // Show assigned user
            <div className="flex flex-col items-center space-y-1">
              <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-white/20">
                <AvatarImage src={userInfo.avatar_url} />
                <AvatarFallback className="text-xs bg-slate-600">
                  {(userInfo.display_name || userInfo.first_name || 'U')[0]}
                </AvatarFallback>
              </Avatar>
              <div className="text-xs text-center text-white/80 truncate max-w-full hidden sm:block">
                {(userInfo.display_name || userInfo.first_name || 'User').substring(0, 8)}
              </div>
            </div>
          ) : (
            // Show empty slot
            <div className="flex flex-col items-center space-y-1">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 border-2 border-dashed border-white/30 rounded-full flex items-center justify-center ${
                (isHovered && !isMobile) ? 'border-white/50' : ''
              }`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
              </div>
              <div className="text-xs text-white/60 text-center hidden sm:block">
                {(isHovered && !isMobile) ? 'Add User' : 'Empty'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Desktop hover overlay with actions */}
      {(isHovered && !isMobile) && (
        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-10">
          <div className="flex gap-2">
            {assignedUser ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveUser}
                className="h-6 w-6 sm:h-8 sm:w-8 p-0"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            ) : (
              <Popover open={showPopover} onOpenChange={setShowPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="center">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-48">
                          {availableUsers.map((u) => (
                            <CommandItem
                              key={u.user_id}
                              onSelect={() => handleUserSelect(u.user_id)}
                              className="flex items-center gap-3 p-3 cursor-pointer"
                            >
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={u.avatar_url} />
                                <AvatarFallback>
                                  {(u.display_name || u.first_name || 'U')[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {u.display_name || `${u.first_name} ${u.last_name}` || 'Unknown User'}
                              </span>
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      )}

      {/* Mobile popover for user selection */}
      {isMobile && (
        <Popover open={showPopover} onOpenChange={setShowPopover}>
          <PopoverTrigger asChild>
            <div className="hidden" />
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="center">
            <Command>
              <CommandInput placeholder="Search users..." />
              <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-48">
                    {availableUsers.map((u) => (
                      <CommandItem
                        key={u.user_id}
                        onSelect={() => handleUserSelect(u.user_id)}
                        className="flex items-center gap-3 p-3 cursor-pointer"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={u.avatar_url} />
                          <AvatarFallback>
                            {(u.display_name || u.first_name || 'U')[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {u.display_name || `${u.first_name} ${u.last_name}` || 'Unknown User'}
                        </span>
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Position label */}
      {!assignedUser && (
        <div className="absolute -bottom-4 sm:-bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white/40 text-center max-w-20">
          {title}
        </div>
      )}
    </div>
  )
}