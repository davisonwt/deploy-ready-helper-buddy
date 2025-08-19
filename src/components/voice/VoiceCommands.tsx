import { useState, useEffect } from "react"
import { Mic, MicOff, Volume2, VolumeX, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface VoiceCommandsProps {
  isEnabled: boolean
  onToggle: () => void
}

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition?: any
    webkitSpeechRecognition?: any
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

export function VoiceCommands({ isEnabled, onToggle }: VoiceCommandsProps) {
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const [lastCommand, setLastCommand] = useState<string>("")
  const [hasPermission, setHasPermission] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const { toast } = useToast()

  // Check browser support and initialize recognition
  useEffect(() => {
    console.log('VoiceCommands: Checking browser support')
    
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setIsSupported(true)
      console.log('VoiceCommands: Speech Recognition supported')
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      
      recognitionInstance.continuous = true
      recognitionInstance.interimResults = false
      recognitionInstance.lang = 'en-US'

      recognitionInstance.onstart = () => {
        console.log('VoiceCommands: Recognition started')
        setIsListening(true)
      }

      recognitionInstance.onend = () => {
        console.log('VoiceCommands: Recognition ended')
        setIsListening(false)
        
        // Only restart if still enabled and has permission, and no network errors
        if (isEnabled && hasPermission) {
          setTimeout(() => {
            try {
              console.log('VoiceCommands: Attempting to restart recognition')
              recognitionInstance.start()
            } catch (error) {
              console.error('VoiceCommands: Restart failed:', error)
              // If restart fails multiple times, disable temporarily
              if (error.message && error.message.includes('already')) {
                console.log('VoiceCommands: Recognition already running')
                return
              }
            }
          }, 1500) // Increased delay to prevent rapid restarts
        }
      }

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase()
        console.log('VoiceCommands: Transcript received:', transcript)
        setLastCommand(transcript)
        handleVoiceCommand(transcript)
      }

      recognitionInstance.onerror = (event) => {
        console.error('VoiceCommands: Recognition error:', event.error)
        setIsListening(false)
        
        // Handle different error types
        if (event.error === 'not-allowed') {
          setHasPermission(false)
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use voice commands",
            variant: "destructive"
          })
        } else if (event.error === 'network') {
          console.log('VoiceCommands: Network error, will retry...')
          toast({
            title: "Network Issue",
            description: "Speech recognition temporarily unavailable. Retrying...",
            variant: "destructive"
          })
          // Retry after network error
          if (isEnabled && hasPermission) {
            setTimeout(() => {
              try {
                recognitionInstance.start()
              } catch (error) {
                console.error('VoiceCommands: Retry failed:', error)
              }
            }, 3000)
          }
        } else if (event.error === 'no-speech') {
          console.log('VoiceCommands: No speech detected, continuing...')
          // Don't show error for no-speech, just restart
        } else {
          toast({
            title: "Speech Recognition Error",
            description: `Error: ${event.error}`,
            variant: "destructive"
          })
        }
      }

      setRecognition(recognitionInstance)
    } else {
      console.warn('VoiceCommands: Speech Recognition not supported')
      setIsSupported(false)
    }

    return () => {
      if (recognition) {
        recognition.stop()
      }
    }
  }, []) // Remove dependencies to avoid recreating recognition

  // Request microphone permission when component mounts
  useEffect(() => {
    const requestPermission = async () => {
      try {
        console.log('VoiceCommands: Requesting microphone permission')
        await navigator.mediaDevices.getUserMedia({ audio: true })
        setHasPermission(true)
        console.log('VoiceCommands: Microphone permission granted')
      } catch (error) {
        console.error('VoiceCommands: Microphone permission denied:', error)
        setHasPermission(false)
      }
    }

    if (isSupported) {
      requestPermission()
    }
  }, [isSupported])

  // Handle enabling/disabling voice commands
  useEffect(() => {
    console.log('VoiceCommands: isEnabled changed:', isEnabled, 'hasPermission:', hasPermission)
    
    if (recognition && hasPermission) {
      if (isEnabled && !isListening) {
        try {
          console.log('VoiceCommands: Starting recognition')
          recognition.start()
          toast({
            title: "Voice Commands Enabled",
            description: "Say 'Hey Sow2Grow' followed by a command",
          })
        } catch (error) {
          console.error('VoiceCommands: Start failed:', error)
          toast({
            title: "Failed to Start",
            description: "Could not start voice recognition. Try again.",
            variant: "destructive"
          })
        }
      } else if (!isEnabled && isListening) {
        console.log('VoiceCommands: Stopping recognition')
        recognition.stop()
        toast({
          title: "Voice Commands Disabled", 
          description: "Voice commands are now turned off",
        })
      }
    } else if (isEnabled && !hasPermission) {
      toast({
        title: "Permission Required",
        description: "Please allow microphone access first",
        variant: "destructive"
      })
    }
  }, [isEnabled, recognition, hasPermission])

  const handleVoiceCommand = (command: string) => {
    const trimmedCommand = command.trim()

    // Navigation commands
    if (trimmedCommand.includes('hey sow2grow') || trimmedCommand.includes('hey sow to grow')) {
      const afterTrigger = trimmedCommand.split(/hey sow2grow|hey sow to grow/)[1]?.trim()
      
      if (afterTrigger) {
        processCommand(afterTrigger)
      } else {
        speak("How can I help you today?")
      }
    }
  }

  const processCommand = (command: string) => {
    // Navigation commands
    if (command.includes('show me orchards') || command.includes('browse orchards')) {
      speak("Navigating to orchards")
      window.location.href = '/browse-orchards'
    } else if (command.includes('create orchard') || command.includes('new orchard')) {
      speak("Opening orchard creation")
      window.location.href = '/create-orchard'
    } else if (command.includes('my orchards')) {
      speak("Showing your orchards")
      window.location.href = '/my-orchards'
    } else if (command.includes('dashboard') || command.includes('home')) {
      speak("Going to dashboard")
      window.location.href = '/dashboard'
    } else if (command.includes('community') || command.includes('videos')) {
      speak("Opening community videos")
      window.location.href = '/community-videos'
    } else if (command.includes('ai assistant') || command.includes('marketing tools')) {
      speak("Opening AI assistant")
      window.location.href = '/ai-assistant'
    } else if (command.includes('chat') || command.includes('messages')) {
      speak("Opening chat")
      window.location.href = '/chat'
    } else if (command.includes('profile') || command.includes('settings')) {
      speak("Opening profile")
      window.location.href = '/profile'
    }
    // Search commands
    else if (command.includes('search for')) {
      const searchTerm = command.replace(/search for/g, '').trim()
      speak(`Searching for ${searchTerm}`)
      // Implement search functionality
    }
    // Help commands
    else if (command.includes('help') || command.includes('what can you do')) {
      speak("I can help you navigate the app. Try saying 'show me orchards', 'create orchard', 'my dashboard', 'community videos', or 'ai assistant'")
    } else {
      speak("I didn't understand that command. Try saying 'help' to see what I can do.")
    }

    toast({
      title: "Voice Command",
      description: `Processed: "${command}"`,
    })
  }

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8
      utterance.pitch = 1
      speechSynthesis.speak(utterance)
    }
  }

  const toggleListening = () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Voice commands are not supported in this browser",
        variant: "destructive"
      })
      return
    }
    
    if (!hasPermission) {
      toast({
        title: "Permission Required",
        description: "Please allow microphone access to use voice commands",
        variant: "destructive"
      })
      return
    }
    
    onToggle()
  }

  if (!isSupported) {
    return (
      <div className="fixed bottom-20 left-6 z-40">
        <Card className="w-80 shadow-lg">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Voice commands are not supported in this browser
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed bottom-20 left-6 z-40">
      <Card className="w-80 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4" />
              <span>Voice Commands</span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleListening}
              className={`hover-scale ${isEnabled ? 'text-green-600' : 'text-muted-foreground'}`}
            >
              {isEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={
              !hasPermission ? "destructive" : 
              isListening ? "default" : 
              isEnabled ? "secondary" : "outline"
            }>
              {!hasPermission ? "No Permission" :
               isListening ? "Listening..." : 
               isEnabled ? "Ready" : "Disabled"}
            </Badge>
          </div>
          
          {lastCommand && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Last command:</span>
              <p className="text-xs bg-muted p-2 rounded">{lastCommand}</p>
            </div>
          )}
          
          <div className="space-y-1">
            <span className="text-sm font-medium">Try saying:</span>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>"Hey Sow2Grow, show me orchards"</p>
              <p>"Hey Sow2Grow, create orchard"</p>
              <p>"Hey Sow2Grow, my dashboard"</p>
              <p>"Hey Sow2Grow, help"</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}