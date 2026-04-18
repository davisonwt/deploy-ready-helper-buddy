/**
 * MarketingVideosPage
 * --------------------------------------------------------------
 * Tribe-member library of S2G banner videos. Each tile lets a member
 * download a personalized version of the video with their referral
 * banner burned across the bottom — perfect for sharing on WhatsApp,
 * Telegram, X, Instagram, etc. Wherever the file travels, the inviter
 * stays attached.
 */
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Loader2, CheckCircle2, AlertCircle, Sparkles, Play, X } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useReferralVideoBurner } from "@/hooks/useReferralVideoBurner";
import { useMyReferralCode } from "@/hooks/useMyReferralCode";
import { getCurrentTheme } from "@/utils/dashboardThemes";

interface BannerVideo {
  id: string;
  title: string;
  subtitle: string;
  src: string;     // public path
  emoji: string;
  available: boolean;
}

const BANNERS: BannerVideo[] = [
  { id: "wandering-wheel",     title: "Wandering Wheel",     subtitle: "Become a community driver",       emoji: "🚐", src: "/videos/banners/wandering-wheel.mp4",     available: true },
  { id: "wandering-hand",      title: "Wandering Hand",      subtitle: "Offer hands-on tribal services",  emoji: "🛠️", src: "/videos/banners/wandering-hand.mp4",      available: true },
  { id: "wandering-whisperer", title: "Wandering Whisperer", subtitle: "Guide & sell for sowers",         emoji: "🎙️", src: "/videos/banners/wandering-whisperer.mp4", available: true },
  { id: "wandering-pillow",    title: "Wandering Pillow",    subtitle: "Host travelers · holiday stays",  emoji: "🛏️", src: "/videos/banners/wandering-pillow.mp4",    available: true },
  { id: "wandering-field",     title: "Wandering Field",     subtitle: "Grow & sell from your field",     emoji: "🌾", src: "/videos/banners/wandering-field.mp4",     available: true },
  { id: "wandering-hearth",    title: "Wandering Hearth",    subtitle: "Sell handmade goods",             emoji: "🏡", src: "/videos/banners/wandering-hearth.mp4",    available: true },
  { id: "wandering-forge",     title: "Wandering Forge",     subtitle: "Manufacture for the tribe",       emoji: "🏭", src: "/videos/banners/wandering-forge.mp4",     available: true },
  { id: "community-orchard",   title: "Community Orchard",   subtitle: "Open a community-funded orchard", emoji: "🌳", src: "/videos/banners/community-orchard.mp4",   available: true },
  { id: "production-orchard",  title: "Production Orchard",  subtitle: "Fund a product into existence",   emoji: "🏗️", src: "/videos/banners/production-orchard.mp4",  available: false },
  { id: "single-seed",         title: "Single Seed",         subtitle: "Sow one offering today",          emoji: "🌱", src: "/videos/banners/single-seed.mp4",         available: false },
];

