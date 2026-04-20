/**
 * BecomeSowerPage — /become-a-sower
 * --------------------------------------------------------------
 * Landing page that opens when someone taps the "Become an S2G Sower"
 * CTA on a shared marketing video link (e.g. /become-a-sower?ref=ABC123).
 *
 * The referral code arrives in the URL (?ref=...) and is automatically
 * captured by `useReferralCapture` (already wired globally) — we just
 * need to display a warm welcome and a single, obvious sign-up button.
 */
import { Link, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { ArrowRight, Sparkles, Heart, Users, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentTheme } from "@/utils/dashboardThemes";

export default function BecomeSowerPage() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref")?.trim() || null;
  const theme = getCurrentTheme();

  // Set page title for SEO + WhatsApp/Telegram preview cards
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Become an S2G Sower — sow2grow";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  // Preserve the referral code through the registration flow
  const registerHref = ref ? `/register?ref=${encodeURIComponent(ref)}` : "/register";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: theme.background, color: theme.textPrimary }}
    >
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-2xl rounded-3xl p-8 md:p-12 shadow-2xl text-center backdrop-blur-xl"
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            boxShadow: `0 25px 60px -20px ${theme.shadow}`,
          }}
        >
          {/* Icon halo */}
          <div className="flex justify-center mb-6">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg"
              style={{ background: theme.primaryButton }}
            >
              <Sprout className="w-10 h-10" style={{ color: theme.textPrimary }} />
            </div>
          </div>

          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ background: theme.secondaryButton, color: theme.accent }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            You've been invited
          </span>

          <h1
            className="text-3xl md:text-5xl font-bold mb-4 tracking-tight"
            style={{ color: theme.textPrimary }}
          >
            Become an S2G Sower
          </h1>

          <p
            className="text-base md:text-lg mb-2 max-w-xl mx-auto"
            style={{ color: theme.textSecondary }}
          >
            Plant seeds. Grow community. Reap real-world impact alongside a
            global tribe of sowers, growers and bestowers.
          </p>

          {ref && (
            <p
              className="text-xs md:text-sm mb-8 mt-3 opacity-80"
              style={{ color: theme.textSecondary }}
            >
              Invitation code:{" "}
              <span
                className="font-mono font-bold tracking-widest px-2 py-0.5 rounded"
                style={{ background: theme.secondaryButton, color: theme.accent }}
              >
                {ref}
              </span>
            </p>
          )}

          {!ref && <div className="mb-8" />}

          {/* Primary CTA */}
          <Link to={registerHref} className="inline-block w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 py-6 text-base md:text-lg font-bold rounded-2xl shadow-xl hover:scale-[1.02] transition-transform"
              style={{ background: theme.primaryButton, color: theme.textPrimary }}
            >
              Register as a Sower
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>

          <p
            className="text-xs mt-4 opacity-70"
            style={{ color: theme.textSecondary }}
          >
            Free to join · No credit card needed · 60-second sign-up
          </p>

          {/* Three quick value props */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 pt-8 border-t" style={{ borderColor: theme.cardBorder }}>
            <ValueProp
              theme={theme}
              icon={<Sprout className="w-5 h-5" />}
              title="Sow"
              body="List your seeds, services & gifts"
            />
            <ValueProp
              theme={theme}
              icon={<Users className="w-5 h-5" />}
              title="Grow"
              body="Build your tribe & community"
            />
            <ValueProp
              theme={theme}
              icon={<Heart className="w-5 h-5" />}
              title="Bestow"
              body="Receive blessings & give freely"
            />
          </div>

          <p className="text-[11px] mt-8 opacity-60" style={{ color: theme.textSecondary }}>
            Already a sower?{" "}
            <Link to="/login" className="underline font-semibold" style={{ color: theme.accent }}>
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function ValueProp({
  theme,
  icon,
  title,
  body,
}: {
  theme: any;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center">
      <div
        className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center"
        style={{ background: theme.secondaryButton, color: theme.accent }}
      >
        {icon}
      </div>
      <div className="font-bold text-sm" style={{ color: theme.textPrimary }}>
        {title}
      </div>
      <div className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>
        {body}
      </div>
    </div>
  );
}
