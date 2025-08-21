import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from "@/integrations/supabase/client"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (authUser) => {
    if (!authUser) return null;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single()

      // Merge auth user with profile data
      return {
        ...authUser,
        ...profile,
        email: authUser.email // Keep auth email as primary
      }
    } catch (error) {
      console.log('No profile found, using auth user only:', error)
      return authUser
    }
  }

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state change:', event, !!session)
        setSession(session)
        
        if (session?.user) {
          const fullUser = await fetchUserProfile(session.user)
          setUser(fullUser)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('🔍 Initial session check:', !!session)
      setSession(session)
      
      if (session?.user) {
        const fullUser = await fetchUserProfile(session.user)
        setUser(fullUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  const register = async (userData) => {
    try {
      const redirectUrl = `${window.location.origin}/`
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            phone: userData.phone,
            location: userData.location,
            preferred_currency: userData.currency,
            timezone: userData.timezone,
            country: userData.country
          }
        }
      })
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      return { success: true, user: data.user }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const loginAnonymously = async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      return { success: true, user: data.user }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const resetPassword = async (email) => {
    try {
      // Simple approach: Just use Supabase's built-in reset directly
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      
      if (error) {
        // If it fails, provide helpful message
        return { 
          success: true, // Return success for security 
          message: "If an account exists with that email, you will receive a reset link. If you don't receive an email, please contact support@sow2grow.online" 
        };
      }
      
      return { 
        success: true, 
        message: "Password reset email sent! Check your inbox and spam folder." 
      };
    } catch (error) {
      return { 
        success: true, // Always return success for security
        message: "Reset request processed. If you don't receive an email, please contact support@sow2grow.online" 
      };
    }
  }

  const updateProfile = async (profileData) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single()
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      // Update user state with new profile data
      const updatedUser = {
        ...user,
        ...data
      }
      setUser(updatedUser)
      
      return { success: true, user: updatedUser }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const value = {
    user,
    session,
    loading,
    login,
    register,
    loginAnonymously,
    logout,
    resetPassword,
    updateProfile,
    isAuthenticated: !!session && !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}