export default function MarketingVideosPage() {
  const theme = getCurrentTheme();
  const { code, inviterName, shareUrl, loading: refLoading } = useMyReferralCode();
  const { burnAndDownload, progress, stage, error, reset } = useReferralVideoBurner();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<BannerVideo | null>(null);

  const handleDownload = async (banner: BannerVideo) => {
    if (!code) return;
    setActiveId(banner.id);
    reset();
    await burnAndDownload({
      sourceUrl: banner.src,
      fileBaseName: `s2g-${banner.id}`,
      inviterName,
      referralCode: code,
      shareUrl,
    });
  };

  return (
    <div className="min-h-screen pb-16" style={{ background: theme.background }}>
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium mb-6 hover:opacity-80" style={{ color: theme.textPrimary }}>
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Hero */}
        <div className="rounded-3xl p-6 md:p-8 mb-6 shadow-xl" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: theme.primaryButton }}>
              <Sparkles className="w-7 h-7" style={{ color: theme.textPrimary }} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: theme.textPrimary }}>
                Tribal Marketing Videos
              </h1>
              <p className="text-sm md:text-base mb-4" style={{ color: theme.textSecondary }}>
                Download any video below. We'll burn your invitation strip onto the bottom so every share grows <strong>your</strong> tribe.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                <span className="px-3 py-1.5 rounded-full font-mono font-bold tracking-widest" style={{ background: theme.secondaryButton, color: theme.accent }}>
                  {refLoading ? "Loading code…" : code || "—"}
                </span>
                <span style={{ color: theme.textSecondary }}>→</span>
                <span style={{ color: theme.textPrimary }}>{shareUrl}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Note about first-render */}
        <p className="text-xs mb-4 text-center opacity-75" style={{ color: theme.textSecondary }}>
          First download sets up the in-browser video engine (~25 MB, one-time). After that, each personalization takes ~30–60 seconds.
        </p>

        {/* Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BANNERS.map((b) => {
            const isActive = activeId === b.id;
            const busy = isActive && (stage === "loading" || stage === "burning");
            const done = isActive && stage === "done";
            const failed = isActive && stage === "error";
            return (
              <Card key={b.id} className="overflow-hidden" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <div className="relative aspect-video bg-black/40 group">
                  {b.available ? (
                    <>
                      <video
                        src={b.src}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                        onMouseLeave={(e) => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewing(b)}
                        aria-label={`Play ${b.title}`}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      >
                        <span className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl" style={{ background: theme.primaryButton }}>
                          <Play className="w-7 h-7 ml-1" fill="currentColor" style={{ color: theme.textPrimary }} />
                        </span>
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl opacity-60">{b.emoji}</div>
                  )}
                  {!b.available && (
                    <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold" style={{ background: theme.secondaryButton, color: theme.textPrimary }}>
                      Coming soon
                    </span>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{b.emoji}</span>
                      <h3 className="font-bold text-base" style={{ color: theme.textPrimary }}>{b.title}</h3>
                    </div>
                    <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>{b.subtitle}</p>
                  </div>

                  {busy && (
                    <div className="space-y-1.5">
                      <Progress value={progress} className="h-2" />
                      <p className="text-[11px]" style={{ color: theme.textSecondary }}>
                        {stage === "loading" ? "Loading engine…" : `Burning your code — ${progress}%`}
                      </p>
                    </div>
                  )}
                  {done && (
                    <p className="text-xs flex items-center gap-1.5 font-medium" style={{ color: "#22c55e" }}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved to your downloads
                    </p>
                  )}
                  {failed && (
                    <p className="text-xs flex items-center gap-1.5 font-medium" style={{ color: "#ef4444" }}>
                      <AlertCircle className="w-3.5 h-3.5" /> {error || "Something went wrong"}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPreviewing(b)}
                      disabled={!b.available}
                      className="w-full font-semibold"
                      style={{ borderColor: theme.cardBorder, color: theme.textPrimary, background: "transparent" }}
                    >
                      <Play className="w-4 h-4 mr-2" fill="currentColor" /> Watch
                    </Button>
                    <Button
                      onClick={() => handleDownload(b)}
                      disabled={!b.available || !code || busy}
                      className="w-full font-semibold"
                      style={{ background: theme.primaryButton, color: theme.textPrimary }}
                    >
                      {busy ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Personalizing…</>
                      ) : (
                        <><Download className="w-4 h-4 mr-2" /> Download</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Fullscreen video preview */}
      {previewing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setPreviewing(null)}
        >
          <button
            type="button"
            aria-label="Close preview"
            onClick={() => setPreviewing(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={previewing.src}
              className="w-full h-auto bg-black"
              controls
              autoPlay
              playsInline
            />
            <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ background: theme.cardBg }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{previewing.emoji}</span>
                  <h3 className="font-bold text-base truncate" style={{ color: theme.textPrimary }}>{previewing.title}</h3>
                </div>
                <p className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>{previewing.subtitle}</p>
              </div>
              <Button
                onClick={() => { const b = previewing; setPreviewing(null); handleDownload(b); }}
                disabled={!code}
                className="font-semibold shrink-0"
                style={{ background: theme.primaryButton, color: theme.textPrimary }}
              >
                <Download className="w-4 h-4 mr-2" /> Download with my code
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
