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
import { ArrowLeft, Download, Loader2, CheckCircle2, AlertCircle, Sparkles, Play, X, Share2, Copy, Mail, MessageCircle, Send, Facebook, Twitter, Sprout } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  /** CTA pill label burned onto the top-right of the personalized video. */
  ctaLabel: string;
  /** Landing path the CTA pill (and shared link) points the recipient to. */
  ctaPath: string;
}

const BANNERS: BannerVideo[] = [
  // — Onboarding (sticky first) —
  { id: "onboarding-sower",           title: "Become a Sower in 60 Seconds", subtitle: "Step-by-step onboarding walkthrough", emoji: "🌱", src: "/videos/onboarding-sower-v2.mp4?v=logo-fix-10",        available: true, ctaLabel: "Become a Sower & Bestower",      ctaPath: "/become-a-sower" },

  // — Become a Provider —
  { id: "wandering-wheel",            title: "Wandering Wheel",            subtitle: "Become a community driver",        emoji: "🚐", src: "/videos/banners/wandering-wheel.mp4",            available: true, ctaLabel: "Become a Wandering Wheel",       ctaPath: "/become-a-sower" },
  { id: "wandering-hand",             title: "Wandering Hand",             subtitle: "Offer hands-on tribal services",   emoji: "🛠️", src: "/videos/banners/wandering-hand-become.mp4",      available: true, ctaLabel: "Become a Wandering Hand",        ctaPath: "/become-a-sower" },
  { id: "wandering-whisperer",        title: "Wandering Whisperer",        subtitle: "Guide & sell for sowers",          emoji: "🎙️", src: "/videos/banners/wandering-whisperer.mp4",        available: true, ctaLabel: "Become a Wandering Whisperer",   ctaPath: "/become-a-sower" },
  { id: "wandering-pillow",           title: "Wandering Pillow",           subtitle: "Host travelers · holiday stays",   emoji: "🛏️", src: "/videos/banners/wandering-pillow.mp4",           available: true, ctaLabel: "Become a Wandering Pillow",      ctaPath: "/become-a-sower" },
  { id: "wandering-field",            title: "Wandering Field",            subtitle: "Grow & sell from your field",      emoji: "🌾", src: "/videos/banners/wandering-field.mp4",            available: true, ctaLabel: "Become a Wandering Field",       ctaPath: "/become-a-sower" },
  { id: "wandering-hearth",           title: "Wandering Hearth",           subtitle: "Sell handmade goods",              emoji: "🏡", src: "/videos/banners/wandering-hearth.mp4",           available: true, ctaLabel: "Become a Wandering Hearth",      ctaPath: "/become-a-sower" },
  { id: "wandering-forge",            title: "Wandering Forge",            subtitle: "Manufacture for the tribe",        emoji: "🏭", src: "/videos/banners/wandering-forge.mp4",            available: true, ctaLabel: "Become a Wandering Forge",       ctaPath: "/become-a-sower" },

  // — Book a Service —
  { id: "wandering-wheel-book",       title: "Book a Wandering Wheel",     subtitle: "Book a community driver",          emoji: "🚖", src: "/videos/banners/wandering-wheel-book.mp4",       available: true, ctaLabel: "Book a Wandering Wheel",         ctaPath: "/become-a-sower" },
  { id: "wandering-hand-book",        title: "Book a Wandering Hand",      subtitle: "Hire a tribal service provider",   emoji: "🧰", src: "/videos/banners/wandering-hand-book.mp4",        available: true, ctaLabel: "Book a Wandering Hand",          ctaPath: "/become-a-sower" },
  { id: "wandering-whisperer-book",   title: "Book a Wandering Whisperer", subtitle: "Hire a guide & sales whisperer",   emoji: "🗣️", src: "/videos/banners/wandering-whisperer-book.mp4",   available: true, ctaLabel: "Book a Wandering Whisperer",     ctaPath: "/become-a-sower" },
  { id: "wandering-pillow-book",      title: "Book a Wandering Pillow",    subtitle: "Find a stay with the tribe",       emoji: "🏨", src: "/videos/banners/wandering-pillow-book.mp4",      available: true, ctaLabel: "Book a Wandering Pillow",        ctaPath: "/become-a-sower" },
  { id: "wandering-field-book",       title: "Connect with Wandering Field", subtitle: "Order fresh produce from farmers", emoji: "🥬", src: "/videos/banners/wandering-field-book.mp4",       available: true, ctaLabel: "Order from Wandering Field",     ctaPath: "/become-a-sower" },
  { id: "wandering-hearth-book",      title: "Connect with Wandering Hearth", subtitle: "Order from homesteaders",       emoji: "🍞", src: "/videos/banners/wandering-hearth-book.mp4",      available: true, ctaLabel: "Order from Wandering Hearth",    ctaPath: "/become-a-sower" },
  { id: "wandering-forge-book",       title: "Connect with Wandering Forge", subtitle: "Order from tribal factories",    emoji: "📦", src: "/videos/banners/wandering-forge-book.mp4",       available: true, ctaLabel: "Order from Wandering Forge",     ctaPath: "/become-a-sower" },

  // — Plant & Sow —
  { id: "community-orchard",          title: "Community Orchard",          subtitle: "Open a community-funded orchard",  emoji: "🌳", src: "/videos/banners/community-orchard.mp4",          available: true, ctaLabel: "Open a Community Orchard",       ctaPath: "/become-a-sower" },
  { id: "production-orchard",         title: "Production Orchard",         subtitle: "Fund a product into existence",    emoji: "🏗️", src: "/videos/banners/production-orchard.mp4",         available: true, ctaLabel: "Fund a Production Orchard",      ctaPath: "/become-a-sower" },
  { id: "single-seed",                title: "Single Seed",                subtitle: "Sow one offering today",           emoji: "🌱", src: "/videos/banners/single-seed.mp4",                available: true, ctaLabel: "Sow a Single Seed",              ctaPath: "/become-a-sower" },

  // — Live & Learn —
  { id: "classroom",                  title: "Classroom",                  subtitle: "Teach live · voice + video",       emoji: "🎓", src: "/videos/banners/classroom.mp4",                  available: true, ctaLabel: "Join the Classroom",             ctaPath: "/become-a-sower" },
  { id: "skilldrop",                  title: "SkillDrop",                  subtitle: "Drop a live skill session",        emoji: "✨", src: "/videos/banners/skilldrop.mp4",                  available: true, ctaLabel: "Drop a SkillDrop",               ctaPath: "/become-a-sower" },
  { id: "training",                   title: "Training",                   subtitle: "Run a live training session",      emoji: "🏋️", src: "/videos/banners/training.mp4",                   available: true, ctaLabel: "Join the Training",              ctaPath: "/become-a-sower" },
  { id: "radio",                      title: "364YHVH FM Radio",           subtitle: "Tune in to the tribal station",    emoji: "📻", src: "/videos/banners/radio.mp4",                      available: true, ctaLabel: "Tune in to 364YHVH FM",          ctaPath: "/become-a-sower" },

  // — Chat & Connect —
  { id: "one-on-one",                 title: "1-on-1 Chat",                subtitle: "Start a private chat",             emoji: "💬", src: "/videos/banners/one-on-one.mp4",                 available: true, ctaLabel: "Start a 1-on-1 Chat",            ctaPath: "/become-a-sower" },
  { id: "group-chat",                 title: "Group Chat",                 subtitle: "Start a tribal group chat",        emoji: "👥", src: "/videos/banners/group-chat.mp4",                 available: true, ctaLabel: "Start a Group Chat",             ctaPath: "/become-a-sower" },

  // — Tribal Hearts —
  { id: "tribal-hearts",              title: "Tribal Hearts",              subtitle: "Safe agent-powered tribal dating", emoji: "❤️", src: "/videos/tribal-hearts-trailer-v7.mp4?v=logo-fix-10", available: true, ctaLabel: "Become a Tribal Heart",          ctaPath: "/become-a-sower" },
];

