import React from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { LoadingSpinner } from '@/components/LoadingSpinner'

/**
 * Pure class component for role checking - avoids hooks entirely
 * to prevent "dispatcher is null" errors during flushSync navigation
 */
class RoleChecker extends React.Component {
  state = {
    loading: true,
    isAuthenticated: false,
    hasAccess: false,
    userRoles: [],
    user: null,
    checkError: null
  }
  
  _isMounted = false

  async componentDidMount() {
    this._isMounted = true
    await this.check()
  }

  // 2026-09-06: a failed role query (expired access token before the
  // client refreshed it, a dropped request, an old bundle) used to look
  // exactly like "no role" and bounced the gosat to /dashboard with no
  // message, while a fresh direct URL load worked. Now a query FAILURE
  // retries once after refreshing the session and then shows an error
  // with a retry; only a successful query that finds no role redirects.
  check = async () => {
    if (this._isMounted) this.setState({ loading: true, checkError: null })
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        if (this._isMounted) this.setState({ loading: false, isAuthenticated: false })
        return
      }
      const { allowedRoles = [] } = this.props
      let { roles, error } = await this.fetchRoles(session.user.id)
      if (error) {
        console.warn('RoleChecker: role query failed, refreshing the session and retrying once', error)
        await supabase.auth.refreshSession().catch(() => null)
        ;({ roles, error } = await this.fetchRoles(session.user.id))
      }
      if (error) {
        if (this._isMounted) {
          this.setState({ loading: false, isAuthenticated: true, user: session.user, hasAccess: false, userRoles: [], checkError: error })
        }
        return
      }
      const hasAccess = await this.checkAllowedRole(session.user.id, allowedRoles, roles)
      if (this._isMounted) {
        this.setState({ loading: false, isAuthenticated: true, user: session.user, hasAccess, userRoles: roles, checkError: null })
      }
    } catch (err) {
      console.error('RoleChecker auth error:', err)
      if (this._isMounted) {
        this.setState({ loading: false, isAuthenticated: true, hasAccess: false, checkError: err?.message || String(err) })
      }
    }
  }

  componentWillUnmount() {
    this._isMounted = false
  }

  /** Resolves to { roles, error }: a failed query is NOT an empty role list. */
  fetchRoles = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
      if (error) return { roles: [], error: error.message || String(error) }
      return { roles: (data || []).map(r => String(r.role).toLowerCase()), error: null }
    } catch (err) {
      console.error('Failed to fetch roles:', err)
      return { roles: [], error: err?.message || String(err) }
    }
  }

  checkAllowedRole = async (userId, allowedRoles, roles) => {
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return true

    const normalizedAllowedRoles = allowedRoles.map((role) => String(role).toLowerCase())
    if (normalizedAllowedRoles.some((role) => roles.includes(role))) return true

    try {
      const checks = await Promise.all(
        normalizedAllowedRoles.map((role) =>
          supabase.rpc('has_role', { _user_id: userId, _role: role })
        )
      )

      return checks.some(({ data, error }) => !error && data === true)
    } catch (err) {
      console.error('Failed to verify allowed role:', err)
      return false
    }
  }

  render() {
    const { loading, isAuthenticated, hasAccess, checkError } = this.state
    const { children } = this.props

    if (loading) {
      return <LoadingSpinner full text="Loading permissions..." />
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }

    if (checkError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" data-testid="role-check-error">
          <div className="max-w-md w-full rounded-lg border bg-card p-6 space-y-3 text-sm">
            <h2 className="text-lg font-semibold">Couldn't confirm your role</h2>
            <p className="text-muted-foreground">Your access was not denied; the check itself failed. {checkError}</p>
            <div className="flex gap-2">
              <button type="button" className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 font-medium" onClick={this.check}>Try again</button>
              <Link to="/dashboard" className="rounded-md border px-3 py-1.5">Back to dashboard</Link>
            </div>
          </div>
        </div>
      )
    }

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
  }
}

export default RoleChecker
