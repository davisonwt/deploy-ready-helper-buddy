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

export class AuthProviderClass extends React.Component {
  state = {
    user: null,
    session: null,
    loading: true,
  }
  _isMounted = false
  _authSub = null

  async componentDidMount() {
    this._isMounted = true

    const safeSetState = (patch) => {
      if (this._isMounted) this.setState(patch)
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
      console.error('Auth onAuthStateChange failed:', e)
    }

    // Initial session
    try {
      const { data: { session } } = await supabase.auth.getSession()
      safeSetState({ session, loading: false })
      if (session?.user) await this.safeFetchProfile(session.user)
    } catch (e) {
      console.error('Auth init failed:', e)
      safeSetState({ loading: false, user: null })
    }
  }

  componentWillUnmount() {
    this._isMounted = false
    try { this._authSub?.unsubscribe() } catch {}
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { success: false, error: error.message }
      return { success: true, user: data.user }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  register = async (userData) => {
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

  loginAnonymously = async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) return { success: false, error: error.message }
      return { success: true, user: data.user }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) console.error('Logout error:', error)
    } catch (e) {
      console.error('Logout error:', e)
    }
  }

  resetPassword = async (email) => {
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
