import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentTheme } from "@/utils/dashboardThemes";

/**
 * An invite that 404s must still be an invite.
 *
 * useReferralCapture() is mounted above <AppRoutes /> in App.tsx, so it
 * already writes ?ref= into s2g_pending_ref even on an unmatched route --
 * confirmed live 2026-09-22 on /wandering/pillow?ref=8A2E07FD, which
 * captured the code and then offered the visitor nothing but "Return to
 * Home". The code was a real, active one belonging to a real member, so
 * every person who followed that link was a referral this page dropped on
 * the floor.
 *
 * Reads the URL first and localStorage second: the URL is the truth for
 * this visit, and the stored value covers a visitor who arrived on an
 * invite earlier in the session and has since wandered into a dead link.
 */
function usePendingRef(): string | null {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    try {
      const fromUrl = new URL(window.location.href).searchParams.get("ref");
      if (fromUrl) { setCode(fromUrl.trim().toUpperCase()); return; }
      const stored = localStorage.getItem("s2g_pending_ref");
      if (stored) setCode(stored.trim().toUpperCase());
    } catch {
      // storage disabled, or an unparseable URL -- no CTA rather than a crash
    }
  }, []);
  return code;
}

const NotFound = () => {
  const location = useLocation();
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme());
  const pendingRef = usePendingRef();

  // Update theme every 2 hours
  useEffect(() => {
    const themeInterval = setInterval(() => {
      setCurrentTheme(getCurrentTheme());
    }, 2 * 60 * 60 * 1000); // 2 hours
    return () => clearInterval(themeInterval);
  }, []);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ background: currentTheme.background }}
    >
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4" style={{ color: currentTheme.textPrimary }}>404</h1>
        <p className="text-xl mb-4" style={{ color: currentTheme.textSecondary }}>Oops! Page not found</p>

        {/* Carried an invitation in: say so, and give them the way in. The
            ref rides along to /register, where the existing claim path
            binds them to whoever invited them. */}
        {pendingRef && (
          <div className="mb-6">
            <p className="text-sm mb-3" style={{ color: currentTheme.textSecondary }}>
              You followed an invitation to Sow2Grow. That page has moved, but your invitation still works.
            </p>
            <Link
              to={`/register?ref=${encodeURIComponent(pendingRef)}`}
              className="inline-block rounded-full px-5 py-2.5 font-semibold"
              style={{ background: currentTheme.accent, color: currentTheme.background }}
            >
              Join Sow2Grow
            </Link>
          </div>
        )}

        <Link 
          to="/" 
          className="underline"
          style={{ color: currentTheme.accent }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = currentTheme.accentLight;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = currentTheme.accent;
          }}
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
