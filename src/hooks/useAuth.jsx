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
        .select('*') // User can access their own complete profile
        .eq('user_id', authUser.id)
        .single()

      // Merge auth user with profile data, but preserve auth user's ID
      return {
        ...authUser,
        ...profile,
        id: authUser.id, // CRITICAL: Preserve auth user ID
        user_id: authUser.id, // Ensure consistency
        email: authUser.email // Keep auth email as primary
      }
    } catch (error) {
      console.log('No profile found, using auth user only:', error)
      return authUser
    }
  }

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state change:', event, {
          hasSession: !!session,
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        })
        
        if (!mounted) return;
        
        // Immediately update session and loading state
        setSession(session)
        setLoading(false)
        
        if (session?.user) {
          console.log('🔐 Processing user session for:', session.user.id)
          
          // Set basic user immediately to prevent UI lag
          setUser(session.user);
          
          // Then fetch extended profile asynchronously
          setTimeout(async () => {
            try {
              const fullUser = await fetchUserProfile(session.user);
              if (mounted && fullUser) {
                console.log('✅ Profile loaded for user:', fullUser?.id);
                setUser(fullUser);
              }
            } catch (error) {
              console.error('❌ Error fetching user profile:', error);
              // Keep the basic user if profile fetch fails
            }
          }, 0);
        } else {
          if (mounted) {
            setUser(null);
          }
        }
      }
    )

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('🔍 Initial session check:', {
          hasSession: !!session,
          userId: session?.user?.id,
          error: error?.message
        });
        
        if (!mounted) return;
        
        setSession(session);
        setLoading(false);
        
        if (session?.user) {
          console.log('🔍 Processing initial session for user:', session.user.id);
          
          try {
            // Test database connection
            const { error: testError } = await supabase.from('profiles').select('id').limit(1);
            if (testError) {
              console.error('❌ Initial database connection test failed:', testError);
              // Try to refresh session
              await supabase.auth.refreshSession();
            }
            
            const fullUser = await fetchUserProfile(session.user);
            if (mounted) {
              console.log('✅ Initial profile loaded for user:', fullUser?.id);
              setUser(fullUser);
            }
          } catch (error) {
            console.error('❌ Error in initial auth setup:', error);
            if (mounted) {
              setUser(session.user); // Fallback to basic user
            }
          }
        } else {
          if (mounted) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize auth:', error);
        if (mounted) {
          setLoading(false);
          setUser(null);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [])

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('🔐 Login response:', { data: !!data, error: error?.message });
      
      if (error) {
        console.error('🚨 Login error:', error);
        return { success: false, error: error.message };
      }
      
      console.log('✅ Login successful for user:', data.user?.id);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('🚨 Login exception:', error);
      return { success: false, error: error.message };
    }
  }

  const register = async (userData) => {
    try {
      console.log('🔐 Registration attempt for:', userData.email);
      
      // Use the current domain for redirect URL
      const currentDomain = window.location.origin;
      console.log('🔐 Using redirect URL:', currentDomain);
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: currentDomain,
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
      
      console.log('🔐 Registration response:', { data: !!data, error: error?.message });
      
      if (error) {
        console.error('🚨 Registration error:', error);
        
        // Check for redirect URL configuration issues
        if (error.message.includes('invalid') && error.message.includes('redirect')) {
          return { 
            success: false, 
            error: 'Authentication configuration error. Please contact support or try again later.' 
          };
        }
        
        // Provide user-friendly error messages for common issues
        let errorMessage = error.message
        
        if (error.message.includes('User already registered') || 
            error.message.includes('already registered') ||
            error.message.includes('email already exists') ||
            error.code === 'email_already_exists' ||
            error.code === 'signup_disabled_for_user') {
          errorMessage = `An account with ${userData.email} already exists. Please use the login page instead or try a different email address.`
        } else if (error.message.includes('Password should be')) {
          errorMessage = 'Password must be at least 6 characters long and contain a mix of letters and numbers.'
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.'
        } else if (error.message.includes('Signup is disabled')) {
          errorMessage = 'Account registration is currently disabled. Please contact support@sow2grow.org for assistance.'
        }
        
        return { success: false, error: errorMessage }
      }
      
      // Check if user creation was successful but user already confirmed (edge case)
      if (data.user && !data.user.email_confirmed_at && data.user.identities?.length === 0) {
        return { 
          success: false, 
          error: `An account with ${userData.email} already exists. Please use the login page instead.` 
        }
      }
      
      console.log('✅ Registration successful for user:', data.user?.id);
      return { success: true, user: data.user }
    } catch (error) {
      console.error('💥 Registration exception:', error)
      return { 
        success: false, 
        error: 'Registration failed. Please check your details and try again. If the problem persists, contact support@sow2grow.org.' 
      }
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
      console.log('🔐 Password reset request for:', email);
      
      // Use current domain for reset redirect
      const currentDomain = window.location.origin;
      const redirectUrl = `${currentDomain}/login?reset=true`;
      
      console.log('🔐 Using reset redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      console.log('🔐 Reset password response:', { error: error?.message });
      
      if (error) {
        console.error('🚨 Reset password error:', error);
        
        // Check for configuration issues
        if (error.message.includes('invalid') && (error.message.includes('redirect') || error.message.includes('URL'))) {
          return { 
            success: true, // Return success for security 
            message: "Reset request processed. If you don't receive an email, please contact support@sow2grow.org" 
          };
        }
        
        // If it fails, provide helpful message
        return { 
          success: true, // Return success for security 
          message: "If an account exists with that email, you will receive a reset link. If you don't receive an email, please contact support@sow2grow.org" 
        };
      }
      
      console.log('✅ Password reset email sent successfully');
      return { 
        success: true, 
        message: "Password reset email sent! Check your inbox and spam folder." 
      };
    } catch (error) {
      console.error('💥 Reset password exception:', error);
      return { 
        success: true, // Always return success for security
        message: "Reset request processed. If you don't receive an email, please contact support@sow2grow.org" 
      };
    }
  }

  const updateProfile = async (profileData) => {
    try {
      console.log('🔄 Starting profile update...')
      console.log('🔄 Current user ID:', user?.id)
      console.log('🔄 User object:', user)
      console.log('🔄 Profile data to update:', profileData)
      
      if (!user?.id) {
        console.error('❌ No user ID found!')
        return { success: false, error: 'User not authenticated' }
      }
      
      // Only send fields that exist in the database
      const validFields = {
        first_name: profileData.first_name || null,
        last_name: profileData.last_name || null,
        display_name: profileData.display_name || null,
        avatar_url: profileData.avatar_url || null,
        bio: profileData.bio || null,
        location: profileData.location || null,
        preferred_currency: profileData.preferred_currency || 'USD',
        timezone: profileData.timezone || null,
        country: profileData.country || null,
        phone: profileData.phone || null,
        website: profileData.website || null,
        tiktok_url: profileData.tiktok_url || null,
        instagram_url: profileData.instagram_url || null,
        facebook_url: profileData.facebook_url || null,
        twitter_url: profileData.twitter_url || null,
        youtube_url: profileData.youtube_url || null,
        show_social_media: profileData.show_social_media !== undefined ? profileData.show_social_media : true
      }
      
      console.log('🔄 Sending valid fields to database:', validFields)
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...validFields,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single()
      
      console.log('🔄 Database response - data:', data)
      console.log('🔄 Database response - error:', error)
      
      if (error) {
        console.error('❌ Profile update error:', error)
        return { success: false, error: error.message }
      }
      
      console.log('✅ Profile updated successfully:', data)
      
      // Update user state with new profile data
      const updatedUser = {
        ...user,
        ...data
      }
      setUser(updatedUser)
      
      // Force a small delay to ensure database consistency
      setTimeout(() => {
        console.log('🔄 Broadcasting profile update event')
        // Trigger a custom event for other components to refresh
        window.dispatchEvent(new CustomEvent('profileUpdated', { 
          detail: { user: updatedUser, timestamp: Date.now() }
        }))
      }, 300)
      
      return { success: true, user: updatedUser }
    } catch (error) {
      console.error('❌ Profile update exception:', error)
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