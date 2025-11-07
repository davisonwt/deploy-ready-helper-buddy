import React, { createContext, useContext } from 'react'
import { supabase } from "@/integrations/supabase/client"

// Minimal, resilient Auth context that avoids React hooks inside providers
// to prevent "dispatcher is null" when multiple React copies are bundled.
const AuthContext = createContext(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null)
  const [session, setSession] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  const fetchUserProfile = async (authUser) => {
    if (!authUser) return null
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name, avatar_url, bio, location, timezone, preferred_currency, verification_status, has_complete_billing_info, website, tiktok_url, instagram_url, facebook_url, twitter_url, youtube_url, show_social_media, phone, country, is_chatapp_verified, created_at, updated_at')
        .eq('user_id', authUser.id)
        .maybeSingle()

      return {
        ...authUser,
        ...(profile || {}),
        id: authUser.id,
        user_id: authUser.id,
        email: authUser.email,
      }
    } catch (e) {
      console.error('Profile fetch error:', e)
      return authUser
    }
  }

  const safeFetchProfile = async (authUser) => {
    try {
      const full = await fetchUserProfile(authUser)
      setUser(full || authUser)
    } catch (e) {
      console.error('Profile fetch error:', e)
      setUser(authUser)
    }
  }

  React.useEffect(() => {
    let isMounted = true

    // 1) Auth state listener (SYNC only; defer async work)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!isMounted) return
      setSession(sess)
      setLoading(false)

      if (sess?.user) {
        setUser(sess.user)
        setTimeout(() => safeFetchProfile(sess.user), 0)
      } else {
        setUser(null)
      }
    })

    // 2) Initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return
        setSession(session)
        setLoading(false)
        if (session?.user) safeFetchProfile(session.user)
      })
      .catch((e) => {
        console.error('Auth init failed:', e)
        if (isMounted) {
          setLoading(false)
          setUser(null)
        }
      })

    return () => {
      isMounted = false
      try { subscription.unsubscribe() } catch {}
    }
  }, [])

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { success: false, error: error.message }
      return { success: true, user: data.user }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  const register = async (userData) => {
    try {
      const currentDomain = window.location.origin
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
            country: userData.country,
            username: userData.username || userData.email?.split('@')[0]
          }
        }
      })
      if (error) return { success: false, error: error.message }
      return { success: true, user: data.user }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  const loginAnonymously = async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) return { success: false, error: error.message }
      return { success: true, user: data.user }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) console.error('Logout error:', error)
    } catch (e) {
      console.error('Logout error:', e)
    }
  }

  const resetPassword = async (email) => {
    try {
      const redirectTo = `${window.location.origin}/login?reset=true`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) {
        return { success: true, message: "If an account exists with that email, you will receive a reset link." }
      }
      return { success: true, message: "Password reset email sent!" }
    } catch {
      return { success: true, message: "If an account exists with that email, you will receive a reset link." }
    }
  }

  const updateProfile = async (profileData) => {
    try {
      const currentUser = user
      if (!currentUser?.id) return { success: false, error: 'User not authenticated' }

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
        show_social_media: profileData.show_social_media !== undefined ? profileData.show_social_media : true,
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ ...validFields, updated_at: new Date().toISOString() })
        .eq('user_id', currentUser.id)
        .select()
        .single()

      if (error) return { success: false, error: error.message }

      const updatedUser = { ...currentUser, ...data }
      setUser(updatedUser)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { user: updatedUser, timestamp: Date.now() } }))
      }, 300)
      return { success: true, user: updatedUser }
    } catch (e) {
      return { success: false, error: e.message }
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
