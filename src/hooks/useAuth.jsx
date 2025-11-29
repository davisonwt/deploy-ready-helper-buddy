import React, { createContext, useContext } from 'react'
import { supabase } from "@/integrations/supabase/client"
import { logError, logInfo, logWarn } from "@/lib/logging"

// Minimal, resilient Auth context that avoids React hooks inside providers
// to prevent "dispatcher is null" when multiple React copies are bundled.
const AuthContext = createContext(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    // Return safe defaults instead of throwing to prevent React dispatcher errors
    console.warn('useAuth called outside AuthProvider, returning safe defaults')
    return {
      user: null,
      session: null,
      loading: true,
      isAuthenticated: false,
      login: async () => ({ success: false, error: 'AuthProvider not initialized' }),
      register: async () => ({ success: false, error: 'AuthProvider not initialized' }),
      loginAnonymously: async () => ({ success: false, error: 'AuthProvider not initialized' }),
      logout: async () => {},
      resetPassword: async () => ({ success: false, error: 'AuthProvider not initialized' }),
      updateProfile: async () => ({ success: false, error: 'AuthProvider not initialized' }),
      reinitializeAuth: () => {},
    }
  }
  return context
}

export class AuthProviderClass extends React.Component {
  state = {
    user: null,
    session: null,
    loading: true,
  }
  _isMounted = false
  _authSub = null
  _loadingTimeout = null
  _initStart = 0

  async componentDidMount() {
    this._isMounted = true
    this._initStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()

    const safeSetState = (patch) => {
      if (this._isMounted) this.setState(patch)
    }

    // Set a hard timeout for auth loading
    try {
      this._loadingTimeout = setTimeout(() => {
        if (this.state.loading) {
          logWarn('Auth loading exceeded timeout, attempting recovery')
          this.reinitializeAuth()
        }
      }, 10000)
    } catch (timeoutError) {
      // Silently ignore timeout setup errors - non-critical
    }

    // Auth state changes (sync updates + async profile fetch)
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
        safeSetState({ session: sess, loading: false })
        if (sess?.user) {
          safeSetState({ user: sess.user })
          // Defer profile enrichment to next tick
          setTimeout(() => this.safeFetchProfile(sess.user), 0)
        } else {
          safeSetState({ user: null })
        }
      })
      this._authSub = subscription
    } catch (e) {
      logError('Auth onAuthStateChange failed', { message: e.message, stack: e.stack })
    }

    // Initial session with retry
    try {
      const { data: { session } } = await this.withRetry(() => supabase.auth.getSession())
      safeSetState({ session, loading: false })
      if (session?.user) await this.safeFetchProfile(session.user)
      const end = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()
      logInfo('Auth initialization complete', { durationMs: end - this._initStart })
    } catch (e) {
      logError('Auth init failed', { message: e.message, stack: e.stack })
      safeSetState({ loading: false, user: null })
    }
  }

  componentWillUnmount() {
    this._isMounted = false
    try { 
      this._authSub?.unsubscribe() 
    } catch (unsubError) {
      // Ignore unsubscribe errors during cleanup
    }
    try { 
      clearTimeout(this._loadingTimeout) 
    } catch (timeoutError) {
      // Ignore timeout clear errors during cleanup
    }
  }
  fetchUserProfile = async (authUser) => {
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

  safeFetchProfile = async (authUser) => {
    try {
      const full = await this.fetchUserProfile(authUser)
      if (this._isMounted) this.setState({ user: full || authUser })
    } catch (e) {
      console.error('Profile fetch error:', e)
      if (this._isMounted) this.setState({ user: authUser })
    }
  }

  login = async (email, password) => {
    try {
      const { data, error } = await this.withRetry(() => supabase.auth.signInWithPassword({ email, password }))
      if (error) return { success: false, error: error.message }
      return { success: true, user: data.user }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  register = async (userData) => {
    try {
      const currentDomain = window.location.origin
      const { data, error } = await this.withRetry(() => supabase.auth.signUp({
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
      }))
      if (error) return { success: false, error: error.message }
      return { success: true, user: data.user }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  loginAnonymously = async () => {
    try {
      const { data, error } = await this.withRetry(() => supabase.auth.signInAnonymously())
      if (error) return { success: false, error: error.message }
      return { success: true, user: data.user }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  logout = async () => {
    try {
      // Clear role cache on logout
      if (typeof window !== 'undefined' && window.clearRoleCache) {
        window.clearRoleCache()
      }
      
      // Clear network caches
      try {
        const { clearAllCaches } = await import('@/lib/networkOptimization')
        clearAllCaches()
        logInfo('Network caches cleared on logout')
      } catch (e) {
        // If module not loaded yet, that's fine
      }
      
      const { error } = await this.withRetry(() => supabase.auth.signOut())
      if (error) logError('Logout error', { message: error.message })
    } catch (e) {
      logError('Logout error', { message: e.message, stack: e.stack })
    }
  }

  resetPassword = async (email) => {
    try {
      const redirectTo = `${window.location.origin}/login?reset=true`
      const { error } = await this.withRetry(() => supabase.auth.resetPasswordForEmail(email, { redirectTo }))
      if (error) {
        return { success: true, message: "If an account exists with that email, you will receive a reset link." }
      }
      return { success: true, message: "Password reset email sent!" }
    } catch {
      return { success: true, message: "If an account exists with that email, you will receive a reset link." }
    }
  }

  updateProfile = async (profileData) => {
    try {
      const currentUser = this.state.user
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
      if (this._isMounted) this.setState({ user: updatedUser })
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { user: updatedUser, timestamp: Date.now() } }))
      }, 300)
      return { success: true, user: updatedUser }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  // Generic retry helper with exponential backoff
  withRetry = async (fn, opts = {}) => {
    const { retries = 2, delay = 300, factor = 2 } = opts
    let attempt = 0
    let lastErr
    while (attempt <= retries) {
      try {
        return await fn()
      } catch (err) {
        lastErr = err
        if (attempt === retries) break
        await new Promise(res => setTimeout(res, delay * Math.pow(factor, attempt)))
        attempt++
      }
    }
    throw lastErr
  }

  // Reinitialize auth state and listeners safely
  reinitializeAuth = async () => {
    try { 
      this._authSub?.unsubscribe() 
    } catch (unsubError) {
      // Ignore unsubscribe errors during reinitialization
    }
    this.setState({ loading: true })
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
        if (this._isMounted) this.setState({ session: sess, user: sess?.user || null, loading: false })
        if (sess?.user) setTimeout(() => this.safeFetchProfile(sess.user), 0)
      })
      this._authSub = subscription

      const { data: { session } } = await this.withRetry(() => supabase.auth.getSession())
      if (this._isMounted) this.setState({ session, user: session?.user || null, loading: false })
    } catch (e) {
      logError('Auth reinitialization failed', { message: e.message, stack: e.stack })
      if (this._isMounted) this.setState({ loading: false })
    }
  }

  render() {
    const value = {
      user: this.state.user,
      session: this.state.session,
      loading: this.state.loading,
      login: this.login,
      register: this.register,
      loginAnonymously: this.loginAnonymously,
      logout: this.logout,
      resetPassword: this.resetPassword,
      updateProfile: this.updateProfile,
      isAuthenticated: !!this.state.session && !!this.state.user,
      // expose recovery for debug tooling
      reinitializeAuth: this.reinitializeAuth,
    }

    return (
      <AuthContext.Provider value={value}>
        {this.props.children}
      </AuthContext.Provider>
    )
  }
}

export function AuthProvider({ children }) {
  return <AuthProviderClass>{children}</AuthProviderClass>
}
