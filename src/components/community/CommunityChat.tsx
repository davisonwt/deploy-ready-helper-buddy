/**
 * Community Chat Component
 * Always-open chat for S2G community with Gosat moderation
 */

import { useState, useEffect, useRef } from 'react'
import { Send, Mic, Image as ImageIcon, AlertTriangle, Trash2, Ban, Shield, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { useAuth } from '@/hooks/useAuth'
import { isFirebaseConfigured } from '@/integrations/firebase/config'
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/integrations/firebase/config'
import { uploadUserPhoto, uploadVoiceNote } from '@/integrations/firebase/storage'
import { useToast } from '@/hooks/use-toast'

interface ChatMessage {
  id: string
  text?: string
  photoURL?: string
  voiceNoteURL?: string
  authorUID: string
  authorDisplayName: string
  createdAt: any
  editedAt?: any
  warningCount?: number
  isDeleted?: boolean
}

interface CommunityChatProps {
  isOpen: boolean
  onClose: () => void
}

export function CommunityChat({ isOpen, onClose }: CommunityChatProps) {
  const firebaseAuth = useFirebaseAuth()
  const supabaseAuth = useAuth()
  const { toast } = useToast()
  
  // Use Firebase auth for chat (required for Firestore)
  const user = firebaseAuth.user
  const isAuthenticated = firebaseAuth.isAuthenticated
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isGosat, setIsGosat] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Check if user is Gosat
  useEffect(() => {
    if (user && isFirebaseConfigured) {
      // Check user's role in Firestore
      const checkGosatStatus = async () => {
        try {
          const { getDoc, doc } = await import('firebase/firestore')
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setIsGosat(userData.role === 'gosat' || userData.isGosat === true)
        }
      } catch (error) {
        // Silently fail - user will just not have Gosat permissions
      }
      }
      checkGosatStatus()
    }
  }, [user])

  // Load messages
  useEffect(() => {
    if (!isFirebaseConfigured || !isOpen) return

    const messagesRef = collection(db, 'community_chat')
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(100))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        if (!data.isDeleted) {
          msgs.push({
            id: doc.id,
            ...data,
          } as ChatMessage)
        }
      })
      setMessages(msgs.reverse()) // Reverse to show oldest first
    })

    return () => unsubscribe()
  }, [isFirebaseConfigured, isOpen])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send text message
  const sendMessage = async () => {
    if (!newMessage.trim()) {
      toast({
        title: 'Empty Message',
        description: 'Please enter a message',
        variant: 'destructive',
      })
      return
    }

    // Check if Firebase is configured
    if (!isFirebaseConfigured) {
      toast({
        title: 'Firebase Not Configured',
        description: 'Chat requires Firebase to be set up. Please contact support.',
        variant: 'destructive',
      })
      return
    }

    // Check if db is available
    if (!db) {
      toast({
        title: 'Database Error',
        description: 'Firebase database is not available. Please refresh the page.',
        variant: 'destructive',
      })
      return
    }

    // Check if user is authenticated
    if (!firebaseAuth.user) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in with Firebase to send messages. Click the Auth button in the header to sign in.',
        variant: 'destructive',
      })
      return
    }

    try {
      const messageText = newMessage.trim()
      setNewMessage('') // Clear input immediately for better UX
      
      await addDoc(collection(db, 'community_chat'), {
        text: messageText,
        authorUID: firebaseAuth.user.uid,
        authorDisplayName: firebaseAuth.user.displayName || firebaseAuth.user.email || 'Anonymous',
        createdAt: serverTimestamp(),
        warningCount: 0,
        isDeleted: false,
      })
      
      // Success - message will appear via real-time listener
    } catch (error: any) {
      // Restore message text if send failed
      setNewMessage(messageText)
      
      console.error('Error sending message:', error)
      const errorCode = error?.code || ''
      const errorMessage = error?.message || 'Failed to send message'
      
      // Provide specific error messages
      let userFriendlyMessage = errorMessage
      if (errorCode === 'permission-denied') {
        userFriendlyMessage = 'Permission denied. Please check your authentication.'
      } else if (errorCode === 'unavailable') {
        userFriendlyMessage = 'Service unavailable. Please check your internet connection.'
      } else if (errorCode.includes('auth')) {
        userFriendlyMessage = 'Authentication error. Please sign in again.'
      }
      
      toast({
        title: 'Error Sending Message',
        description: userFriendlyMessage,
        variant: 'destructive',
      })
    }
  }

  // Send photo
  const sendPhoto = async () => {
    if (!isFirebaseConfigured || !user || !photoFile) return

    try {
      const result = await uploadUserPhoto(user.uid, photoFile)
      if (result.success) {
        await addDoc(collection(db, 'community_chat'), {
          photoURL: result.url,
          authorUID: user.uid,
          authorDisplayName: user.displayName || user.email || 'Anonymous',
          createdAt: serverTimestamp(),
          warningCount: 0,
          isDeleted: false,
        })
        setPhotoFile(null)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send photo'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  // Record voice note
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })

        if (isFirebaseConfigured && user) {
          const file = new File([audioBlob], `voice_${Date.now()}.wav`, { type: 'audio/wav' })
          const result = await uploadVoiceNote(user.uid, file)

          if (result.success) {
            await addDoc(collection(db, 'community_chat'), {
              voiceNoteURL: result.url,
              authorUID: user.uid,
              authorDisplayName: user.displayName || user.email || 'Anonymous',
              createdAt: serverTimestamp(),
              warningCount: 0,
              isDeleted: false,
            })
          }
        }

        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Gosat moderation functions
  const warnUser = async (messageId: string, authorUID: string) => {
    if (!isGosat) return

    try {
      const messageRef = doc(db, 'community_chat', messageId)
      const messageDoc = await getDoc(messageRef)
      const currentWarnings = messageDoc.data()?.warningCount || 0

      await updateDoc(messageRef, {
        warningCount: currentWarnings + 1,
      })

      toast({
        title: 'Warning Issued',
        description: 'User has been warned',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to issue warning',
        variant: 'destructive',
      })
    }
  }

  const deleteMessage = async (messageId: string) => {
    if (!isGosat) return

    try {
      const messageRef = doc(db, 'community_chat', messageId)
      await updateDoc(messageRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user?.uid,
      })

      toast({
        title: 'Message Deleted',
        description: 'Message has been removed',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      })
    }
  }

  const banUser = async (authorUID: string) => {
    if (!isGosat) return

    try {
      // Add user to banned list in Firestore
      const bannedRef = doc(db, 'banned_users', authorUID)
      await setDoc(bannedRef, {
        bannedAt: serverTimestamp(),
        bannedBy: user?.uid,
        reason: 'Community guidelines violation',
      })

      toast({
        title: 'User Banned',
        description: 'User has been removed from community',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to ban user',
        variant: 'destructive',
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-gradient-to-br from-purple-950 via-indigo-900 to-teal-900 shadow-2xl transform transition-transform duration-500 pointer-events-auto flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/20 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">S2G Community</h2>
            <p className="text-sm text-gray-300">Always open for encouragement & inspiration</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:scale-125 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <p>No messages yet. Be the first to share!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`bg-white/10 rounded-lg p-4 ${
                  msg.authorUID === user?.uid ? 'bg-blue-900/30' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-white">{msg.authorDisplayName}</p>
                    <p className="text-xs text-gray-400">
                      {msg.createdAt?.toDate?.()?.toLocaleTimeString() || 'Just now'}
                    </p>
                  </div>
                  {isGosat && msg.authorUID !== user?.uid && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => warnUser(msg.id, msg.authorUID)}
                        className="text-yellow-400 hover:text-yellow-300"
                        title="Warn User"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete Message"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => banUser(msg.authorUID)}
                        className="text-red-600 hover:text-red-500"
                        title="Ban User"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {msg.warningCount > 0 && (
                  <Badge className="bg-yellow-500/20 text-yellow-300 mb-2">
                    {msg.warningCount} warning{msg.warningCount > 1 ? 's' : ''}
                  </Badge>
                )}

                {msg.text && <p className="text-white">{msg.text}</p>}
                {msg.photoURL && (
                  <img src={msg.photoURL} alt="Shared" className="mt-2 rounded-lg max-w-full" />
                )}
                {msg.voiceNoteURL && (
                  <audio controls src={msg.voiceNoteURL} className="mt-2 w-full" />
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Always visible */}
        <div className="p-4 border-t border-white/20 space-y-2 bg-gradient-to-t from-purple-950/50 to-transparent">
          {photoFile && (
            <div className="flex items-center gap-2 bg-white/10 p-2 rounded mb-2">
              <img
                src={URL.createObjectURL(photoFile)}
                alt="Preview"
                className="h-16 w-16 object-cover rounded"
              />
              <div className="flex-1">
                <p className="text-sm text-white">{photoFile.name}</p>
                <Button onClick={sendPhoto} size="sm" className="mt-1" disabled={!isAuthenticated}>
                  Send Photo
                </Button>
              </div>
              <button
                onClick={() => setPhotoFile(null)}
                className="text-red-400 hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          <div className="flex gap-2 items-center">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (isAuthenticated && newMessage.trim()) {
                    sendMessage()
                  } else if (!isAuthenticated) {
                    toast({
                      title: 'Sign In Required',
                      description: 'Please sign in with Firebase to send messages',
                      variant: 'destructive',
                    })
                  }
                }
              }}
              placeholder={isAuthenticated ? "Share encouragement..." : "Type your message... (Sign in to send)"}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 flex-1"
            />
            
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              className="hidden"
              id="photo-upload"
              disabled={!isAuthenticated}
            />
            <label htmlFor="photo-upload">
              <Button 
                variant="outline" 
                size="icon" 
                className="border-white/20 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed" 
                title={isAuthenticated ? "Upload Photo" : "Sign in to upload photos"}
                disabled={!isAuthenticated}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </label>
            
            {!isRecording ? (
              <Button 
                onClick={startRecording} 
                variant="outline" 
                size="icon" 
                className="border-white/20 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed" 
                title={isAuthenticated ? "Record Voice Note" : "Sign in to record voice notes"}
                disabled={!isAuthenticated}
              >
                <Mic className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={stopRecording} 
                variant="outline" 
                size="icon" 
                className="bg-red-600 hover:bg-red-500 border-red-500" 
                title="Stop Recording"
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
            
            <Button 
              onClick={sendMessage} 
              disabled={!isAuthenticated || !newMessage.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isAuthenticated ? "Sign in to send messages" : !newMessage.trim() ? "Enter a message" : "Send Message"}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {!isAuthenticated && (
            <div className="text-center pt-2">
              <p className="text-xs text-gray-400 mb-2">
                Sign in with Firebase to participate in the community
              </p>
              <div className="flex justify-center gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  <Send className="h-3 w-3 mr-1" />
                  Text Messages
                </Badge>
                <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
                  <ImageIcon className="h-3 w-3 mr-1" />
                  Photos
                </Badge>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  <Mic className="h-3 w-3 mr-1" />
                  Voice Notes
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

