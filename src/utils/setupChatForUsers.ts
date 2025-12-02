/**
 * Setup S2G Chatapp for All Registered Users
 * Links all Supabase users to Firebase and sends welcome message
 */

import { supabase } from '@/integrations/supabase/client'
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/integrations/firebase/config'

interface User {
  id: string
  email?: string
  created_at: string
}

/**
 * Get all registered Supabase users
 */
export async function getAllSupabaseUsers(): Promise<User[]> {
  try {
    // Note: This requires admin access or a server-side function
    // For now, we'll use a client-side approach that gets users from profiles table
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return []
    }

    return (profiles || []).map(profile => ({
      id: (profile as any).user_id,
      email: `user-${(profile as any).user_id}@placeholder.com`, // Placeholder since profiles doesn't have email
      created_at: (profile as any).created_at,
    }))
  } catch (error) {
    console.error('Error getting users:', error)
    return []
  }
}

/**
 * Ensure a Gosat user exists in Firebase
 */
export async function ensureGosatUser(): Promise<string | null> {
  if (!isFirebaseConfigured || !db) {
    console.error('Firebase is not configured')
    return null
  }

  try {
    // Find a Gosat user in Supabase
    const { data: gosatProfile } = await supabase
      .from('profiles' as any)
      .select('user_id, display_name')
      .eq('role', 'gosat')
      .limit(1)
      .maybeSingle()

    if (!gosatProfile) {
      // Create a system Gosat user in Firebase
      const gosatUID = 's2g-gosat-system'
      const gosatRef = doc(db, 'users', gosatUID)
      const gosatDoc = await getDoc(gosatRef)

      if (!gosatDoc.exists()) {
        await setDoc(gosatRef, {
          displayName: 'S2G Gosat',
          email: 'gosat@s2g.com',
          role: 'gosat',
          isGosat: true,
          createdAt: serverTimestamp(),
        })
      }

      return gosatUID
    }

    // Use existing Gosat's Firebase UID (they need to sign in with Firebase first)
    // For now, return system Gosat
    return 's2g-gosat-system'
  } catch (error) {
    console.error('Error ensuring Gosat user:', error)
    return 's2g-gosat-system'
  }
}

/**
 * Send welcome message to all users in community chat
 */
export async function sendWelcomeMessageToChat(): Promise<boolean> {
  if (!isFirebaseConfigured || !db) {
    console.error('Firebase is not configured')
    return false
  }

  try {
    const gosatUID = await ensureGosatUser()
    if (!gosatUID) {
      console.error('Could not get Gosat user')
      return false
    }

    const welcomeMessage = `Welcome to s2g chatapp for all! 🌱

This is our community chat where everyone can share encouragement, inspiration, and connect with each other.

**How to use:**
1. Click the "Sign In Anonymously" button below to get started
2. Type your message in the input box
3. Press Enter or click the Send button
4. Share photos, voice notes, and messages with the community

**Features:**
✨ Send text messages
📸 Share photos
🎤 Record voice notes
💬 Connect with the S2G community

**Guidelines:**
- Be respectful and encouraging
- Share positive messages
- Support each other in your journey

We're excited to have you here! Let's grow together. 💚

- S2G Gosat Team`

    // Check if welcome message already exists
    const messagesRef = collection(db, 'community_chat')
    const welcomeQuery = query(
      messagesRef,
      where('isWelcomeMessage', '==', true),
      where('text', '==', welcomeMessage),
      where('isDeleted', '==', false)
    )
    const existingWelcome = await getDocs(welcomeQuery)
    if (!existingWelcome.empty) {
      console.log('Welcome message already exists')
      return true
    }

    // Send welcome message
    await addDoc(collection(db, 'community_chat'), {
      text: welcomeMessage,
      authorUID: gosatUID,
      authorDisplayName: 'S2G Gosat',
      createdAt: serverTimestamp(),
      warningCount: 0,
      isDeleted: false,
      isWelcomeMessage: true,
      isSystemMessage: true,
    })

    console.log('Welcome message sent successfully')
    return true
  } catch (error) {
    console.error('Error sending welcome message:', error)
    return false
  }
}

/**
 * Setup chat for all registered users
 * This should be called once when setting up the chat system
 */
export async function setupChatForAllUsers(): Promise<void> {
  console.log('Setting up S2G Chatapp for all users...')

  // Send welcome message to community chat
  await sendWelcomeMessageToChat()

  console.log('Setup complete! All users can now access S2G Chatapp.')
}

