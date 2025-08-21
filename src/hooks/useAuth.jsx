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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    try {
      // Rate limiting check for login attempts
      const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit_enhanced', {
        identifier: email,
        limit_type: 'login_attempt',
        max_attempts: 5,
        time_window_minutes: 15
      });

      if (!rateLimitCheck) {
        return { 
          success: false, 
          error: 'Too many login attempts. Please wait 15 minutes before trying again.' 
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Log authentication attempt
      await supabase.rpc('log_authentication_attempt', {
        user_email: email,
        success: !error,
        user_agent_param: navigator.userAgent
      });
      
      if (error) {
        // Log failed login for security monitoring
        await supabase.rpc('log_security_event_enhanced', {
          event_type: 'login_failed',
          details: {
            email: email,
            error: error.message,
            timestamp: new Date().toISOString()
          },
          severity: 'warning'
        });
        
        return { success: false, error: error.message };
      }

      // Log successful login
      await supabase.rpc('log_security_event_enhanced', {
        event_type: 'login_successful',
        details: {
          email: email,
          timestamp: new Date().toISOString()
        },
        severity: 'info'
      });
      
      return { success: true, user: data.user };
    } catch (error) {
      // Log authentication error
      await supabase.rpc('log_authentication_attempt', {
        user_email: email,
        success: false,
        user_agent_param: navigator.userAgent
      });
      
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
            preferred_currency: userData.currency
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
      
      return { success: true, user: data }
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