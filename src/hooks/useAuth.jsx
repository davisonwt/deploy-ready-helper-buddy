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
      const meta = authUser.user_metadata || {}
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle()

      if (!profile) {
        const fallbackProfile = {
          user_id: authUser.id,
          email: authUser.email || meta.email || null,
          first_name: meta.first_name || null,
          last_name: meta.last_name || null,
          display_name: meta.display_name || meta.username || meta.first_name || authUser.email?.split('@')[0] || 'Sower',
          avatar_url: meta.avatar_url || meta.picture || null,
          location: meta.location || null,
          phone: meta.phone || null,
          preferred_currency: meta.preferred_currency || meta.currency || 'USD',
          timezone: meta.timezone || null,
          country: meta.country || null,
          updated_at: new Date().toISOString(),
        }

        const { data: created } = await supabase
          .from('profiles')
          .upsert(fallbackProfile, { onConflict: 'user_id' })
          .select('*')
          .maybeSingle()

        profile = created || fallbackProfile
      }

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
    const logAttempt = async (success, error) => {
      try {
        await supabase.from('signup_attempts').insert({
          email: userData.email || null,
          first_name: userData.first_name || null,
          last_name: userData.last_name || null,
          success,
          error_code: error?.code || error?.name || null,
          error_message: error?.message || (typeof error === 'string' ? error : null),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          referral_code: userData.referral_code || null,
        })
      } catch (logErr) {
        console.error('Failed to log signup attempt:', logErr)
      }
    }

    try {
      const currentDomain = window.location.origin
      // Pull pending referral code (URL ?ref= or saved by useReferralCapture)
      let referral_code = userData.referral_code || null
      if (!referral_code) {
        try {
          const u = new URL(window.location.href)
          referral_code = u.searchParams.get('ref') || localStorage.getItem('s2g_pending_ref') || null
          if (referral_code) referral_code = referral_code.trim().toUpperCase()
        } catch {}
      }
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
            username: userData.username || userData.email?.split('@')[0],
            ...(referral_code ? { referral_code } : {})
          }
        }
      }))
      if (error) {
        await logAttempt(false, error)
        return { success: false, error: error.message, code: error.code || error.name }
      }
      // Best-effort: also call claim_referral_code RPC after signup so it sticks even if trigger missed it
      if (referral_code && data?.user?.id) {
        try {
          await supabase.rpc('claim_referral_code', { p_code: referral_code })
          localStorage.removeItem('s2g_pending_ref')
        } catch {}
      }
      await logAttempt(true, null)
      return { success: true, user: data.user }
    } catch (e) {
      await logAttempt(false, e)
      return { success: false, error: e?.message || 'Unknown error', code: e?.code || e?.name }
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

  // Sow2Grow does not use email for password resets.
  // Recovery runs through the signup security questionnaire at /forgot-password.
  resetPassword = async () => ({
    success: true,
    redirectTo: '/forgot-password',
    message: 'Password recovery uses your security questions. Continue on the recovery page.',
  })

  updateProfile = async (profileData) => {
    try {
      const currentUser = this.state.user
      if (!currentUser?.id) return { success: false, error: 'User not authenticated' }

      // Only include fields the caller actually passed. This is an upsert
      // with onConflict, so every key present in the payload overwrites the
      // existing column -- previously every field defaulted to null (or
      // 'USD'/true) when absent, which silently wiped it. That's exactly
      // what happened to several members' avatar_url: any save from a form
      // that only edits e.g. bio/location, without also carrying the
      // existing avatar_url forward, nulled it out from under them.
      const FIELD_KEYS = [
        'first_name', 'last_name', 'display_name', 'avatar_url', 'bio',
        'location', 'preferred_currency', 'timezone', 'country', 'phone',
        'website', 'tiktok_url', 'instagram_url', 'facebook_url',
        'twitter_url', 'youtube_url', 'show_social_media',
      ]
      const validFields = {}
      for (const key of FIELD_KEYS) {
        if (Object.prototype.hasOwnProperty.call(profileData, key)) {
          validFields[key] = profileData[key]
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          { user_id: currentUser.id, ...validFields, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select()
        .single()

      if (error) return { success: false, error: error.message }

      // `data` is the full profiles row, which has its OWN `id` (the row's
      // primary key) distinct from `user_id` (the auth user's id) --
      // spreading it after currentUser let profiles.id silently clobber
      // the auth id in client state. Every later `.eq('user_id', user.id)`
      // check then filtered on the wrong uuid and found nothing -- this is
      // exactly what sent an already-set-up user back through
      // RequireSecuritySetup after any profile save. Pin id/user_id back
      // to the real auth id after the spread, same as fetchUserProfile
      // already does.
      const updatedUser = { ...currentUser, ...data, id: currentUser.id, user_id: currentUser.id }
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
      if (session?.user) await this.safeFetchProfile(session.user)
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
