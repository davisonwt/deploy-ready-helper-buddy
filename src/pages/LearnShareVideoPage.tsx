import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sprout, LogIn } from 'lucide-react';
import { findLearnVideo } from '@/data/learnShareVideos';

/**
 * Public landing page for a single Learn & Share video, e.g.
 * /learn-share/24?ref=S2G-XXXXXXX — this is the link the Share button on
 * /learn-share now generates. No auth guard: anyone with the link sees the
 * video immediately. ?ref= is captured into localStorage automatically by
 * the app-wide useReferralCapture() in App.tsx (same s2g_pending_ref key
 * the registration flow already reads) — nothing extra to do here for that
 * part. The rest of /learn-share (grid, referral code box, Share buttons)
 * stays behind auth, unchanged.
 */
export default function LearnShareVideoPage() {
  const { videoId } = useParams();
  const { user, loading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');

  const video = findLearnVideo(videoId ?? '');

  // Carry the visitor back to this exact video (path + query) after they
  // register or log in, instead of dumping them on the dashboard.
  const returnTarget = `${location.pathname}${location.search}`;
  const registerParams = new URLSearchParams();
  if (ref) registerParams.set('ref', ref);
  registerParams.set('next', returnTarget);
  const loginParams = new URLSearchParams({ next: returnTarget });

  if (!video) {
    return (
      <div className="container max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-muted-foreground">This video link isn't valid anymore.</p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Sow2Grow
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      <Link to="/">
        <Button variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Sow2Grow
        </Button>
      </Link>

      <Card style={{ borderColor: `${video.color}40` }}>
        <CardHeader>
          <CardTitle className="text-2xl">{video.emoji} {video.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{video.desc}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl overflow-hidden bg-black aspect-video">
            {video.url ? (
              <video src={video.url} controls playsInline className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                This video isn't available yet.
              </div>
            )}
          </div>

          {/* State-aware panel — never a join/login prompt for a signed-in member. */}
          {loading ? null : user ? (
            <div className="text-center">
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">
                Back to Dashboard
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border p-5 text-center space-y-3" style={{ borderColor: `${video.color}40`, background: `${video.color}0d` }}>
              <p className="text-sm text-muted-foreground">
                Like what you see? Join Sow2Grow and start sowing, bestowing, and growing your own tribe.
              </p>
              <Link to={{ pathname: '/register', search: `?${registerParams.toString()}` }}>
                <Button className="w-full sm:w-auto" style={{ background: video.color }}>
                  <Sprout className="w-4 h-4 mr-2" />
                  Join the tribe
                </Button>
              </Link>
              <div>
                <Link
                  to={{ pathname: '/login', search: `?${loginParams.toString()}` }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 inline-flex items-center gap-1"
                >
                  <LogIn className="w-3 h-3" />
                  Already a member? Log in
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
