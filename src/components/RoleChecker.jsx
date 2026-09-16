import React from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { toast } from 'sonner'

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
      let { data: { session } } = await supabase.auth.getSession()
      // A stored token at or past expiry makes the very first query 401
      // before supabase-js's background refresh has run: refresh first.
      if (session?.expires_at && session.expires_at * 1000 < Date.now() + 30_000) {
        const { data: refreshed } = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } }))
        if (refreshed?.session) session = refreshed.session
      }

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
      let hasAccess = await this.checkAllowedRole(session.user.id, allowedRoles, roles)
      // Found live (2026-09-15, Gosat's Boardroom hotspots): a role query
      // that comes back EMPTY (not an error -- RLS's own "Users can view
      // own roles" policy just returns 0 rows) looks identical to "this
      // user genuinely has no roles," but Davison's account really does
      // have gosat/admin/radio_admin in user_roles -- a client-side
      // SPA navigate() straight into a role-gated route can hit this
      // query before the session held in memory has caught up with a
      // just-refreshed token, same stale-session class the retry above
      // already exists for on a hard error, just never extended to an
      // empty-but-not-erroring result.
      //
      // 2026-09-16: that first fix only retried when `roles` came back
      // COMPLETELY empty, on the reasoning that "some roles, just not the
      // required one" should never be retried or delayed -- but Davison's
      // account genuinely holds THREE roles (admin/gosat/radio_admin), so
      // the same stale-read race can also land a PARTIAL, non-empty set
      // (e.g. only radio_admin) that still fails checkAllowedRole -- and
      // because `roles.length` isn't 0, the old guard never fired, so a
      // real multi-role gosat could still be denied with zero retry.
      // checkAllowedRole's own has_role RPC fallback already re-checks the
      // DB directly (bypassing RLS) before returning false, confirmed live
      // to return true for Davison's account -- so `!hasAccess` here is
      // itself already a fairly deliberate signal, not a hair-trigger.
      // Retrying once on ANY denial (not just an empty roles array) closes
      // this gap; the cost is one extra refresh+query round trip only for
      // routes that already gate on a role, never for ordinary pages.
      if (!hasAccess) {
        await supabase.auth.refreshSession().catch(() => null)
        const retry = await this.fetchRoles(session.user.id)
        if (!retry.error) {
          roles = retry.roles
          hasAccess = await this.checkAllowedRole(session.user.id, allowedRoles, roles)
        }
      }
      // A denied gosat/admin route used to redirect to /cockpit with zero
      // explanation -- from the Boardroom hotspot investigation, that
      // silence is exactly what made a real denial (or the stale-session
      // race above, if it still slips through) indistinguishable from "my
      // click did nothing." Say so, once, before the redirect fires.
      if (!hasAccess) {
        toast.error("You don't have access to this page.")
      }
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