const SHARE_VIDEO_BUCKET = "chat-files";

export default function MarketingVideosPage() {
  const theme = getCurrentTheme();
  const { code, inviterName, shareUrl, loading: refLoading } = useMyReferralCode();
  const { burnAndDownload, burnToFile, progress, stage, error, reset } = useReferralVideoBurner();
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
      ctaLabel: banner.ctaLabel,
    });
  };

  // Per-video CTA link — opens the matching landing page with the inviter's
  // referral code pre-attached so attribution sticks.
  const ctaUrlFor = (banner: BannerVideo) =>
    code
      ? `https://sow2growapp.com${banner.ctaPath}?ref=${encodeURIComponent(code)}`
      : `https://sow2growapp.com${banner.ctaPath}`;

  const buildShareText = (banner: BannerVideo) => {
    const url = ctaUrlFor(banner);
    return `${banner.emoji} ${banner.title} — ${banner.subtitle}\n\nJoin my S2G tribe${inviterName ? ` (${inviterName})` : ""} — ${banner.ctaLabel}:\n👉 ${url}`;
  };

  const downloadBurnedFile = (file: File) => {
    const dl = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = dl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(dl), 60_000);
  };

  const uploadBurnedVideo = async (banner: BannerVideo, file: File) => {
    const { data: authData } = await supabase.auth.getUser();
    const ext = file.name.split(".").pop() || (file.type.includes("webm") ? "webm" : "mp4");
    const shareId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ownerId = authData.user?.id || "shared";
    const path = `marketing-shares/${ownerId}/${banner.id}-${shareId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(SHARE_VIDEO_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "video/mp4",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from(SHARE_VIDEO_BUCKET).getPublicUrl(path);
    if (publicUrlData?.publicUrl) {
      return publicUrlData.publicUrl;
    }

    const { data: signedUrlData, error: signError } = await supabase.storage
      .from(SHARE_VIDEO_BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    if (signError || !signedUrlData?.signedUrl) {
      throw signError || new Error("Could not create share link for the video.");
    }

    return signedUrlData.signedUrl;
  };

  const prepareShareVideo = async (banner: BannerVideo) => {
    if (!code) {
      toast.error("Loading your referral code… try again in a moment.");
      return null;
    }

    setActiveId(banner.id);
    reset();

    const file = await burnToFile({
      sourceUrl: banner.src,
      fileBaseName: `s2g-${banner.id}`,
      inviterName,
      referralCode: code,
      shareUrl,
      ctaLabel: banner.ctaLabel,
    });

    if (!file) return null;

    const hostedUrl = await uploadBurnedVideo(banner, file);
    return { file, hostedUrl };
  };

  const handleWhatsAppShare = async (banner: BannerVideo) => {
    try {
      toast.info("Preparing WhatsApp video… ~30–60s");
      const prepared = await prepareShareVideo(banner);
      if (!prepared) return;

      const message = `${buildShareText(banner)}\n\n🎬 Video:\n${prepared.hostedUrl}`;
      window.location.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      toast.success("WhatsApp share is ready.");
    } catch (e) {
      console.error("[marketing-videos] whatsapp share failed", e);
      toast.error("Couldn't prepare the WhatsApp video link. The file was downloaded instead.");
      const fallback = await burnToFile({
        sourceUrl: banner.src,
        fileBaseName: `s2g-${banner.id}`,
        inviterName,
        referralCode: code || "S2G",
        shareUrl,
        ctaLabel: banner.ctaLabel,
      });
      if (fallback) downloadBurnedFile(fallback);
    }
  };

  /** Share the personalized video file itself (with CTA + referral burned in)
   *  via the device share sheet. Falls back to download + copy if the
   *  Web Share API can't take files. */
  const handleNativeShare = async (banner: BannerVideo) => {
    if (!code) {
      toast.error("Loading your referral code… try again in a moment.");
      return;
    }
    const text = buildShareText(banner);
    const url = ctaUrlFor(banner);

    toast.info("Personalising video for sharing… ~30–60s");

    let prepared: Awaited<ReturnType<typeof prepareShareVideo>> = null;
    try {
      prepared = await prepareShareVideo(banner);
    } catch (e) {
      console.error("[marketing-videos] device share preparation failed", e);
    }
    const file = prepared?.file ?? null;
    const hostedUrl = prepared?.hostedUrl ?? url;

    const nav = navigator as any;
    if (file && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ title: `S2G · ${banner.title}`, text, url, files: [file] });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        // user cancelled — fall through
      }
    }

    if (nav.share) {
      try {
        await nav.share({ title: `S2G · ${banner.title}`, text, url: hostedUrl });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }

    // Fallback: download the personalized file so the user can attach it
    if (file) {
      downloadBurnedFile(file);
      toast.success("Video saved! Attach it to your message.");
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const openExternalShare = (url: string) => {
    // Use a temporary anchor + click instead of window.open to avoid
    // Cross-Origin-Opener-Policy (COOP) mismatches that Firefox throws
    // when popping up sites like WhatsApp Web from a COOP-protected page.
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyShareLink = async (banner: BannerVideo) => {
    try {
      await navigator.clipboard.writeText(ctaUrlFor(banner));
      toast.success("Invite link copied!");
    } catch {
      toast.error("Couldn't copy link");
    }
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
          First download sets up the in-browser video engine (~25 MB, one-time). After that, each personalization takes ~30–90 seconds and exports as universal MP4 (plays on any phone or PC).
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
                    <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold z-10" style={{ background: theme.secondaryButton, color: theme.textPrimary }}>
                      Coming soon
                    </span>
                  )}

                  {/* Top-right corner CTA — recipient-facing on shared videos.
                      Tapping it opens our /become-a-sower landing page with
                      the inviter's referral code pre-attached. */}
                  {b.available && (
                    <a
                      href={ctaUrlFor(b)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-md hover:scale-105 transition-transform"
                      style={{
                        background: theme.primaryButton,
                        color: theme.textPrimary,
                        boxShadow: `0 4px 12px ${theme.shadow}`,
                      }}
                      aria-label={b.ctaLabel}
                    >
                      <Sprout className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      {b.id === "onboarding-sower" ? (
                        <span>S2G On-boarding</span>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Become an S2G Sower</span>
                          <span className="sm:hidden">Become a Sower</span>
                        </>
                      )}
                    </a>
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

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPreviewing(b)}
                      disabled={!b.available}
                      className="w-full font-semibold"
                      style={{ borderColor: theme.cardBorder, color: theme.textPrimary, background: "transparent" }}
                    >
                      <Play className="w-4 h-4 mr-1.5" fill="currentColor" /> Watch
                    </Button>
                    <Button
                      onClick={() => handleDownload(b)}
                      disabled={!b.available || !code || busy}
                      className="w-full font-semibold"
                      style={{ background: theme.primaryButton, color: theme.textPrimary }}
                    >
                      {busy ? (
                        <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> …</>
                      ) : (
                        <><Download className="w-4 h-4 mr-1.5" /> Get</>
                      )}
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          disabled={!b.available}
                          className="w-full font-semibold !text-white !border-0"
                          style={{ backgroundImage: "linear-gradient(135deg, #059669, #10b981)", backgroundColor: "transparent" }}
                        >
                          <Share2 className="w-4 h-4 mr-1.5" /> Share
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-64 p-2"
                        style={{ background: theme.cardBg, borderColor: theme.cardBorder, color: theme.textPrimary }}
                      >
                        <div className="space-y-1">
                          <p className="text-[11px] px-2 pt-1 pb-2 opacity-70" style={{ color: theme.textSecondary }}>
                            Share <strong>{b.title}</strong> + your tribe link
                          </p>
                          <button
                            type="button"
                            onClick={() => handleNativeShare(b)}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-white/10 transition-colors"
                          >
                            <Share2 className="w-4 h-4" /> Device share sheet
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWhatsAppShare(b)}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-white/10 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" style={{ color: "#25D366" }} /> WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => openExternalShare(`https://t.me/share/url?url=${encodeURIComponent(ctaUrlFor(b))}&text=${encodeURIComponent(buildShareText(b))}`)}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-white/10 transition-colors"
                          >
                            <Send className="w-4 h-4" style={{ color: "#0088cc" }} /> Telegram
                          </button>
                          <button
                            type="button"
                            onClick={() => openExternalShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareText(b))}`)}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-white/10 transition-colors"
                          >
                            <Twitter className="w-4 h-4" style={{ color: "#1DA1F2" }} /> X / Twitter
                          </button>
                          <button
                            type="button"
                            onClick={() => openExternalShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ctaUrlFor(b))}&quote=${encodeURIComponent(buildShareText(b))}`)}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-white/10 transition-colors"
                          >
                            <Facebook className="w-4 h-4" style={{ color: "#1877F2" }} /> Facebook
                          </button>
                          <button
                            type="button"
                            onClick={() => openExternalShare(`mailto:?subject=${encodeURIComponent(`S2G · ${b.title}`)}&body=${encodeURIComponent(buildShareText(b))}`)}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-white/10 transition-colors"
                          >
                            <Mail className="w-4 h-4" /> Email
                          </button>
                          <button
                            type="button"
                            onClick={() => copyShareLink(b)}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-white/10 transition-colors"
                          >
                            <Copy className="w-4 h-4" /> Copy invite link
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
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
            <div className="relative bg-black">
              <video
                src={previewing.src}
                className="w-full h-auto bg-black"
                controls
                autoPlay
                playsInline
              />
            </div>
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
